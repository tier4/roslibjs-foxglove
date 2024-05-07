# Getting Started

## ROS side

First of all, install Foxglove bridge and rosapi.

```sh
sudo apt install ros-$ROS_DISTRO-foxglove-bridge ros-$ROS_DISTRO-rosapi
```

Launch two terminals and execute each commands below:

```sh
ros2 launch foxglove_bridge foxglove_bridge_launch.xml
ros2 run rosapi rosapi_node
```

## JS side

Install @tier4/roslibjs-foxglove with npm.

```sh
npm install @tier4/roslibjs-foxglove
```