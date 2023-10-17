import { Ros } from "./ros";

export class Service<Request, Response> {
  #ros: Ros;
  #name: string;
  #serviceType: string;

  constructor(data: { ros: Ros; name: string; serviceType: string }) {
    this.#ros = data.ros;
    this.#name = data.name;
    this.#serviceType = data.serviceType;
  }

  callService(
    request: Request,
    callback: (response: Response) => void,
    failedCallback?: (error: string) => void
  ) {
    this.#ros.__callService(
      this.#name,
      this.#serviceType,
      request,
      callback,
      failedCallback
    );
  }
}
