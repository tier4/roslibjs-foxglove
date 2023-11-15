# roslibjs-foxglove

An implementation of [roslibjs](https://github.com/RobotWebTools/roslibjs)'s interfaces by using [Foxglove ws-protocol](https://github.com/foxglove/ws-protocol).

# Install

```bash
sudo apt install ros-humble-foxglove-bridge
npm install @tier4/roslibjs-foxglove
```

# Usage

First of all, launch Foxglove Bridge.

```bash
ros2 launch foxglove_bridge foxglove_bridge_launch.xml
```

## Publish and Subscribe

```ts
import * as ROSLIB from "@tier4/roslibjs-foxglove";

const ros = new ROSLIB.Ros({
  url: "ws://localhost:8765",
});

ros.on("connection", () => {
  console.log("connected");
});

ros.on("close", () => {
  console.log("closed");
});

ros.on("error", (error) => {
  console.log(error);
});

// Publisher
const publisher = new ROSLIB.Topic({
  ros: ros,
  name: "/pub",
  messageType: "std_msgs/msg/String",
});

// Subscription
const subscription = new ROSLIB.Topic({
  ros: ros,
  name: "/sub",
  messageType: "std_msgs/msg/String",
});

subscription.subscribe((message) => {
  publisher.publish(message);
});
```

## Call a Service

```ts
import * as ROSLIB from "@tier4/roslibjs-foxglove";

const ros = new ROSLIB.Ros({
  url: "ws://localhost:8765",
});

ros.on("connection", () => {
  console.log("connected");
});

ros.on("close", () => {
  console.log("closed");
});

ros.on("error", (error) => {
  console.log(error);
});

const service = new ROSLIB.Service({
  ros: ros,
  name: "/srv",
  serviceType: "std_srvs/srv/SetBool",
});

service.callService({ data: true }, (response) => {
  console.log(response);
});
```

# Build

```bash
npm install
npm run build
```

# License
