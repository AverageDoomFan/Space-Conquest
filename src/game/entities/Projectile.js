export class Projectile {
  constructor({ x, y, vx, vy, radius, damage, fromEnemy = false }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.fromEnemy = fromEnemy;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}
