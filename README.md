# @tier4/roslibjs-foxglove

An implementation of [roslibjs](https://github.com/RobotWebTools/roslibjs)'s interfaces by using [Foxglove WebSocket Protocol](https://github.com/foxglove/ws-protocol).

roslibjs-foxglove is a client library that communicates with ROS 1 / 2 using [Foxglove bridge](https://docs.foxglove.dev/docs/connecting-to-data/ros-foxglove-bridge/). Unlike the [rosbridge](https://github.com/RobotWebTools/rosbridge_suite) used in the existing [roslibjs](https://github.com/RobotWebTools/roslibjs), Foxglove bridge provides extremely high performance, low latency, and low packet loss rate.

## Getting Started

### ROS side

Install and launch Foxglove bridge.

```sh
sudo apt install ros-$ROS_DISTRO-foxglove-bridge
roslaunch --screen foxglove_bridge foxglove_bridge.launch port:=8765 # for ROS 1
ros2 launch foxglove_bridge foxglove_bridge_launch.xml port:=8765 # for ROS 2
```

### JS / TS side

```sh
npm install https://github.com/tier4/roslibjs-foxglove/releases/download/v0.0.4/tier4-roslibjs-foxglove-0.0.4.tgz
```

## Supported features

### ROSLIB.Ros

|                    | Parameter           | Note                                     |
| ------------------ | ------------------- | ---------------------------------------- |
| :heavy_check_mark: | url                 |                                          |
|                    | groovyCompatibility |                                          |
|                    | transportLibrary    | Foxglove bridge only supports WebSocket. |
|                    | transportOptions    |                                          |

|                    | Method                    | Note |
| ------------------ | ------------------------- | ---- |
|                    | authenticate              |      |
|                    | callOnConnection          |      |
| :heavy_check_mark: | close                     |      |
| :heavy_check_mark: | connect                   |      |
|                    | decodeTypeDefs            |      |
|                    | getActionServers          |      |
|                    | getMessageDetails         |      |
|                    | getNodeDetails            |      |
|                    | getNodes                  |      |
|                    | getParams                 |      |
|                    | getServiceRequestDetails  |      |
|                    | getServiceResponseDetails |      |
| :heavy_check_mark: | getServices               |      |
|                    | getServicesForType        |      |
| :heavy_check_mark: | getServiceType            |      |
| :heavy_check_mark: | getTopics                 |      |
|                    | getTopicsAndRawTypes      |      |
|                    | getTopicsForType          |      |
| :heavy_check_mark: | getTopicType              |      |
|                    | sendEncodedMessage        |      |
|                    | setStatusLevel            |      |

### ROSLIB.Topic

|                    | Parameter          | Note                                              |
| ------------------ | ------------------ | ------------------------------------------------- |
| :heavy_check_mark: | ros                |                                                   |
| :heavy_check_mark: | name               |                                                   |
| :heavy_check_mark: | messageType        |                                                   |
|                    | compression        |                                                   |
|                    | throttle_rate      | Foxglove bridge does not support `throttle_rate`. |
|                    | queue_size         |                                                   |
|                    | latch              |                                                   |
|                    | queue_length       |                                                   |
|                    | reconnect_on_close |                                                   |

|                    | Method      | Note |
| ------------------ | ----------- | ---- |
| :heavy_check_mark: | advertise   |      |
| :heavy_check_mark: | publish     |      |
| :heavy_check_mark: | subscribe   |      |
|                    | toStream    |      |
| :heavy_check_mark: | unadvertise |      |
| :heavy_check_mark: | unsubscribe |      |

### ROSLIB.Service

|                    | Parameter   | Note |
| ------------------ | ----------- | ---- |
| :heavy_check_mark: | ros         |      |
| :heavy_check_mark: | name        |      |
| :heavy_check_mark: | serviceType |      |

|                    | Method      | Note |
| ------------------ | ----------- | ---- |
|                    | advertise   |      |
| :heavy_check_mark: | callService |      |

### ROSLIB.Param

|                    | Parameter | Note |
| ------------------ | --------- | ---- |
| :heavy_check_mark: | ros       |      |
| :heavy_check_mark: | name      |      |

|                    | Method | Note |
| ------------------ | ------ | ---- |
|                    | delete |      |
| :heavy_check_mark: | get    |      |
| :heavy_check_mark: | set    |      |

## License

@tier4/roslibjs-foxglove is released under the Apache 2.0 license.
