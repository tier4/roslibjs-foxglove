import { FoxgloveClient, Channel, Service } from "@foxglove/ws-protocol";
import { NotImplemented } from "./error";
import EventEmitter from "eventemitter3";
import { MessageReader, MessageWriter } from "@foxglove/rosmsg2-serialization";
import { parse } from "@foxglove/rosmsg";
import WebSocket from "isomorphic-ws";

interface EventTypes {
  connection: () => void;
}

export class Ros {
  #emitter = new EventEmitter<EventTypes>();
  #client?: FoxgloveClient;

  #idToChannel = new Map<number, Channel>();
  #topicNameToChannel = new Map<string, Channel>();

  #idToService = new Map<number, Service>();
  #serviceNameToService = new Map<string, Service>();

  #topicTypeToReader = new Map<string, MessageReader>();
  #topicTypeToWriter = new Map<string, MessageWriter>();

  #serviceTypeToReader = new Map<string, MessageReader>();
  #serviceTypeToWriter = new Map<string, MessageWriter>();

  #advertisedReaderIds = new Map<string, number>();

  #subscribeWaitList = new Map<
    string,
    { messageType: string; callback: (message: any) => void }
  >();

  #readerAndCallback = new Map<
    number,
    { reader: MessageReader; callback: (message: any) => void }
  >();

  #callId = 0;

  /** @internal */
  _publish<T>(name: string, messageType: string, message: T) {
    if (!this.#client) {
      return;
    }
    const channel = this.#topicNameToChannel.get(name);
    if (channel && messageType === channel.schemaName) {
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

  /** @internal */
  _subscribe<T>(
    name: string,
    messageType: string,
    callback: (message: T) => void
  ) {
    if (!this.#client) {
      return;
    }
    const channel = this.#topicNameToChannel.get(name);
    if (channel && messageType === channel.schemaName) {
      const reader =
        this.#topicTypeToReader.get(channel.schemaName) ??
        (() => {
          const reader = new MessageReader(
            parse(channel.schema, { ros2: true })
          );
          this.#topicTypeToReader.set(channel.schemaName, reader);
          return reader;
        })();
      const channelId = this.#client.subscribe(channel.id);
      this.#readerAndCallback.set(channelId, {
        reader,
        callback,
      });
    } else {
      this.#subscribeWaitList.set(name, { messageType, callback });
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

      const callId = this.#callId++;

      this.#client.on("serviceCallResponse", (event) => {
        if (event.serviceId === service.id && event.callId === callId) {
          callback(reader.readMessage(event.data));
        }
      });
      const buf = writer.writeMessage(request);
      this.#client.sendServiceCallRequest({
        serviceId: service.id,
        callId,
        encoding: "cdr",
        data: new DataView(buf.buffer),
      });
    } else {
      if (failedCallback) {
        failedCallback("no service found");
      }
    }
  }

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

    // topicとserviceの監視
    this.#client.on("advertise", (channels) => {
      for (const channel of channels) {
        this.#idToChannel.set(channel.id, channel);
        this.#topicNameToChannel.set(channel.topic, channel);
        const w = this.#subscribeWaitList.get(channel.topic);
        if (w) {
          this._subscribe(channel.topic, w.messageType, w.callback);
        }
      }
    });
    this.#client.on("unadvertise", (channelIds) => {
      for (const channelId of channelIds) {
        const channel = this.#idToChannel.get(channelId);
        if (channel) {
          this.#idToChannel.delete(channel.id);
          this.#topicNameToChannel.delete(channel.topic);
        }
      }
    });
    this.#client.on("advertiseServices", (services) => {
      for (const service of services) {
        this.#idToService.set(service.id, service);
        this.#serviceNameToService.set(service.name, service);
      }
    });
    this.#client.on("unadvertiseServices", (serviceIds) => {
      for (const serviceId of serviceIds) {
        const service = this.#idToService.get(serviceId);
        if (service) {
          this.#idToService.delete(service.id);
          this.#serviceNameToService.delete(service.name);
        }
      }
    });

    // subscribeしたトピックをすべてここで捌く
    this.#client.on("message", (event) => {
      const readerAndCallback = this.#readerAndCallback.get(
        event.subscriptionId
      );
      if (readerAndCallback) {
        readerAndCallback.callback(
          readerAndCallback.reader.readMessage(event.data)
        );
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
  getTopics() {
    return [...this.#topicNameToChannel.keys()];
  }
  getTopicsForType(): never {
    throw NotImplemented;
  }
  getServices() {
    return [...this.#serviceNameToService.keys()];
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
  getTopicType(): never {
    throw NotImplemented;
  }
  getServiceType(): never {
    throw NotImplemented;
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
}
