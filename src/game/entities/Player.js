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
      damage: 0,
      aura: 0,
      size: 0,
      random: 0,
      plasma: 0,
      bomb: 0,
      dispel: 0,
      arc: 0,
      headhunter: 0,
      bounce: 0,
      pierce: 0,
      criticalRate: 0,
      criticalDamage: 0,
      chain: 0,
      hpRegen: 0,
      damageBurst: 0,
      stun: 0,
      energyShield: 0,
      evasion: 0,
      supernova: 0
    };
    this.permanentUpgrades = []; // Upgrades that never reset
    this.temporaryUpgrades = [];
    this.burstActive = false;
    this.burstTimer = 0;
    this.burstCooldown = 5;
    
    // HP Regen tracking
    this.hpRegenTimer = 0;
    
    // Damage Burst tracking
    this.damageBurstActive = false;
    this.damageBurstTimer = 0;
    this.damageBurstCooldown = 8;
    this.damageBurstDuration = 2;
    
    // Supernova tracking
    this.supernovaTimer = 0;
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

  getDamageMultiplier() {
    // Damage burst adds +2 damage (use as color multiplier)
    if (this.damageBurstActive) {
      return 1 + (2 / 5); // Add 0.4x (representing +2 damage on 5x max)
    }
    return 1;
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
    
    // Update damage burst state
    if (this.upgrades.damageBurst > 0) {
      this.damageBurstTimer += dt;
      if (this.damageBurstTimer >= this.damageBurstCooldown) {
        this.damageBurstActive = true;
        this.damageBurstTimer = 0;
      }
      if (this.damageBurstActive && this.damageBurstTimer >= this.damageBurstDuration) {
        this.damageBurstActive = false;
      }
    }
    
    // Update HP regen
    if (this.upgrades.hpRegen > 0) {
      this.hpRegenTimer += dt;
      const regenRate = 0.5 + this.upgrades.hpRegen * 0.2; // Regen interval in seconds
      if (this.hpRegenTimer >= regenRate) {
        const regenAmount = 2 + this.upgrades.hpRegen * 1.5;
        this.hp = Math.min(this.maxHp, this.hp + regenAmount);
        this.hpRegenTimer = 0;
      }
    }
    
    // Update supernova timer
    if (this.upgrades.supernova > 0) {
      this.supernovaTimer += dt;
    }

    for (let i = this.temporaryUpgrades.length - 1; i >= 0; i -= 1) {
      const tempUpgrade = this.temporaryUpgrades[i];
      tempUpgrade.remaining -= dt;
      if (tempUpgrade.remaining <= 0) {
        this.upgrades[tempUpgrade.key] = Math.max(0, this.upgrades[tempUpgrade.key] - tempUpgrade.amount);
        this.temporaryUpgrades.splice(i, 1);
      }
    }
  }

  canShoot() {
    return this.shootCooldown === 0;
  }

  onShoot() {
    this.shootCooldown = this.fireDelay;
  }

  applyTemporaryUpgrade(key, amount, duration) {
    this.upgrades[key] += amount;
    this.temporaryUpgrades.push({ key, amount, remaining: duration });
  }

  takeDamage(amount) {
    // Check evasion upgrade
    if (this.upgrades.evasion > 0) {
      const evasionChance = 0.05 * this.upgrades.evasion; // 5% per upgrade
      if (Math.random() < evasionChance) {
        return; // Evaded the damage
      }
    }
    
    // Apply energy shield reduction
    if (this.upgrades.energyShield > 0) {
      const shieldReduction = 0.1 + this.upgrades.energyShield * 0.08; // 10% + 8% per upgrade (max ~70%)
      amount *= (1 - shieldReduction);
    }
    
    this.hp = Math.max(0, this.hp - amount);
  }
}
