import {
  FoxgloveClient,
  Channel,
  Service,
  ServiceCallResponse,
  ParameterValues,
  MessageData,
  ParameterValue,
  Parameter,
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

export interface EventTypes {
  connection: () => void;
  close: (event: CloseEvent) => void;
  error: (error: Error) => void;
}

export interface Publisher<T> {
  publish: (message: T) => void;
  unadvertise: () => void;
}

export interface Subscription {
  unsubscribe: () => void;
}

export class Impl {
  #emitter = new EventEmitter<EventTypes>();
  #client: Promise<FoxgloveClient>;
  #isRos1?: boolean;

  // Message Readers / Writers
  #messageReaders = new Map<string, Ros1MessageReader | Ros2MessageReader>();
  #messageWriters = new Map<string, Ros1MessageWriter | Ros2MessageWriter>();

  // Channels
  #channelsById = new Map<number, Channel>();
  #channelsByName = new Map<string, Channel>();

  // Services
  #servicesById = new Map<number, Service>();
  #servicesByName = new Map<string, Service>();

  static #callId = 0;
  static #paramId = 0;

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    this.#emitter.on(event, fn);
  }

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ) {
    this.#emitter.off(event, fn);
  }

  constructor(url: string) {
    this.#client = new Promise<FoxgloveClient>((resolve) => {
      const client = new FoxgloveClient({
        ws: new WebSocket(url, [FoxgloveClient.SUPPORTED_SUBPROTOCOL]),
      });

      const open = new Promise<void>((resolve) => {
        client.on("open", resolve);
      });
      const serverInfo = new Promise<void>((resolve) => {
        client.on("serverInfo", (e) => {
          this.#isRos1 =
            (e.supportedEncodings && e.supportedEncodings.includes("ros1")) ??
            false;
          resolve();
        });
      });
      client.on("close", (event) => {
        this.#emitter.emit("close", event);
      });
      client.on("error", (error) => {
        this.#emitter.emit("error", error);
      });

      client.on("advertise", (channels) => {
        for (const channel of channels) {
          this.#channelsById.set(channel.id, channel);
          this.#channelsByName.set(channel.topic, channel);
        }
      });
      client.on("unadvertise", (channelIds) => {
        for (const channelId of channelIds) {
          const channel = this.#channelsById.get(channelId);
          if (channel) {
            this.#channelsById.delete(channel.id);
            this.#channelsByName.delete(channel.topic);
          }
        }
      });

      client.on("advertiseServices", (services) => {
        for (const service of services) {
          this.#servicesById.set(service.id, service);
          this.#servicesByName.set(service.name, service);
        }
      });
      client.on("unadvertiseServices", (serviceIds) => {
        for (const serviceId of serviceIds) {
          const service = this.#servicesById.get(serviceId);
          if (service) {
            this.#servicesById.delete(service.id);
            this.#servicesByName.delete(service.name);
          }
        }
      });

      Promise.all([open, serverInfo]).then(() => {
        this.#emitter.emit("connection");
        resolve(client);
      });
    });
  }

  async close() {
    (await this.#client).close();
  }

  getTopics() {
    return {
      topics: [...this.#channelsByName.keys()],
      types: [...this.#channelsByName.values()].map((x) => x.schemaName),
    };
  }

  getServices() {
    return [...this.#servicesByName.keys()];
  }

  getTopicType(topic: string) {
    return this.#channelsByName.get(topic)?.schemaName;
  }

  getServiceType(service: string) {
    return this.#servicesByName.get(service)?.type;
  }

  async createPublisher<T>(
    name: string,
    messageType: string
  ): Promise<Publisher<T>> {
    const client = await this.#client;
    const channel_ = this.#getChannel(name);
    const publisherId = client.advertise({
      topic: name,
      encoding: this.#isRos1 ? "ros1" : "cdr",
      schemaName: messageType,
    });
    const channel = await channel_;

    return {
      publish: (message: T) => {
        const writer = this.#getMessageWriter(channel);
        client.sendMessage(publisherId, writer.writeMessage(message));
      },
      unadvertise: () => {
        client.unadvertise(publisherId);
      },
    };
  }

  async createSubscription<T>(
    name: string,
    callback: (message: T) => void
  ): Promise<Subscription> {
    const client = await this.#client;
    const channel = await this.#getChannel(name);
    const subscriptionId = client.subscribe(channel.id);

    const listener = (event: MessageData) => {
      if (event.subscriptionId === subscriptionId) {
        const reader = this.#getMessageReader(channel);
        callback(reader.readMessage(event.data));
      }
    };
    client.on("message", listener);

    return {
      unsubscribe: () => {
        client.off("message", listener);
        client.unsubscribe(subscriptionId);
      },
    };
  }

  async sendServiceRequest<Request, Response>(name: string, request: Request) {
    const client = await this.#client;
    const service = this.#servicesByName.get(name);
    if (!service) {
      throw new Error("no service found");
    }
    const writer = this.#getMessageWriter(service);
    const reader = this.#getMessageReader(service);

    const callId = Impl.#callId++;
    const response = new Promise<Response>((resolve) => {
      const listener = (event: ServiceCallResponse) => {
        if (event.serviceId === service.id && event.callId === callId) {
          client.off("serviceCallResponse", listener);
          resolve(reader.readMessage(event.data));
        }
      };
      client.on("serviceCallResponse", listener);
    });
    client.sendServiceCallRequest({
      serviceId: service.id,
      callId,
      encoding: this.#isRos1 ? "ros1" : "cdr",
      data: new DataView(writer.writeMessage(request).buffer),
    });
    return response;
  }

  async getParameter(name: string) {
    const client = await this.#client;
    const paramId = (Impl.#paramId++).toString();
    const result = new Promise<ParameterValue>((resolve) => {
      const listener = (event: ParameterValues) => {
        if (event.parameters[0]?.name === name && event.id === paramId) {
          client.off("parameterValues", listener);
          resolve(event.parameters[0].value);
        }
      };
      client.on("parameterValues", listener);
    });
    client.getParameters([name], paramId);
    return result;
  }

  async setParameter(name: string, value: ParameterValue) {
    const client = await this.#client;
    const paramId = (Impl.#paramId++).toString();
    const result = new Promise<Parameter>((resolve) => {
      const listener = (event: ParameterValues) => {
        if (event.parameters[0]?.name === name && event.id === paramId) {
          client.off("parameterValues", listener);
          resolve(event.parameters[0]);
        }
      };
      client.on("parameterValues", listener);
    });
    client.setParameters([{ name, value }], paramId);
    return result;
  }

  async #getChannel(name: string) {
    const client = await this.#client;
    return (
      this.#channelsByName.get(name) ??
      (await new Promise<Channel>((resolve) => {
        const listener = (channels: Channel[]) => {
          const channel = channels.find((channel) => channel.topic === name);
          if (channel) {
            client.off("advertise", listener);
            resolve(channel);
          }
        };
        client.on("advertise", listener);
      }))
    );
  }

  #getMessageReader(channelOrService: Channel | Service) {
    const name =
      "schemaName" in channelOrService
        ? channelOrService.schemaName
        : channelOrService.type;
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
        const reader = this.#isRos1
          ? new Ros1MessageReader(parse(schema, { ros2: false }))
          : new Ros2MessageReader(
              schemaEncoding === "ros2idl"
                ? parseRos2idl(schema)
                : parse(schema, { ros2: true })
            );
        this.#messageReaders.set(name, reader);
        return reader;
      })()
    );
  }

  #getMessageWriter(channelOrService: Channel | Service) {
    const name =
      "schemaName" in channelOrService
        ? channelOrService.schemaName
        : channelOrService.type;
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
        const writer = this.#isRos1
          ? new Ros1MessageWriter(parse(schema, { ros2: false }))
          : new Ros2MessageWriter(
              schemaEncoding === "ros2idl"
                ? parseRos2idl(schema)
                : parse(schema, { ros2: true })
            );
        this.#messageWriters.set(name, writer);
        return writer;
      })()
    );
  }
}
