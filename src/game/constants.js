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
  CRITICAL_DAMAGE: "criticalDamage",
  CHAIN: "chain",
  HP_REGEN: "hpRegen",
  DAMAGE_BURST: "damageBurst",
  STUN: "stun",
  ENERGY_SHIELD: "energyShield",
  EVASION: "evasion",
  SUPERNOVA: "supernova"
};

export const RARITY_TYPES = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
  MYTHIC: "mythic"
};

export const RARITY_INFO = {
  [RARITY_TYPES.COMMON]: { label: "Common", color: "#8b8f98", value: 0.1 },
  [RARITY_TYPES.UNCOMMON]: { label: "Uncommon", color: "#49d16d", value: 0.2 },
  [RARITY_TYPES.RARE]: { label: "Rare", color: "#4da3ff", value: 0.5 },
  [RARITY_TYPES.EPIC]: { label: "Epic", color: "#ff66d9", value: 0.7 },
  [RARITY_TYPES.LEGENDARY]: { label: "Legendary", color: "#ffd84d", value: 1 },
  [RARITY_TYPES.MYTHIC]: { label: "Mythic", color: "#ff4d4d", value: 1.5 }
};

export const RARITY_WEIGHTS = {
  [RARITY_TYPES.COMMON]: 45,
  [RARITY_TYPES.UNCOMMON]: 25,
  [RARITY_TYPES.RARE]: 15,
  [RARITY_TYPES.EPIC]: 8,
  [RARITY_TYPES.LEGENDARY]: 5,
  [RARITY_TYPES.MYTHIC]: 2
};

export const UPGRADE_INFO = {
  [UPGRADE_TYPES.PROJECTILES]: { name: "Projectiles", acronym: "PR", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.SPEED]: { name: "Speed", acronym: "SP", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.RATE]: { name: "Rate", acronym: "FR", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.ROWS]: { name: "Rows", acronym: "RW", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.VERTICAL_ROWS]: { name: "V-Rows", acronym: "VR", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.BURST]: { name: "Burst", acronym: "BU", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.LASER]: { name: "Laser", acronym: "LA", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.DAMAGE]: { name: "Damage", acronym: "DM", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.AURA]: { name: "Aura", acronym: "AU", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.SIZE]: { name: "Size", acronym: "SZ", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.RANDOM]: { name: "Random", acronym: "RN", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.PLASMA]: { name: "Plasma", acronym: "PL", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.BOMB]: { name: "Bomb", acronym: "BB", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.DISPEL]: { name: "Dispel", acronym: "DS", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.ARC]: { name: "Arc", acronym: "AR", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.HEADHUNTER]: { name: "Headhunter", acronym: "HH", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.BOUNCE]: { name: "Bounce", acronym: "BC", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.PIERCE]: { name: "Pierce", acronym: "PI", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.CRITICAL_RATE]: { name: "Crit Rate", acronym: "CR", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.CRITICAL_DAMAGE]: { name: "Crit Dmg", acronym: "CD", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.CHAIN]: { name: "Chain", acronym: "CH", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.HP_REGEN]: { name: "HP Regen", acronym: "HR", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.DAMAGE_BURST]: { name: "Dmg Burst", acronym: "DB", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.STUN]: { name: "Stun", acronym: "ST", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.ENERGY_SHIELD]: { name: "Energy Shield", acronym: "ES", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.EVASION]: { name: "Evasion", acronym: "EV", rarity: RARITY_TYPES.LEGENDARY },
  [UPGRADE_TYPES.SUPERNOVA]: { name: "Supernova", acronym: "SN", rarity: RARITY_TYPES.LEGENDARY }
};

// Rock respawn time in seconds
export const ROCK_RESPAWN_TIME = 8;
// XP required to trigger ship upgrade (scales with each milestone)
export const BASE_XP_FOR_UPGRADE = 100;
export const XP_MILESTONE_GROWTH = 1.35;

export const SPRITES = {
  player: "Ressources/Sprites/ship.png",
  basic: "Ressources/Sprites/basic-monster.png",
  tank: "Ressources/Sprites/tank-monster.png",
  projectile: "Ressources/Sprites/projectile-monster.png",
  boss: "Ressources/Sprites/boss-monster.png",
  rock: "Ressources/Sprites/rock.png"
};
