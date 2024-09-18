import type { Ros } from './Ros';
import { Service } from './Service';
import { Topic } from './Topic';

export class Action {
  readonly #ros: Ros;
  readonly #name: string;
  readonly #actionType: string;

  #feedbackListener: Topic<{ goal_id: { uuid: Uint8Array } }>;

  #sendGoalService: Service;
  #cancelGoalService: Service;
  #getResultService: Service;

  #goalsCallbacks: { [key: string]: (message: unknown) => void };

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

    this.#feedbackListener = new Topic({
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
            feedback: unknown,
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
    goal: {
      goal_id?: { uuid: Uint8Array };
      [key: string]: unknown;
    },
    resultCallback?: (result: unknown) => void,
    feedbackCallback?: (feedback: unknown) => void,
    failedCallback?: (result: unknown) => void,
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
        if (feedbackCallback !== undefined) {
          this.#goalsCallbacks[goal_id.toString()] = feedbackCallback;
        }
        this.#getResultService.callService({ goal_id: goal_id }, (response) => {
          // console.log(response);
          delete this.#goalsCallbacks[goal_id.toString()];
          if (response.status === 6) {
            if (failedCallback !== undefined) {
              failedCallback(response);
            }
          } else {
            if (resultCallback !== undefined) {
              resultCallback(response);
            }
          }
        });
      }
    });
    return goal_id.toString();
  }

  cancelGoal(goal_id: string) {
    this.#cancelGoalService.callService(
      { goal_id: new Uint8Array(goal_id.split(',').map(Number)) },
      (response) => {
        console.log(response);
      },
    );
  }

  //   advertise() {}

  //   unadvertise() {}

  //   #executeAction() {}

  //   sendFeedback() {}

  //   setSucceeded() {}

  //   setFailed() {}
}
