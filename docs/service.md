# Service call example

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

const service = new ROSLIB.Service({
  ros: ros,
  name: '/srv',
  serviceType: 'std_srvs/srv/SetBool',
});

service.callService({ data: true }, (response) => {
  console.log(response);
});
```

## Code Explanation

This code is a simple service client for ROS with `@tier4/roslibjs-foxglove`.

1. First, it imports `ROSLIB` from `@tier4/roslibjs-foxglove`.

2. Then, it creates a new `ROSLIB.Ros` instance, which connects to the localhost on port 8765 via WebSocket.

3. After that, it sets up handlers for the connection, close, and error events. These handlers output messages to the console when their events occur.

4. Finally, it creates a new `ROSLIB.Service` instance and calls a service named `/srv`. The service type is `std_srvs/srv/SetBool`. It sends a message of `{ data: true }`. The response from the service is output to the console.