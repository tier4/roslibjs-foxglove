import { FoxgloveClient, Channel, Service } from "@foxglove/ws-protocol";
import { NotImplemented } from "./error";
import EventEmitter from "eventemitter3";
import { MessageReader, MessageWriter } from "@foxglove/rosmsg2-serialization";
import { parse } from "@foxglove/rosmsg";

export interface IWebSocket {
  binaryType: string;
  protocol: string;
  onerror: ((event: any) => void) | null | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  onopen: ((event: any) => void) | null | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  onclose: ((event: any) => void) | null | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  onmessage: ((event: any) => void) | null | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  close(): void;
  send(
    data: string | ArrayBuffer | ArrayBufferView,
    /** Options available in Node "ws" library */
    options?: { fin?: boolean }
  ): void;
}

interface EventTypes {
  connection: () => void;
}

export class Ros {
  #emitter = new EventEmitter<EventTypes>();
  #client: FoxgloveClient;

  #channels = new Map<string, Channel>();
  #services = new Map<string, Service>();

  #subscribeWaitList = new Map<
    string,
    { messageType: string; callback: (message: any) => void }
  >();

  #readerAndCallback = new Map<
    number,
    { reader: MessageReader; callback: (message: any) => void }
  >();

  #callId = 0;

  __publish<T>(name: string, messageType: string, message: T) {
    const channel = this.#channels.get(name);
    if (channel && messageType === channel.schemaName) {
      const writer = new MessageWriter(parse(channel.schema, { ros2: true }));
      const channelId = this.#client.advertise({
        topic: channel.topic,
        encoding: "cdr",
        schemaName: channel.schemaName,
      });
      this.#client.sendMessage(channelId, writer.writeMessage(message));
    } else {
      //
    }
  }

  __subscribe<T>(
    name: string,
    messageType: string,
    callback: (message: T) => void
  ) {
    const channel = this.#channels.get(name);
    if (channel && messageType === channel.schemaName) {
      const channelId = this.#client.subscribe(channel.id);
      this.#readerAndCallback.set(channelId, {
        reader: new MessageReader(parse(channel.schema, { ros2: true })),
        callback,
      });
    } else {
      this.#subscribeWaitList.set(name, { messageType, callback });
    }
  }

  __callService<Request, Response>(
    name: string,
    serviceType: string,
    request: Request,
    callback: (response: Response) => void,
    failedCallback?: (error: string) => void
  ) {
    const service = this.#services.get(name);
    if (service && serviceType == service.type) {
      const callId = this.#callId++;
      const writer = new MessageWriter(
        parse(service.requestSchema, { ros2: true })
      );
      const reader = new MessageReader(
        parse(service.responseSchema, { ros2: true })
      );
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

  constructor(socket: IWebSocket) {
    this.#client = new FoxgloveClient({ ws: socket });
    this.#client.on("open", () => {
      this.#emitter.emit("connection");

      // topicとserviceの監視
      this.#client.on("advertise", (channels) => {
        for (const channel of channels) {
          this.#channels.set(channel.topic, channel);
          const w = this.#subscribeWaitList.get(channel.topic);
          if (w) {
            this.__subscribe(channel.topic, w.messageType, w.callback);
          }
        }
      });
      this.#client.on("advertiseServices", (services) => {
        for (const service of services) {
          this.#services.set(service.name, service);
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
    });
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

  connect(socket: IWebSocket) {
    this.#client = new FoxgloveClient({ ws: socket });
  }

  close() {
    this.#client.close();
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
  getTopics(): never {
    throw NotImplemented;
  }
  getTopicsForType(): never {
    throw NotImplemented;
  }
  getServices(): never {
    throw NotImplemented;
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
