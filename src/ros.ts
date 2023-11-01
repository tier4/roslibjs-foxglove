import { FoxgloveClient, Channel, Service } from "@foxglove/ws-protocol";
import { NotImplemented } from "./error";
import EventEmitter from "eventemitter3";
import { MessageReader, MessageWriter } from "@foxglove/rosmsg2-serialization";
import { parse, parseRos2idl } from "@foxglove/rosmsg";
import WebSocket from "isomorphic-ws";

interface EventTypes {
  connection: () => void;
  close: () => void;
  error: (event: any) => void;
}

export class Ros {
  #emitter = new EventEmitter<EventTypes>();
  #client?: FoxgloveClient;

  // Channels
  #channelIdToChannel = new Map<number, Channel>();
  #topicNameToChannel = new Map<string, Channel>();
  #subscriptionIdToChannel = new Map<number, Channel>();
  #topicNameToSubscriptionId = new Map<string, number>();

  // Services
  #serviceIdToService = new Map<number, Service>();
  #serviceNameToService = new Map<string, Service>();
  #serviceCallId = 0;

  // Reader / Writer
  #topicTypeToReader = new Map<string, MessageReader>();
  #topicTypeToWriter = new Map<string, MessageWriter>();
  #serviceTypeToReader = new Map<string, MessageReader>();
  #serviceTypeToWriter = new Map<string, MessageWriter>();

  #advertisedReaderIds = new Map<string, number>();

  #subscribeWaitList = new Map<
    string,
    { messageType: string; callbacks: Set<(message: any) => void> }
  >();

  #readerAndCallback = new Map<number, Set<(message: any) => void>>();

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

