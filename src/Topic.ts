import { Ros } from './Ros';
import { Publisher, Subscription } from './Impl';

export class Message {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(values: any) {
    Object.assign(this, values);
  }
}

export class Topic<TMessage = Message> {
  #ros: Ros;
  #name: string;
  #messageType: string;

  #publisher?: Promise<Publisher<TMessage>>;
  #subscriptions = new Map<(message: TMessage) => void, Subscription>();

  constructor(options: { ros: Ros; name: string; messageType: string }) {
    this.#ros = options.ros;
    this.#name = options.name;
    this.#messageType = options.messageType;
  }

  get name() {
    return this.#name;
  }

  get messageType() {
    return this.#messageType;
  }

  publish(message: TMessage) {
    if (!this.#publisher) {
      this.advertise();
    }
    this.#publisher?.then((publisher) => {
      publisher.publish(message);
    });
  }

  subscribe(callback: (message: TMessage) => void) {
    this.#ros.rosImpl
      ?.createSubscription(this.name, callback)
      .then((subscription) => {
        this.#subscriptions.set(callback, subscription);
      });
  }

  unsubscribe(callback?: (message: TMessage) => void) {
    if (callback) {
      this.#subscriptions.get(callback)?.unsubscribe();
      this.#subscriptions.delete(callback);
    } else {
      for (const subscription of this.#subscriptions.values()) {
        subscription.unsubscribe();
      }
      this.#subscriptions.clear();
    }
  }

  advertise() {
    this.#publisher = this.#ros.rosImpl?.createPublisher(
      this.name,
      this.messageType,
    );
  }

  unadvertise() {
    this.#publisher?.then((publisher) => {
      publisher.unadvertise();
      this.#publisher = undefined;
    });
  }
}
