# Publish and Subscribe example

## Code

```js
import * as ROSLIB from '@tier4/roslibjs-foxglove';

const ros = new ROSLIB.Ros({
  url: 'ws://localhost:8765',
});

ros.on('connection', () => {
  console.log('connected');
});

ros.on('close', () => {
  console.log('closed');
});

ros.on('error', (error) => {
  console.log(error);
});

const publisher = new ROSLIB.Topic({
  ros: ros,
  name: '/pub',
  messageType: 'std_msgs/msg/String',
});

const subscription = new ROSLIB.Topic({
  ros: ros,
  name: '/sub',
  messageType: 'std_msgs/msg/String',
});

subscription.subscribe((message) => {
  publisher.publish(message);
});
```

## Code Explanation

This code is a simple publisher and subscriber for ROS with `@tier4/roslibjs-foxglove`.

1. First, it imports `ROSLIB` from `@tier4/roslibjs-foxglove`.

2. Then, it creates a new `ROSLIB.Ros` instance, which connects to the localhost on port 8765 via WebSocket.

3. After that, it sets up handlers for the connection, close, and error events. These handlers output messages to the console when their events occur.

4. Then, it creates a new `ROSLIB.Topic` instance for publishing messages. The topic name is `/pub` and the message type is `std_msgs/msg/String`.

5. Similarly, it creates another `ROSLIB.Topic` instance for subscribing messages. The topic name is `/sub` and the message type is `std_msgs/msg/String`.

6. Finally, it starts a subscription to the `/sub` topic. When a message is received on this topic, it is published on the `/pub` topic.