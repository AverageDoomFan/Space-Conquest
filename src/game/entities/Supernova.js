export class Supernova {
  constructor(x, y, level) {
    this.x = x;
    this.y = y;
    this.level = level;
    this.radius = 40 + level * 20; // 40 base + 20 per upgrade
    this.ttl = 1.5 + level * 0.5; // 1.5s base + 0.5s per upgrade
    this.elapsed = 0;
    this.tickTimer = 0;
    this.tickInterval = 0.2; // Damage tick every 0.2 seconds
  }

  update(dt) {
    this.elapsed += dt;
    this.tickTimer += dt;
  }

  get isDead() {
    return this.elapsed >= this.ttl;
  }

  shouldDamage() {
    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer = 0;
      return true;
    }
    return false;
  }
}
