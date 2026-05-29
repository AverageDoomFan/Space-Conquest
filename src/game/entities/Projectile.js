export class Projectile {
  constructor({ x, y, vx, vy, radius, damage, fromEnemy = false, damageMultiplier = 1, color = null, isLaser = false }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage * damageMultiplier;
    this.fromEnemy = fromEnemy;
    this.color = color;
    this.isLaser = isLaser;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}
