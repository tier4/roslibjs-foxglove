import type { Ros } from './Ros';
import { Service } from './Service';
import { Topic } from './Topic';

export class Action {
  readonly #ros: Ros;
  readonly #name: string;
  readonly #actionType: string;

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  #feedbackListener: Topic<any>;

  #sendGoalService: Service;
  #cancelGoalService: Service;
  #getResultService: Service;

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  #goalsCallbacks: { [key: string]: (message: any) => void };

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

    this.#goalsCallbacks = {};

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

    this.#feedbackListener.subscribe((message) => {
      if (this.#goalsCallbacks[message.goal_id.toString()] !== undefined) {
        (
          this.#goalsCallbacks[message.goal_id.toString()] as (
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            message: any,
          ) => void
        )(message);
      }
    });
  }

  get name() {
    return this.#name;
  }

  get actionType() {
    return this.#actionType;
  }

  sendGoal(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    goal: any,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    resultCallback?: any,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    feedbackCallback?: any,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    failedCallback?: any,
  ) {
    const goal_id = {
      uuid: crypto.getRandomValues(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
      ),
    };

    goal.goal_id = goal_id;

    this.#sendGoalService.callService(goal, (response) => {
      // console.log(response);
      if (response.accepted) {
        this.#goalsCallbacks[goal_id.toString()] = feedbackCallback;

        this.#getResultService.callService({ goal_id: goal_id }, (response) => {
          // console.log(response);
          delete this.#goalsCallbacks[goal_id.toString()];
          if (response.status === 6) {
            failedCallback(response);
          } else {
            resultCallback(response);
          }
        });
      }
    });
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
