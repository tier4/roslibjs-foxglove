import {
  FoxgloveClient,
  Channel,
  Service,
  ServiceCallResponse,
  ParameterValues,
} from "@foxglove/ws-protocol";
import EventEmitter from "eventemitter3";
import {
  MessageReader as Ros1MessageReader,
  MessageWriter as Ros1MessageWriter,
} from "@foxglove/rosmsg-serialization";
import {
  MessageReader as Ros2MessageReader,
  MessageWriter as Ros2MessageWriter,
} from "@foxglove/rosmsg2-serialization";
import { parse, parseRos2idl } from "@foxglove/rosmsg";
import WebSocket from "isomorphic-ws";

interface EventTypes {
  connection: () => void;
  close: (event: CloseEvent) => void;
  error: (error: Error) => void;
}

enum RosVersion {
  Ros1,
  Ros2,
}

export class Ros {
  #emitter = new EventEmitter<EventTypes>();
  #client?: FoxgloveClient;
  #version: RosVersion = RosVersion.Ros2;

  // Message Readers / Writers
  #messageReaders = new Map<string, Ros1MessageReader | Ros2MessageReader>();
  #messageWriters = new Map<string, Ros1MessageWriter | Ros2MessageWriter>();

  // Channels
  #channelsById = new Map<number, Channel>();
  #channelsByName = new Map<string, Channel>();
  #channelsBySubscriptionId = new Map<number, Channel>();
  #publisherIds = new Map<string, number>();
  #subscriptionIds = new Map<string, number>();

  // Services
  #servicesById = new Map<number, Service>();
  #servicesByName = new Map<string, Service>();

  #unresolvedSubscriptions = new Set<string>();
  #subscriptionCallbacksSet = new Map<
    string,
    Set<Set<(message: unknown) => void>>
  >();

  static #callId = 0;
  static #paramId = 0;

  constructor(options: { url?: string }) {
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

    // 接続してROSバージョン判別する処理
    const open = new Promise<void>((resolve) => {
      this.#client?.on("open", resolve);
    });
    const serverInfo = new Promise<void>((resolve) => {
      this.#client?.on("serverInfo", (e) => {
        this.#version =
          e.supportedEncodings && e.supportedEncodings.includes("ros1")
            ? RosVersion.Ros1
            : RosVersion.Ros2;
        resolve();
      });
    });
    Promise.all([open, serverInfo]).then(() => {
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
        const callbacksSet = this.#subscriptionCallbacksSet.get(channel.topic);
        if (callbacksSet) {
          const reader = this.#getMessageReader(channel);
          for (const callbacks of callbacksSet) {
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
      const callId = Ros.#callId++;
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
          encoding: this.#version === RosVersion.Ros2 ? "cdr" : "ros1",
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
  async _publish<T>(name: string, messageType: string, message: T) {
    if (!this.#client) {
      return;
    }

    const channelP = new Promise<Channel>((resolve) => {
      const channel = this.#channelsByName.get(name);
      if (channel) {
        resolve(channel);
      }
      const cb = (channels: Channel[]) => {
        for (const channel of channels) {
          if (channel.topic === name) {
            this.#client?.off("advertise", cb);
            resolve(channel);
          }
        }
      };
      this.#client?.on("advertise", cb);
    });

    const channelId =
      this.#publisherIds.get(name) ??
      (() => {
        const channelId = this.#client.advertise({
          topic: name,
          encoding: this.#version === RosVersion.Ros2 ? "cdr" : "ros1",
          schemaName: messageType,
        });
        this.#publisherIds.set(name, channelId);
        return channelId;
      })();
    const channel = await channelP;
    const writer = this.#getMessageWriter(channel);
    try {
      this.#client.sendMessage(channelId, writer.writeMessage(message));
    } catch (error) {
      console.error(error);
    }
  }

  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _getParam(name: string, callback: (value: any) => void) {
    if (!this.#client) {
      return;
    }
    const replacedName = name.replace(":", ".");
    const paramId = (Ros.#paramId++).toString();
    const listener = (event: ParameterValues) => {
      if (event.parameters[0]?.name === replacedName && event.id === paramId) {
        callback(event.parameters[0].value);
      }
      this.#client?.off("parameterValues", listener);
    };
    this.#client.on("parameterValues", listener);
    this.#client.getParameters([replacedName], paramId);
  }

  /** @internal */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _setParam(name: string, value: any, callback: (response: any) => void) {
    if (!this.#client) {
      return;
    }
    const replacedName = name.replace(":", ".");
    const paramId = (Ros.#paramId++).toString();
    const listener = (event: ParameterValues) => {
      if (event.parameters[0]?.name === replacedName && event.id === paramId) {
        callback(event.parameters[0]);
      }
      this.#client?.off("parameterValues", listener);
    };
    this.#client.on("parameterValues", listener);
    this.#client.setParameters([{ name: replacedName, value }], paramId);
  }

  #getMessageReader(channelOrService: Channel | Service) {
    const name =
      "schemaName" in channelOrService
        ? channelOrService.schemaName
        : channelOrService.type;
    const encoding =
      "encoding" in channelOrService ? channelOrService.encoding : undefined;
    const schemaEncoding =
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
        const tmp =
          encoding === "ros1"
            ? new Ros1MessageReader(parse(schema, { ros2: false }))
            : new Ros2MessageReader(
                schemaEncoding === "ros2idl"
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
      "encoding" in channelOrService ? channelOrService.encoding : undefined;
    const schemaEncoding =
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
        const tmp =
          encoding === "ros1"
            ? new Ros1MessageWriter(parse(schema, { ros2: false }))
            : new Ros2MessageWriter(
                schemaEncoding === "ros2idl"
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
