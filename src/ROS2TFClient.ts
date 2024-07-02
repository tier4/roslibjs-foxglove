import { Action } from './Action';
import type { Ros } from './Ros';
import Transform from './math/Transform';

import { EventEmitter } from 'eventemitter3';

export class ROS2TFClient extends EventEmitter {
  ros: Ros;
  fixedFrame: string;
  angularThres: number;
  transThres: number;
  rate: number;
  updateDelay: number;
  topicTimeout: { secs: number; nsecs: number };
  serverName: string;
  goal_id: string;
  frameInfos: {
    [frame_id: string]: {
      cbs: ((tf: Transform) => void)[];
      transform?: Transform;
    };
  };
  republisherUpdateRequested: boolean;

  actionClient: Action;

  constructor(
    readonly options: {
      readonly ros: Ros;
      readonly fixedFrame: string;
      readonly angularThres: number;
      readonly transThres: number;
      readonly rate: number;
      readonly updateDelay: number;
      readonly topicTimeout: number;
      readonly serverName: string;
      readonly repubServiceName: string;
    },
  ) {
    super();
    this.ros = options.ros;
    this.fixedFrame = options.fixedFrame || 'base_link';
    this.angularThres = options.angularThres || 2.0;
    this.transThres = options.transThres || 0.01;
    this.rate = options.rate || 10.0;
    this.updateDelay = options.updateDelay || 50;
    const seconds = options.topicTimeout || 2.0;
    const secs = Math.floor(seconds);
    const nsecs = Math.floor((seconds - secs) * 1e9);
    this.topicTimeout = {
      secs: secs,
      nsecs: nsecs,
    };
    this.serverName = options.serverName || '/tf2_web_republisher';
    this.goal_id = '';
    this.frameInfos = {};
    this.republisherUpdateRequested = false;

    // Create an Action Client
    this.actionClient = new Action({
      ros: options.ros,
      name: this.serverName,
      actionType: 'tf2_web_republisher_msgs/TFSubscription',
    });
  }

  processTFArray(tf: {
    transforms: [
      {
        transform: Transform;
        child_frame_id: string;
        header: { stamp: { sec: number; nsec: number } };
      },
    ];
  }) {
    for (const transform of tf.transforms) {
      let frameID = transform.child_frame_id;
      if (frameID[0] === '/') {
        frameID = frameID.substring(1);
      }
      const info = this.frameInfos[frameID];
      if (info) {
        info.transform = new Transform({
          stamp: transform.header.stamp,
          translation: transform.transform.translation,
          rotation: transform.transform.rotation,
        });
        for (const cb of info.cbs) {
          cb(info.transform);
        }
      }
    }
  }
  updateGoal() {
    const goalMessage = {
      source_frames: Object.keys(this.frameInfos),
      target_frame: this.fixedFrame,
      angular_thres: this.angularThres,
      trans_thres: this.transThres,
      rate: this.rate,
    };

    if (this.goal_id !== '') {
      this.actionClient.cancelGoal(this.goal_id);
    }
    // this.currentGoal = goalMessage; // is this even used?

    const id = this.actionClient.sendGoal(
      goalMessage,
      () => {},
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      (feedback: any) => {
        this.processTFArray(feedback);
      },
    );
    if (typeof id === 'string') {
      this.goal_id = id;
    }

    this.republisherUpdateRequested = false;
  }
  subscribe(frameID: string, callback: (tf: Transform) => void) {
    // remove leading slash, if it's there
    let correctFrameID = frameID;
    if (correctFrameID[0] === '/') {
      correctFrameID = correctFrameID.substring(1);
    }
    // if there is no callback registered for the given frame, create empty callback list
    if (!this.frameInfos[correctFrameID]) {
      this.frameInfos[correctFrameID] = {
        cbs: [],
      };
      if (!this.republisherUpdateRequested) {
        setTimeout(this.updateGoal.bind(this), this.updateDelay);
        this.republisherUpdateRequested = true;
      }
    }

    // if we already have a transform, callback immediately
    else if (this.frameInfos[correctFrameID]?.transform) {
      callback(this.frameInfos[correctFrameID]?.transform as Transform);
    }
    this.frameInfos[correctFrameID]?.cbs.push(callback);
  }

  unsubscribe(frameID: string, callback: (tf: Transform) => void) {
    // remove leading slash, if it's there
    let correctFrameID = frameID;
    if (correctFrameID[0] === '/') {
      correctFrameID = correctFrameID.substring(1);
    }
    const info = this.frameInfos[correctFrameID];
    const cbs = info?.cbs || [];
    for (let idx = cbs.length; idx--; ) {
      if (cbs[idx] === callback) {
        cbs.splice(idx, 1);
      }
    }
    if (!callback || cbs.length === 0) {
      delete this.frameInfos[correctFrameID];
    }
  }

  dispose() {
  }
}
