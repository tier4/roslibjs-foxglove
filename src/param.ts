import { Ros } from "./ros";

export class Param {
  #ros: Ros;
  #name: string;

  constructor(options: { ros: Ros; name: string }) {
    this.#ros = options.ros;
    this.#name = options.name;
  }

  get(callback: (value: any) => void): void {
    this.#ros._getParameter(this.#name, callback);
  }

  set(_value: any, _callback: (response: any) => void): void {}

  delete(_callback: (response: any) => void): void {}
}
