import Quaterion from './Quaternion';
import Transform from './Transform';
import Vector3 from './Vector3';

export default class Pose {
  position: Vector3;
  orientation: Quaterion;

  constructor(
    readonly options: {
      readonly position: { x: number; y: number; z: number };
      readonly orientation: { x: number; y: number; z: number; w: number };
    },
  ) {
    const values = options || {};
    this.position = new Vector3(values.position);
    this.orientation = new Quaterion(values.orientation);
  }

  applyTransform(tf: Transform) {
    this.position.multiplyQuaternion(tf.rotation);
    this.position.add(tf.translation);
    const tmp = tf.rotation.clone();
    tmp.multiply(this.orientation);
    this.orientation = tmp;
  }

  clone() {
    return new Pose(this);
  }

  multiply(pose: Pose) {
    const p = pose.clone();
    p.applyTransform(
      new Transform({ translation: this.position, rotation: this.orientation }),
    );
    return p;
  }

  getInverse() {
    const inv = this.clone();
    inv.orientation.invert();
    inv.position.multiplyQuaternion(inv.orientation);
    inv.position.x *= -1;
    inv.position.y *= -1;
    inv.position.z *= -1;
    return inv;
  }
}
