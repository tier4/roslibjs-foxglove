import { Ros } from "./ros";

export class Message {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(values: any) {
    Object.assign(this, values);
  }
}

export class Topic<TMessage = Message> {
  #ros: Ros;
  #name: string;
  #messageType: string;

  #subscriptionCallbacks = new Set<(message: TMessage) => void>();

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

  subscribe(callback: (message: TMessage) => void) {
    if (this.#subscriptionCallbacks.size === 0) {
      this.#ros._subscribe(this.#name, this.#subscriptionCallbacks);
    }
    this.#subscriptionCallbacks.add(callback);
  }

  unsubscribe(callback?: (message: TMessage) => void) {
    if (callback) {
      this.#subscriptionCallbacks.delete(callback);
    } else {
      this.#subscriptionCallbacks.clear();
    }
    if (this.#subscriptionCallbacks.size === 0) {
      this.#ros._unsubscribe(this.#name);
    }
  }

  advertise(): void {}

  unadvertise(): void {}

  publish(message: TMessage) {
    this.#ros._publish(this.#name, this.#messageType, message);
  }
}
