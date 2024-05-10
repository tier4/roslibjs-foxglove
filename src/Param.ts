import type { Parameter, ParameterValue } from '@foxglove/ws-protocol';
import type { Ros } from './Ros';

export class Param {
  readonly #ros: Ros;
  readonly #name: string;

  constructor(readonly options: { readonly ros: Ros; readonly name: string }) {
    this.#ros = options.ros;
    this.#name = options.name.replace(':', '.');
  }

  get(callback: (value: ParameterValue) => void) {
    this.#ros.rosImpl?.getParameter(this.#name).then(callback);
  }

  set(value: ParameterValue, callback: (value: Parameter) => void) {
    this.#ros.rosImpl?.setParameter(this.#name, value).then(callback);
  }
}
