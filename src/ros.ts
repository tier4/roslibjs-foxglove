import {
  FoxgloveClient,
  Channel,
  Service,
  ServiceCallResponse,
} from "@foxglove/ws-protocol";
import EventEmitter from "eventemitter3";
import { MessageReader, MessageWriter } from "@foxglove/rosmsg2-serialization";
import { parse, parseRos2idl } from "@foxglove/rosmsg";
import WebSocket from "isomorphic-ws";

interface EventTypes {
  connection: () => void;
  close: (event: CloseEvent) => void;
  error: (error: Error) => void;
}

export class Ros {
  #emitter = new EventEmitter<EventTypes>();
  #client?: FoxgloveClient;

  // Channels
  #channelsById = new Map<number, Channel>();
  #channelsByName = new Map<string, Channel>();
  #channelsBySubscriptionId = new Map<number, Channel>();
  #publisherIds = new Map<string, number>();
  #subscriptionIds = new Map<string, number>();

  // Services
  #servicesById = new Map<number, Service>();
  #servicesByName = new Map<string, Service>();
  #serviceCallId = 0;

  // Message Readers / Writers
  #messageReaders = new Map<string, MessageReader>();
  #messageWriters = new Map<string, MessageWriter>();

  #unresolvedSubscriptions = new Set<string>();
  #subscriptionCallbacksSet = new Map<
    string,
    Set<Set<(message: unknown) => void>>
  >();

