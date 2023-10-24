import { Ros } from "./ros";

export class ServiceRequest {
  constructor(values: any) {
    Object.assign(this, values);
  }
}

export class Service<Request, Response> {
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
    request: Request,
    callback: (response: Response) => void,
    failedCallback?: (error: string) => void
  ) {
    this.#ros._callService(
      this.#name,
      this.#serviceType,
      request,
      callback,
      failedCallback
    );
  }

  advertise(callback: (request: Request, response: Response) => void): void {}

  unadvertise(): void {}
}
