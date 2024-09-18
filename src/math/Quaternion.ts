export default class Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(
    readonly options: {
      readonly x: number | undefined;
      readonly y: number | undefined;
      readonly z: number | undefined;
      readonly w: number | undefined;
    },
  ) {
    const values = options || {};
    this.x = values.x || 0;
    this.y = values.y || 0;
    this.z = values.z || 0;
    this.w = values.w || 1;
  }

  conjugate() {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
  }

  norm() {
    return Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w,
    );
  }

  normalize() {
    let l = this.norm();
    if (l === 0) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
      this.w = 1;
    } else {
      l = 1 / l;
      this.x *= l;
      this.y *= l;
      this.z *= l;
      this.w *= l;
    }
  }
  invert() {
    this.conjugate();
    this.normalize();
  }

  multiply(q: Quaternion) {
    const x = this.x * q.w + this.y * q.z - this.z * q.y + this.w * q.x;
    const y = -this.x * q.z + this.y * q.w + this.z * q.x + this.w * q.y;
    const z = this.x * q.y - this.y * q.x + this.z * q.w + this.w * q.z;
    const w = -this.x * q.x - this.y * q.y - this.z * q.z + this.w * q.w;
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  clone() {
    return new Quaternion(this);
  }
}
