import { Ros } from "./ros";

export class Message {
  constructor(values: any) {
    Object.assign(this, values);
  }
}

export class Topic<T = Message> {
  #ros: Ros;
  #name: string;
  #messageType: string;

  #subscriptionCallbacks = new Set<(message: T) => void>();

  constructor(options: { ros: Ros; name: string; messageType: string }) {
    this.#ros = options.ros;
    this.#name = options.name;
    this.#messageType = options.messageType;
  }

  get name() {
    return this.#name;
  }
  get messageType() {
    return this.#messageType;
  }

  subscribe(callback: (message: T) => void) {
    if (this.#subscriptionCallbacks.size === 0) {
      this.#ros._subscribeTopic(
        this.#name,
        this.#messageType,
        this.#subscriptionCallbacks
      );
    }
    this.#subscriptionCallbacks.add(callback);
  }

  unsubscribe(callback?: (message: T) => void) {
    if (callback) {
      this.#subscriptionCallbacks.delete(callback);
    } else {
      this.#subscriptionCallbacks.clear();
    }
    if (this.#subscriptionCallbacks.size === 0) {
      this.#ros._unsubscribeTopic(this.#name);
    }
  }

  advertise(): void {}

  unadvertise(): void {}

  publish(message: T) {
    this.#ros._publishTopic(this.#name, this.#messageType, message);
  }
}
