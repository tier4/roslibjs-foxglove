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

  publish(message: T) {
    this.#ros._publish(this.#name, this.#messageType, message);
  }

  subscribe(callback: (message: T) => void) {
    this.#ros._subscribe(this.#name, this.#messageType, callback);
  }
}
