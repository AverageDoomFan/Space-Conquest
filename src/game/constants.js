export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 640;
export const WAVE_INTERVAL_MS = 20000;
export const PLAYER_MAX_HP = 100;
export const MAX_SPEED_UPGRADES = 6;

export const ENEMY_TYPES = {
  BASIC: "basic",
  TANK: "tank",
  PROJECTILE: "projectile",
  BOSS: "boss"
};

export const UPGRADE_TYPES = {
  PROJECTILES: "projectiles",
  SPEED: "speed",
  RATE: "rate",
  ROWS: "rows",
  VERTICAL_ROWS: "verticalRows",
  BURST: "burst",
  LASER: "laser",
  DAMAGE: "damage",
  AURA: "aura",
  SIZE: "size",
  RANDOM: "random",
  PLASMA: "plasma",
  BOMB: "bomb",
  DISPEL: "dispel",
  ARC: "arc",
  HEADHUNTER: "headhunter",
  BOUNCE: "bounce",
  PIERCE: "pierce",
  CRITICAL_RATE: "criticalRate",
  CRITICAL_DAMAGE: "criticalDamage"
};

// Rock respawn time in seconds
export const ROCK_RESPAWN_TIME = 8;
// Max upgrades before ship upgrade reset
export const MAX_UPGRADES_BEFORE_RESET = 50;
// Permanent upgrades that never reset
export const PERMANENT_UPGRADE_COUNT = 3;

export const SPRITES = {
  player: "Ressources/Sprites/ship.png",
  basic: "Ressources/Sprites/basic-monster.png",
  tank: "Ressources/Sprites/tank-monster.png",
  projectile: "Ressources/Sprites/projectile-monster.png",
  boss: "Ressources/Sprites/boss-monster.png",
  rock: "Ressources/Sprites/rock.png"
};
