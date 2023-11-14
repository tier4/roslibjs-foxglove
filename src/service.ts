import { Ros } from "./ros";

export class ServiceRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(values: any) {
    Object.assign(this, values);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Service<TServiceRequest = any, TServiceResponse = any> {
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
    request: TServiceRequest,
    callback: (response: TServiceResponse) => void,
    failedCallback?: (error: string) => void
  ) {
    this.#ros._callService(this.#name, request, callback, failedCallback);
  }
}
