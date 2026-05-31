export class Cube {
  constructor(x, y, type, rarity = "legendary", acronym = "") {
    this.x = x;
    this.y = y;
    this.type = type;
    this.rarity = rarity;
    this.acronym = acronym;
    this.radius = 12;
    this.spin = 0;
    this.lifeTime = 7;
    this.elapsed = 0;
  }

  update(dt) {
    this.spin += dt * 3;
    this.elapsed += dt;
  }

  get isDead() {
    return this.elapsed >= this.lifeTime;
  }
}
