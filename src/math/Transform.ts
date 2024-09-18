import Quaternion from './Quaternion';
import Vector3 from './Vector3';

export default class Transform {
  stamp: { sec: number; nsec: number } | undefined;
  translation: Vector3;
  rotation: Quaternion;

  constructor(
    readonly options: {
      readonly stamp?: { sec: number; nsec: number };
      readonly translation: { x: number; y: number; z: number };
      readonly rotation: { x: number; y: number; z: number; w: number };
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
