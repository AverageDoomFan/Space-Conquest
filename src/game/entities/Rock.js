export class Rock {
  constructor(x, y, sprite) {
    this.x = x;
    this.y = y;
    this.radius = 28;
    this.hp = 5;
    this.sprite = sprite;
    this.lifetime = 0;
    this.canDamagePlayer = false;
  }

  update(dt) {
    this.lifetime += dt;
    this.canDamagePlayer = this.lifetime >= 3;
  }

  hit() {
    this.hp -= 1;
  }

  get isDestroyed() {
    return this.hp <= 0;
  }
}
