export class Cube {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 12;
    this.spin = 0;
  }

  update(dt) {
    this.spin += dt * 3;
  }
}
