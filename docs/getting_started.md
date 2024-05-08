# Getting Started

## ROS side

First, install Foxglove bridge.

```sh
sudo apt install ros-$ROS_DISTRO-foxglove-bridge
```

Then, launch Foxglove bridge.

```sh
ros2 launch foxglove_bridge foxglove_bridge_launch.xml
```

## JS side

Install @tier4/roslibjs-foxglove with npm.

```sh
npm install @tier4/roslibjs-foxglove
```