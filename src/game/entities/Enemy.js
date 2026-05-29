import { ENEMY_TYPES } from "../constants.js";
import { normalize } from "../utils.js";

const ENEMY_STATS = {
  [ENEMY_TYPES.BASIC]: { hp: 24, speed: 85, radius: 18, contactDamage: 8, score: 1 },
  [ENEMY_TYPES.TANK]: { hp: 70, speed: 52, radius: 24, contactDamage: 14, score: 1 },
  [ENEMY_TYPES.PROJECTILE]: { hp: 32, speed: 65, radius: 20, contactDamage: 8, score: 1 },
  [ENEMY_TYPES.BOSS]: { hp: 220, speed: 38, radius: 34, contactDamage: 20, score: 2 }
};

export class Enemy {
  constructor(type, x, y, sprite) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.sprite = sprite;
    const stat = ENEMY_STATS[type];
    this.hp = stat.hp;
    this.maxHp = stat.hp;
    this.speed = stat.speed;
    this.radius = stat.radius;
    this.contactDamage = stat.contactDamage;
    this.scoreWeight = stat.score;
    this.shootTimer = 0;
    this.secondaryTimer = 0;
    this.aoeTimer = 0;
  }

  update(player, dt) {
    const dir = normalize(player.x - this.x, player.y - this.y);
    this.x += dir.x * this.speed * dt;
    this.y += dir.y * this.speed * dt;

    this.shootTimer = Math.max(0, this.shootTimer - dt);
    this.secondaryTimer = Math.max(0, this.secondaryTimer - dt);
    this.aoeTimer = Math.max(0, this.aoeTimer - dt);
  }

  takeDamage(amount) {
    this.hp -= amount;
  }

  get isDead() {
    return this.hp <= 0;
  }
}

export { ENEMY_STATS };