    this.#client.on("close", () => {
      this.#emitter.emit("close");
    });

    this.#client.on("error", (event) => {
      this.#emitter.emit("error", event);
    });

    // topicとserviceの監視
    this.#client.on("advertise", (channels) => {
      for (const channel of channels) {
        this.#channelIdToChannel.set(channel.id, channel);
        this.#topicNameToChannel.set(channel.topic, channel);
        const w = this.#subscribeWaitList.get(channel.topic);
        if (w) {
          this._subscribeTopic(channel.topic, w.messageType, w.callbacks);
        }
      }
    });
    this.#client.on("unadvertise", (channelIds) => {
      for (const channelId of channelIds) {
        const channel = this.#channelIdToChannel.get(channelId);
        if (channel) {
          this.#channelIdToChannel.delete(channel.id);
          this.#topicNameToChannel.delete(channel.topic);
        }
      }
    });
    this.#client.on("advertiseServices", (services) => {
      for (const service of services) {
        this.#serviceIdToService.set(service.id, service);
        this.#serviceNameToService.set(service.name, service);
      }
    });
    this.#client.on("unadvertiseServices", (serviceIds) => {
      for (const serviceId of serviceIds) {
        const service = this.#serviceIdToService.get(serviceId);
        if (service) {
          this.#serviceIdToService.delete(service.id);
          this.#serviceNameToService.delete(service.name);
        }
      }
    });

    // subscribeしたトピックをすべてここで捌く
    this.#client.on("message", (event) => {
      const readerAndCallback = this.#readerAndCallback.get(
        event.subscriptionId
      );
      const channel = this.#subscriptionIdToChannel.get(event.subscriptionId);
      if (channel && readerAndCallback) {
        const reader =
          this.#topicTypeToReader.get(channel.schemaName) ??
          (() => {
            const reader = new MessageReader(
              channel.schemaEncoding === "ros2idl"
                ? parseRos2idl(channel.schema)
                : parse(channel.schema, { ros2: true })
            );
            this.#topicTypeToReader.set(channel.schemaName, reader);
            return reader;
          })();
        try {
          for (const callback of readerAndCallback) {
            callback(reader.readMessage(event.data));
          }
        } catch (error) {
          console.error(error);
          console.error(`${channel.schema}`);
        }
      }
    });
  }

  close() {
    this.#client?.close();
    this.#client = undefined;
  }

  authenticate(): never {
    throw NotImplemented;
  }
  sendEncodedMessage(): never {
    throw NotImplemented;
  }
  callOnConnection(): never {
    throw NotImplemented;
  }
  setStatusLevel(): never {
    throw NotImplemented;
  }
  getActionServers(): never {
    throw NotImplemented;
  }

  getTopics(
    callback: (result: { topics: string[]; types: string[] }) => void,
    failedCallback?: (error: string) => void
  ) {
    if (true) {
      callback({
        topics: [...this.#topicNameToChannel.keys()],
        types: [...this.#topicNameToChannel.values()].map((x) => x.schemaName),
      });
    } else if (failedCallback) {
      // failedCallback("Error: getTopics()");
    }
  }

  getTopicsForType(): never {
    throw NotImplemented;
  }

  getServices(
    callback: (services: string[]) => void,
    failedCallback?: (error: string) => void
  ) {
    if (true) {
      callback([...this.#serviceNameToService.keys()]);
    } else if (failedCallback) {
      // failedCallback("Error: getServices()");
    }
  }

  getServicesForType(): never {
    throw NotImplemented;
  }
  getServiceRequestDetails(): never {
    throw NotImplemented;
  }
  getServiceResponseDetails(): never {
    throw NotImplemented;
  }
  getNodes(): never {
    throw NotImplemented;
  }
  getNodeDetails(): never {
    throw NotImplemented;
  }
  getParams(): never {
    throw NotImplemented;
  }

  getTopicType(
    topic: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void
  ) {
    const type = this.#topicNameToChannel.get(topic)?.schemaName;
    if (type) {
      callback(type);
    } else if (failedCallback) {
      failedCallback("Error: getServiceType()");
    }
  }

  getServiceType(
    service: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void
  ) {
    const type = this.#serviceNameToService.get(service)?.type;
    if (type) {
      callback(type);
    } else if (failedCallback) {
      failedCallback("Error: getServiceType()");
    }
  }

  getMessageDetails(): never {
    throw NotImplemented;
  }
  decodeTypeDefs(): never {
    throw NotImplemented;
  }
  getTopicsAndRawTypes(): never {
    throw NotImplemented;
  }

  /** @internal */
  _subscribeTopic<T>(
    name: string,
    messageType: string,
    callbacks: Set<(message: T) => void>
  ) {
    if (!this.#client) {
      return;
    }
    const channel = this.#topicNameToChannel.get(name);
    if (channel) {
      const subscriptionId = this.#client.subscribe(channel.id);
      this.#subscriptionIdToChannel.set(subscriptionId, channel);

      this.#readerAndCallback.set(subscriptionId, callbacks);
      this.#topicNameToSubscriptionId.set(name, subscriptionId);
    } else {
      this.#subscribeWaitList.set(name, {
        messageType,
        callbacks,
      });
    }
  }

  /** @internal */
  _unsubscribeTopic(name: string) {
    const subscriptionId = this.#topicNameToSubscriptionId.get(name);
    if (subscriptionId) {
      this.#client?.unsubscribe(subscriptionId);
      this.#readerAndCallback.delete(subscriptionId);
    }
  }

  /** @internal */
  _callService<Request, Response>(
    name: string,
    serviceType: string,
    request: Request,
    callback: (response: Response) => void,
    failedCallback?: (error: string) => void
  ) {
    if (!this.#client) {
      return;
    }
    const service = this.#serviceNameToService.get(name);
    if (service && serviceType == service.type) {
      const writer =
        this.#serviceTypeToWriter.get(service.type) ??
        (() => {
          const writer = new MessageWriter(
            parse(service.requestSchema, { ros2: true })
          );
          this.#serviceTypeToWriter.set(service.type, writer);
          return writer;
        })();
      const reader =
        this.#serviceTypeToReader.get(service.type) ??
        (() => {
          const reader = new MessageReader(
            parse(service.responseSchema, { ros2: true })
          );
          this.#serviceTypeToReader.set(service.type, reader);
          return reader;
        })();

      const callId = this.#serviceCallId++;
      this.#client.on("serviceCallResponse", (event) => {
        if (event.serviceId === service.id && event.callId === callId) {
          callback(reader.readMessage(event.data));
        }
      });
      this.#client.sendServiceCallRequest({
        serviceId: service.id,
        callId,
        encoding: "cdr",
        data: new DataView(writer.writeMessage(request).buffer),
      });
    } else {
      if (failedCallback) {
        failedCallback("no service found");
      }
    }
  }

  /** @internal */
  _unadvertise() {}

  /** @internal */
  _publishTopic<T>(name: string, messageType: string, message: T) {
    if (!this.#client) {
      return;
    }
    const channel = this.#topicNameToChannel.get(name);
    if (channel) {
      const writer =
        this.#topicTypeToWriter.get(channel.schemaName) ??
        (() => {
          const writer = new MessageWriter(
            parse(channel.schema, { ros2: true })
          );
          this.#topicTypeToWriter.set(channel.schemaName, writer);
          return writer;
        })();
      const channelId =
        this.#advertisedReaderIds.get(channel.topic) ??
        (() => {
          const channelId = this.#client.advertise({
            topic: channel.topic,
            encoding: "cdr",
            schemaName: channel.schemaName,
          });
          this.#advertisedReaderIds.set(channel.topic, channelId);
          return channelId;
        })();
      this.#client.sendMessage(channelId, writer.writeMessage(message));
    }
  }

  _getParameter(name: string, callback: (value: any) => void) {
    const replacedName = name.replace(":", ".");
    this.#client?.on("parameterValues", (event) => {
      if (event.parameters[0]?.name === replacedName) {
        callback(event.parameters[0].value);
      }
    });
    this.#client?.getParameters([replacedName]);
  }
}
