import Quaternion from './Quaternion';
import Vector3 from './Vector3';

export default class Transform {
  stamp: { sec: number; nsec: number } | undefined;
  translation: Vector3;
  rotation: Quaternion;

  constructor(
    readonly options: {
      readonly stamp?: { sec: number; nsec: number };
      readonly translation: Vector3;
      readonly rotation: Quaternion;
    },
  ) {
    this.stamp = options.stamp ? options.stamp : undefined;
    this.translation = new Vector3(options.translation);
    this.rotation = new Quaternion(options.rotation);
  }

  clone() {
    return new Transform(this);
  }
}
