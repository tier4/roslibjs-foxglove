import { Ros } from "./ros";

export class Param {
  #ros: Ros;
  #name: string;

  constructor(options: { ros: Ros; name: string }) {
    this.#ros = options.ros;
    this.#name = options.name;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(callback: (value: any) => void): void {
    this.#ros._getParameter(this.#name, callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set(_value: any, _callback: (response: any) => void): void {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(_callback: (response: any) => void): void {}
}