  constructor(options: { url?: string | undefined }) {
    if (options.url) {
      this.connect(options.url);
    }
  }

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ): this {
    this.#emitter.on(event, fn);
    return this;
  }

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ): this {
    this.#emitter.off(event, fn);
    return this;
  }

  connect(url: string) {
    this.#client = new FoxgloveClient({
      ws: new WebSocket(url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL]),
    });

    this.#client.on("open", () => {
      this.#emitter.emit("connection");
    });

    this.#client.on("close", (event) => {
      this.#emitter.emit("close", event);
    });

    this.#client.on("error", (error) => {
      this.#emitter.emit("error", error);
    });

    this.#client.on("advertise", (channels) => {
      for (const channel of channels) {
        this.#channelsById.set(channel.id, channel);
        this.#channelsByName.set(channel.topic, channel);
      }
      this.#resolveSubscriptions();
    });
    this.#client.on("unadvertise", (channelIds) => {
      for (const channelId of channelIds) {
        const channel = this.#channelsById.get(channelId);
        if (channel) {
          this.#channelsById.delete(channel.id);
          this.#channelsByName.delete(channel.topic);
        }
      }
    });
    this.#client.on("advertiseServices", (services) => {
      for (const service of services) {
        this.#servicesById.set(service.id, service);
        this.#servicesByName.set(service.name, service);
      }
    });
    this.#client.on("unadvertiseServices", (serviceIds) => {
      for (const serviceId of serviceIds) {
        const service = this.#servicesById.get(serviceId);
        if (service) {
          this.#servicesById.delete(service.id);
          this.#servicesByName.delete(service.name);
        }
      }
    });

    // subscribeしたトピックをすべてここで捌く
    this.#client.on("message", (event) => {
      const channel = this.#channelsBySubscriptionId.get(event.subscriptionId);
      if (channel) {
        const readerAndCallback = this.#subscriptionCallbacksSet.get(
          channel.topic
        );
        if (readerAndCallback) {
          const reader = this.#getMessageReader(channel);
          for (const callbacks of readerAndCallback) {
            for (const callback of callbacks) {
              try {
                callback(reader.readMessage(event.data));
              } catch (error) {
                console.error(error);
              }
            }
          }
        }
      }
    });
  }

  close() {
    this.#client?.close();
    this.#client = undefined;
  }

  getTopics(
    callback: (result: { topics: string[]; types: string[] }) => void,
    _failedCallback?: (error: string) => void
  ) {
    callback({
      topics: [...this.#channelsByName.keys()],
      types: [...this.#channelsByName.values()].map((x) => x.schemaName),
    });
  }

  getServices(
    callback: (services: string[]) => void,
    _failedCallback?: (error: string) => void
  ) {
    callback([...this.#servicesByName.keys()]);
  }

  getTopicType(
    topic: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void
  ) {
    const channel = this.#channelsByName.get(topic);
    if (channel) {
      callback(channel.schemaName);
    } else if (failedCallback) {
      failedCallback("Error: getTopicType");
    }
  }

  getServiceType(
    service: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void
  ) {
    const channel = this.#servicesByName.get(service);
    if (channel) {
      callback(channel.type);
    } else if (failedCallback) {
      failedCallback("Error: getServiceType");
    }
  }

  /** @internal */
  _subscribe<T>(name: string, callbacks: Set<(message: T) => void>) {
    if (!this.#subscriptionIds.has(name)) {
      this.#unresolvedSubscriptions.add(name);
    }
    const subscriptionCallbacks =
      this.#subscriptionCallbacksSet.get(name) ??
      (() => {
        const tmp = new Set<Set<(message: unknown) => void>>();
        this.#subscriptionCallbacksSet.set(name, tmp);
        return tmp;
      })();
    subscriptionCallbacks.add(callbacks as Set<(message: unknown) => void>);
    this.#resolveSubscriptions();
  }

  /** @internal */
  _unsubscribe(name: string) {
    if (!this.#client) {
      return;
    }
    const subscriptionId = this.#subscriptionIds.get(name);
    if (subscriptionId) {
      this.#client.unsubscribe(subscriptionId);
      this.#subscriptionCallbacksSet.delete(name);
      this.#channelsBySubscriptionId.delete(subscriptionId);
      this.#subscriptionIds.delete(name);
    }
  }

  /** @internal */
  _callService<Request, Response>(
    name: string,
    request: Request,
    callback: (response: Response) => void,
    failedCallback?: (error: string) => void
  ) {
    if (!this.#client) {
      return;
    }
    const service = this.#servicesByName.get(name);
    if (service) {
      const writer = this.#getMessageWriter(service);
      const reader = this.#getMessageReader(service);
      const callId = this.#serviceCallId++;
      const listener = (event: ServiceCallResponse) => {
        if (event.serviceId === service.id && event.callId === callId) {
          try {
            callback(reader.readMessage(event.data));
          } catch (error) {
            console.error(error);
          }
        }
        this.#client?.off("serviceCallResponse", listener);
      };
      this.#client.on("serviceCallResponse", listener);
      try {
        this.#client.sendServiceCallRequest({
          serviceId: service.id,
          callId,
          encoding: "cdr",
          data: new DataView(writer.writeMessage(request).buffer),
        });
      } catch (error) {
        console.error(error);
      }
    } else {
      if (failedCallback) {
        failedCallback("no service found");
      }
    }
  }

  /** @internal */
  _publish<T>(name: string, message: T) {
    if (!this.#client) {
      return;
    }
    const channel = this.#channelsByName.get(name);
    if (channel) {
      const writer = this.#getMessageWriter(channel);
      const channelId =
        this.#publisherIds.get(channel.topic) ??
        (() => {
          const tmp = this.#client.advertise({
            topic: channel.topic,
            encoding: "cdr",
            schemaName: channel.schemaName,
          });
          this.#publisherIds.set(channel.topic, tmp);
          return tmp;
        })();
      try {
        this.#client.sendMessage(channelId, writer.writeMessage(message));
      } catch (error) {
        console.error(error);
      }
    }
  }

  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _getParameter(name: string, callback: (value: any) => void) {
    const replacedName = name.replace(":", ".");
    this.#client?.on("parameterValues", (event) => {
      if (event.parameters[0]?.name === replacedName) {
        callback(event.parameters[0].value);
      }
    });
    this.#client?.getParameters([replacedName]);
  }

  #getMessageReader(channelOrService: Channel | Service) {
    const name =
      "schemaName" in channelOrService
        ? channelOrService.schemaName
        : channelOrService.type;
    const encoding =
      "schemaEncoding" in channelOrService
        ? channelOrService.schemaEncoding
        : undefined;
    const schema =
      "schema" in channelOrService
        ? channelOrService.schema
        : channelOrService.responseSchema;
    return (
      this.#messageReaders.get(name) ??
      (() => {
        const tmp = new MessageReader(
          encoding === "ros2idl"
            ? parseRos2idl(schema)
            : parse(schema, { ros2: true })
        );
        this.#messageReaders.set(name, tmp);
        return tmp;
      })()
    );
  }

  #getMessageWriter(channelOrService: Channel | Service) {
    const name =
      "schemaName" in channelOrService
        ? channelOrService.schemaName
        : channelOrService.type;
    const encoding =
      "schemaEncoding" in channelOrService
        ? channelOrService.schemaEncoding
        : undefined;
    const schema =
      "schema" in channelOrService
        ? channelOrService.schema
        : channelOrService.requestSchema;
    return (
      this.#messageWriters.get(name) ??
      (() => {
        const tmp = new MessageWriter(
          encoding === "ros2idl"
            ? parseRos2idl(schema)
            : parse(schema, { ros2: true })
        );
        this.#messageWriters.set(name, tmp);
        return tmp;
      })()
    );
  }

  #resolveSubscriptions() {
    if (!this.#client) {
      return;
    }
    for (const name of this.#unresolvedSubscriptions) {
      const channel = this.#channelsByName.get(name);
      if (channel) {
        const subscriptionId = this.#client.subscribe(channel.id);
        this.#channelsBySubscriptionId.set(subscriptionId, channel);
        this.#subscriptionIds.set(name, subscriptionId);
        this.#unresolvedSubscriptions.delete(name);
      }
    }
  }
}
