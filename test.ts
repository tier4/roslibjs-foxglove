import * as ROSLIB from "./src";

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
  name: "/zzz/zzz",
  messageType: "std_msgs/msg/String",
});

// Subscription
const subscription = new ROSLIB.Topic({
  ros: ros,
  name: "/rosout",
  messageType: "rosgraph_msgs/Log",
});

setInterval(() => {
  publisher.publish({ data: "asdf" });
}, 1000);
