import type { Ros } from './Ros';
import { Service } from './Service';
import { Topic } from './Topic';

function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
  if (bytes1.length !== bytes2.length) {
    return false;
  }

  for (let i = 0; i < bytes1.length; i++) {
    if (bytes1[i] !== bytes2[i]) {
      return false;
    }
  }

  return true;
}

export class Action {
  readonly #ros: Ros;
  readonly #name: string;
  readonly #actionType: string;

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  #feedbackListener: Topic<any>;

  #sendGoalService: Service;
  #cancelGoalService: Service;
  #getResultService: Service;

  constructor(
    readonly options: {
      readonly ros: Ros;
      readonly name: string;
      readonly actionType: string;
    },
  ) {
    this.#ros = options.ros;
    this.#name = options.name;
    this.#actionType = options.actionType;

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    this.#feedbackListener = new Topic<any>({
      ros: this.#ros,
      name: `${this.#name}/_action/feedback`,
      messageType: `${this.#actionType}_FeedbackMessage`,
    });

    this.#sendGoalService = new Service({
      ros: this.#ros,
      name: `${this.#name}/_action/send_goal`,
      serviceType: `${this.#actionType}_SendGoal`,
    });

    this.#cancelGoalService = new Service({
      ros: this.#ros,
      name: `${this.#name}/_action/cancel_goal`,
      serviceType: `${this.#actionType}_CancelGoal`,
    });

    this.#getResultService = new Service({
      ros: this.#ros,
      name: `${this.#name}/_action/get_result`,
      serviceType: `${this.#actionType}_GetResult`,
    });
  }

  get name() {
    return this.#name;
  }

  get actionType() {
    return this.#actionType;
  }

  sendGoal() {
    const goal_id = {
      uuid: crypto.getRandomValues(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
      ),
    };

    this.#feedbackListener.subscribe((message) => {
      if (isEqualBytes(message.goal_id.uuid, goal_id.uuid)) {
        console.log(message);
      }
    });

    this.#sendGoalService.callService(
      { goal_id: goal_id, order: 5 },
      (response) => {
        console.log(response);
        if (response.accepted) {
          this.#getResultService.callService(
            { goal_id: goal_id },
            (response) => {
              console.log(response);
            },
          );
        }
      },
    );
    return goal_id;
  }

  cancelGoal(goal_id: { uuid: Uint8Array }) {
    this.#cancelGoalService.callService({ goal_id: goal_id }, (response) => {
      console.log(response);
    });
  }

  //   advertise() {}

  //   unadvertise() {}

  //   #executeAction() {}

  //   sendFeedback() {}

  //   setSucceeded() {}

  //   setFailed() {}
}
