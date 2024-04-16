import { Ros } from "./Ros";

export class ServiceRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(values: any) {
    Object.assign(this, values);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Service<TRequest = any, TResponse = any> {
  #ros: Ros;
  #name: string;
  #serviceType: string;

  constructor(data: { ros: Ros; name: string; serviceType: string }) {
    this.#ros = data.ros;
    this.#name = data.name;
    this.#serviceType = data.serviceType;
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
    failedCallback?: (error: string) => void
  ) {
    this.#ros.rosImpl
      ?.sendServiceRequest<TRequest, TResponse>(this.name, request)
      .then(callback)
      .catch(failedCallback);
  }
}
