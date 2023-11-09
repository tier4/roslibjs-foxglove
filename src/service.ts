import { Ros } from "./ros";

export class ServiceRequest {
  constructor(values: any) {
    Object.assign(this, values);
  }
}

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

  advertise(_callback: (request: Request, response: Response) => void): void {}

  unadvertise(): void {}
}
