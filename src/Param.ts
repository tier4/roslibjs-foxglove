import { Parameter, ParameterValue } from "@foxglove/ws-protocol";
import { Ros } from "./Ros";

export class Param {
  #ros: Ros;
  #name: string;

  constructor(options: { ros: Ros; name: string }) {
    this.#ros = options.ros;
    this.#name = options.name.replace(":", ".");
  }

  get(callback: (value: ParameterValue) => void) {
    this.#ros.rosImpl?.getParameter(this.#name).then(callback);
  }

  set(value: ParameterValue, callback: (value: Parameter) => void) {
    this.#ros.rosImpl?.setParameter(this.#name, value).then(callback);
  }
}
