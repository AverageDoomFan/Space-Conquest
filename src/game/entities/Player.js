import { PLAYER_MAX_HP } from "../constants.js";
import { clamp, normalize } from "../utils.js";

export class Player {
  constructor(x, y, sprite) {
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.baseSpeed = 220;
    this.hp = PLAYER_MAX_HP;
    this.maxHp = PLAYER_MAX_HP;
    this.sprite = sprite;
    this.shootCooldown = 0;
    this.upgrades = {
      projectiles: 0,
      speed: 0,
      rate: 0,
      rows: 0,
      verticalRows: 0,
      burst: 0,
      laser: 0,
      damage: 0
    };
    this.burstActive = false;
    this.burstTimer = 0;
    this.burstCooldown = 5;
  }

  get speed() {
    const cappedSpeedUpgrades = Math.min(this.upgrades.speed, 6);
    return this.baseSpeed + cappedSpeedUpgrades * 35;
  }

  get fireDelay() {
    let delay = Math.max(0.11, 0.38 - this.upgrades.rate * 0.03);
    // During burst, reduce fire delay by 60%
    if (this.burstActive) {
      delay *= 0.4;
    }
    return delay;
  }

  update(input, dt, worldW, worldH) {
    let dx = 0;
    let dy = 0;

    if (input.isPressed("z", "arrowup", "w")) dy -= 1;
    if (input.isPressed("s", "arrowdown")) dy += 1;
    if (input.isPressed("q", "arrowleft", "a")) dx -= 1;
    if (input.isPressed("d", "arrowright")) dx += 1;

    const dir = normalize(dx, dy);
    this.x = clamp(this.x + dir.x * this.speed * dt, this.radius, worldW - this.radius);
    this.y = clamp(this.y + dir.y * this.speed * dt, this.radius, worldH - this.radius);

    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    
    // Update burst state
    if (this.upgrades.burst > 0) {
      this.burstTimer += dt;
      if (this.burstTimer >= this.burstCooldown) {
        this.burstActive = true;
        this.burstTimer = 0;
      }
      if (this.burstActive && this.burstTimer >= 1) {
        this.burstActive = false;
      }
    }
  }

  canShoot() {
    return this.shootCooldown === 0;
  }

  onShoot() {
    this.shootCooldown = this.fireDelay;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }
}
