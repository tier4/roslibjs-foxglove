import EventEmitter from 'eventemitter3';

import { type EventTypes, Impl } from './Impl';

export class Ros extends EventEmitter<EventTypes> {
  #rosImpl: Impl | undefined;

  constructor(readonly options: { readonly url?: string }) {
    super();
    if (options.url) {
      this.connect(options.url);
    }
  }

  /** @internal */
  get rosImpl() {
    return this.#rosImpl;
  }

  connect(url: string) {
    this.#rosImpl = new Impl(url);
    this.#rosImpl.on('connection', () => {
      this.emit('connection');
    });
    this.#rosImpl.on('close', (event) => {
      this.emit('close', event);
    });
    this.#rosImpl.on('error', (error) => {
      this.emit('error', error);
    });
  }

  close() {
    this.rosImpl?.close();
    this.#rosImpl = undefined;
  }

  getTopics(
    callback: (result: { topics: string[]; types: string[] }) => void,
    failedCallback?: (error: string) => void,
  ) {
    const topics = this.rosImpl?.getTopics();
    if (topics) {
      callback(topics);
    } else if (failedCallback) {
      failedCallback('Error: getTopics');
    }
  }

  getServices(
    callback: (services: string[]) => void,
    failedCallback?: (error: string) => void,
  ) {
    this.rosImpl?.getServices().then(callback).catch(failedCallback);
  }

  getTopicType(
    topic: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void,
  ) {
    const topicType = this.rosImpl?.getTopicType(topic);
    if (topicType) {
      callback(topicType);
    } else if (failedCallback) {
      failedCallback('Error: getTopicType');
    }
  }

  getServiceType(
    service: string,
    callback: (type: string) => void,
    failedCallback?: (error: string) => void,
  ) {
    const serviceType = this.rosImpl?.getServiceType(service);
    if (serviceType) {
      callback(serviceType);
    } else if (failedCallback) {
      failedCallback('Error: getServiceType');
    }
  }
}
