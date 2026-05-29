export class HPBox {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.picked = false;
    this.spin = 0;
  }

  update(dt) {
    this.spin += 4 * dt;
  }
}
