# Set and get ROS parameter example

Before running the example below, launch `parameter_blackboard` node.

```sh
ros2 run demo_nodes_cpp parameter_blackboard
```

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

const param = new ROSLIB.Param({
  ros: ros,
  name: '/parameter_blackboard:param',
});

param.set('hello', () => {
  param.get((value) => {
    console.log(value);
  });
});
```

## Code Explanation

This code is a client for ROS with `@tier4/roslibjs-foxglove`. It specifically deals with setting and getting ROS parameters.

1. First, it imports `ROSLIB` from `@tier4/roslibjs-foxglove`.

2. Then, it creates a new `ROSLIB.Ros` instance, which connects to the localhost on port 8765 via WebSocket.

3. After that, it sets up handlers for the connection, close, and error events. These handlers output messages to the console when their events occur.

4. Then, it creates a new `ROSLIB.Param` instance. This is used to communicate with a ROS parameter named `/parameter_blackboard:param`.

5. Finally, it sets the value of the parameter to 'hello'. Once the parameter is set, it gets the value of the parameter.