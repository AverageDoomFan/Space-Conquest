export class Projectile {
  constructor({ x, y, vx, vy, radius, damage, fromEnemy = false, damageMultiplier = 1, color = null, isLaser = false, type = "normal", bounces = 0, piercesLeft = 0, isCritical = false, doTDamage = 0, doTDuration = 0, chainLevel = 0, stunLevel = 0 }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage * damageMultiplier;
    this.fromEnemy = fromEnemy;
    this.color = color;
    this.isLaser = isLaser;
    this.type = type; // "normal", "plasma", "bomb", "dispel", "arc", "headhunter", "random"
    this.bounces = bounces; // Number of bounces left for bounce projectiles
    this.piercesLeft = piercesLeft; // Number of enemies to pierce through
    this.isCritical = isCritical; // Whether this is a critical hit
    this.doTDamage = doTDamage; // Damage over time (for plasma and aura)
    this.doTDuration = doTDuration; // Duration of DoT effect
    this.targetEnemy = null; // For headhunter projectiles
    this.chainLevel = chainLevel; // For chain upgrade
    this.stunLevel = stunLevel; // For stun upgrade
    this.targetSearchTimer = 0; // Optimize headhunter searches (search every 0.1s instead of every frame)
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Update target search timer for headhunter optimization
    if (this.type === "headhunter" && this.targetSearchTimer > 0) {
      this.targetSearchTimer -= dt;
    }
  }
}
