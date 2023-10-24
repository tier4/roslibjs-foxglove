import { Ros } from "./ros";

export class Topic<T> {
  #ros: Ros;
  #name: string;
  #messageType: string;

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
    this.#ros._subscribe(this.#name, this.#messageType, callback);
  }

  unsubscribe(callback?: (message: T) => void) {
    this.#ros._unsubscribe(this.#name, callback);
  }

  advertise(): void {}

  unadvertise(): void {}

  publish(message: T) {
    this.#ros._publish(this.#name, this.#messageType, message);
  }
}
