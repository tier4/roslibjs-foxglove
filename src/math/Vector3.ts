import type Quaternion from './Quaternion';

export default class Vector3 {
  x: number;
  y: number;
  z: number;
  constructor(
    readonly options: {
      readonly x: number | undefined;
      readonly y: number | undefined;
      readonly z: number | undefined;
    },
  ) {
    const values = options || {};
    this.x = values.x || 0;
    this.y = values.y || 0;
    this.z = values.z || 0;
  }

  add(v: Vector3) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }
  subtract(v: Vector3) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
  }
  multiplyQuaternion(q: Quaternion) {
    const ix = q.w * this.x + q.y * this.z - q.z * this.y;
    const iy = q.w * this.y + q.z * this.x - q.x * this.z;
    const iz = q.w * this.z + q.x * this.y - q.y * this.x;
    const iw = -q.x * this.x - q.y * this.y - q.z * this.z;
    this.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
    this.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
    this.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
  }

  clone() {
    return new Vector3(this);
  }
}
