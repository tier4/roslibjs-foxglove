import type { Ros } from './Ros';

export class ServiceRequest {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  constructor(readonly values: any) {
    Object.assign(this, values);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export class Service<TRequest = any, TResponse = any> {
  readonly #ros: Ros;
  readonly #name: string;
  readonly #serviceType: string;

  constructor(
    readonly options: {
      readonly ros: Ros;
      readonly name: string;
      readonly serviceType: string;
    },
  ) {
    this.#ros = options.ros;
    this.#name = options.name;
    this.#serviceType = options.serviceType;
  }

  get name() {
    return this.#name;
  }
  get serviceType() {
    return this.#serviceType;
  }

  callService(
    request: TRequest,
    callback: (response: TResponse) => void,
    failedCallback?: (error: string) => void,
  ) {
    this.#ros.rosImpl
      ?.sendServiceRequest<TRequest, TResponse>(this.name, request)
      .then(callback)
      .catch(failedCallback);
  }
}
