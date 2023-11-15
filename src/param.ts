import { Ros } from "./ros";

export class Param {
  #ros: Ros;
  #name: string;

  constructor(options: { ros: Ros; name: string }) {
    this.#ros = options.ros;
    this.#name = options.name;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(callback: (value: any) => void) {
    this.#ros._getParam(this.#name, callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(value: any, callback: (response: any) => void) {
    this.#ros._setParam(this.#name, value, callback);
  }
}
