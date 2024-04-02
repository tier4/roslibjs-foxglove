import EventEmitter from "eventemitter3";

import { EventTypes, Impl } from "./Impl";

export class Ros {
  /** @internal */
  rosImpl?: Impl;

  constructor(options: { url?: string }) {
    if (options.url) {
      this.connect(options.url);
    }
  }

  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ): this {
    this.rosImpl?.on(event, fn);
    return this;
  }

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>
  ): this {
    this.rosImpl?.off(event, fn);
    return this;
  }

  connect(url: string) {
    this.rosImpl = new Impl(url);
  }

  close() {
    this.rosImpl?.close();
    this.rosImpl = undefined;
  }

  getTopics(
    callback: (result: { topics: string[]; types: string[] }) => void,
    failedCallback?: (error: string) => void
  ) {
    const topics = this.rosImpl?.getTopics();
    if (topics) {
      callback(topics);
    } else if (failedCallback) {
      failedCallback("Error: getTopics");
    }
  }

  getServices(
    callback: (services: string[]) => void,
    failedCallback?: (error: string) => void
  ) {
    const services = this.rosImpl?.getServices();
    if (services) {
      callback(services);
    } else if (failedCallback) {
      failedCallback("Error: getServices");
    }
  }

  getTopicType(
    topic: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void
  ) {
    const topicType = this.rosImpl?.getTopicType(topic);
    if (topicType) {
      callback(topicType);
    } else if (failedCallback) {
      failedCallback("Error: getTopicType");
    }
  }

  getServiceType(
    service: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void
  ) {
    const serviceType = this.rosImpl?.getServiceType(service);
    if (serviceType) {
      callback(serviceType);
    } else if (failedCallback) {
      failedCallback("Error: getServiceType");
    }
  }
}
