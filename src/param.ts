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

  set(value: any, callback: (response: any) => void): void {}

  delete(callback: (response: any) => void): void {}
}