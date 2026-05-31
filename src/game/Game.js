import { Cube } from "./entities/Cube.js";
import { Enemy } from "./entities/Enemy.js";
import { HPBox } from "./entities/HPBox.js";
import { Player } from "./entities/Player.js";
import { Projectile } from "./entities/Projectile.js";
import { Rock } from "./entities/Rock.js";
import { FloatingText } from "./entities/FloatingText.js";
import { Supernova } from "./entities/Supernova.js";
import { Input } from "./systems/Input.js";
import { ENEMY_TYPES, GAME_HEIGHT, GAME_WIDTH, SPRITES, UPGRADE_TYPES, UPGRADE_INFO, RARITY_INFO, RARITY_TYPES, RARITY_WEIGHTS, WAVE_INTERVAL_MS, MAX_SPEED_UPGRADES, ROCK_RESPAWN_TIME, BASE_XP_FOR_UPGRADE, XP_MILESTONE_GROWTH } from "./constants.js";
import { circleHit, loadSprite, normalize, randomCorner, randomSide } from "./utils.js";

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;

    this.ui = ui;
    this.input = new Input();

    this.sprites = {
      player: loadSprite(SPRITES.player),
      [ENEMY_TYPES.BASIC]: loadSprite(SPRITES.basic),
      [ENEMY_TYPES.TANK]: loadSprite(SPRITES.tank),
      [ENEMY_TYPES.PROJECTILE]: loadSprite(SPRITES.projectile),
      [ENEMY_TYPES.BOSS]: loadSprite(SPRITES.boss),
      rock: loadSprite(SPRITES.rock)
    };

    this.running = false;
    this.lastFrame = 0;
    this.waveTimer = 0;
    this.wavesSurvived = 0;
    this.lastDifficultyWave = 0;
    this.paused = false;
    this.pausedForUpgradeSelection = false;
    this.selectedShip = null;
    this.milestonesCompleted = 0;
    this.currentXP = 0;
    this.xpForNextMilestone = BASE_XP_FOR_UPGRADE;

    this.reset();
  }

  getUpgradeInfo(upgradeKey) {
    return UPGRADE_INFO[upgradeKey] || {
      name: upgradeKey,
      acronym: upgradeKey.slice(0, 2).toUpperCase(),
      rarity: RARITY_TYPES.LEGENDARY
    };
  }

  getRarityInfo(rarity) {
    return RARITY_INFO[rarity] || RARITY_INFO[RARITY_TYPES.LEGENDARY];
  }

  rollRarity() {
    const totalWeight = Object.values(RARITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * totalWeight;
    for (const rarity of Object.keys(RARITY_WEIGHTS)) {
      roll -= RARITY_WEIGHTS[rarity];
      if (roll <= 0) {
        return rarity;
      }
    }
    return RARITY_TYPES.LEGENDARY;
  }

  formatUpgradeValue(value) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "");
  }

  buildUpgradeChoice(upgradeKey) {
    const upgradeInfo = this.getUpgradeInfo(upgradeKey);
    const currentValue = this.player.upgrades[upgradeKey] || 0;
    const rarity = this.rollRarity();
    const rarityInfo = this.getRarityInfo(rarity);
    const amount = rarityInfo.value;
    return {
      key: upgradeKey,
      name: upgradeInfo.name,
      acronym: upgradeInfo.acronym,
      rarity,
      rarityColor: rarityInfo.color,
      amount,
      currentValue,
      nextValue: currentValue + amount,
      displayCurrent: this.formatUpgradeValue(currentValue),
      displayNext: this.formatUpgradeValue(currentValue + amount),
      displayAmount: this.formatUpgradeValue(amount)
    };
  }

  getWholeUpgradeCount(value) {
    const whole = Math.max(0, Math.floor(value));
    const fractional = Math.max(0, value - whole);
    return whole + (Math.random() < fractional ? 1 : 0);
  }

  findNearestEnemy(x, y) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const enemy of this.enemies) {
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  pickUniqueUpgrades(count, exclude = []) {
    const pool = Object.keys(this.player.upgrades).filter((upgradeKey) => !exclude.includes(upgradeKey));
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }

  getFloorUpgradePickText(upgradeKey, amount) {
    const upgradeInfo = this.getUpgradeInfo(upgradeKey);
    return `+${this.formatUpgradeValue(amount)} ${upgradeInfo.acronym}`;
  }

  reset() {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.sprites.player);
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.rocks = [];
    this.cubes = [];
    this.hpBoxes = [];
    this.floatingTexts = [];
    this.supernovas = [];
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.aoeRing = null;
    this.currentXP = 0;
    this.xpForNextMilestone = BASE_XP_FOR_UPGRADE;
    this.milestonesCompleted = 0;
    this.paused = false;
    this.pausedForUpgradeSelection = false;

    for (let i = 0; i < 6; i += 1) {
      this.spawnRock();
    }
    this.spawnWave();
    this.updateUI();
  }

  start(ship) {
    this.reset();
    this.selectedShip = ship;
    
    // Apply ship bonus at start
    if (ship && ship.bonus) {
      const bonusKey = ship.bonus;
      if (bonusKey in this.player.upgrades) {
        // Apply as permanent upgrade
        this.player.upgrades[bonusKey] = (this.player.upgrades[bonusKey] || 0) + ship.bonusValue;
        if (!this.player.permanentUpgrades.includes(bonusKey)) {
          this.player.permanentUpgrades.push(bonusKey);
        }
      }
    }
    
    this.running = true;
    this.lastFrame = performance.now();
    this.input.mount();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    this.input.unmount();
  }

  loop = (now) => {
    if (!this.running) return;
    const dt = Math.min(0.033, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    // Handle pause toggle (only on key press, not hold)
    if (this.input.wasJustPressed("escape")) {
      this.paused = !this.paused;
      if (this.ui && typeof this.ui.setPaused === 'function') {
        this.ui.setPaused(this.paused);
      }
    }

    if (!this.paused) {
      this.update(dt);
    }
    
    this.render();

    if (this.player.hp <= 0) {
      this.stop();
      this.ui.onGameOver(this.wavesSurvived);
      return;
    }

    // Update input state tracking for next frame
    this.input.updatePreviousState();

    requestAnimationFrame(this.loop);
  };

  update(dt) {
    this.waveTimer += dt * 1000;
    if (this.waveTimer >= WAVE_INTERVAL_MS) {
      this.waveTimer = 0;
      this.spawnWave();
    }

    // Spawn new wave if all enemies are dead
    if (this.enemies.length === 0 && this.waveIndex > 0) {
      this.waveTimer = 0;
      this.spawnWave();
    }

    this.player.update(this.input, dt, this.canvas.width, this.canvas.height);

    if (this.input.isPressed(" ", "spacebar") && this.player.canShoot()) {
      this.shootPlayerProjectiles();
      this.player.onShoot();
    }

    // Spawn supernovas periodically if upgrade is active
    if (this.player.upgrades.supernova > 0) {
      const supernovaCooldown = 8 - this.player.upgrades.supernova * 0.8; // 8s base, -0.8s per upgrade
      if (this.player.supernovaTimer >= supernovaCooldown) {
        const supernova = new Supernova(
          this.player.x + (Math.random() - 0.5) * 100,
          this.player.y + (Math.random() - 0.5) * 100,
          this.player.upgrades.supernova
        );
        this.supernovas.push(supernova);
        this.player.supernovaTimer = 0;
      }
    }

    // Update and manage supernovas
    for (let i = this.supernovas.length - 1; i >= 0; i--) {
      const supernova = this.supernovas[i];
      supernova.update(dt);
      
      if (supernova.isDead) {
        this.supernovas.splice(i, 1);
        continue;
      }
      
      // Supernova damage and drag to enemies
      if (supernova.shouldDamage()) {
        for (const enemy of this.enemies) {
          const dist = Math.hypot(enemy.x - supernova.x, enemy.y - supernova.y);
          if (dist < supernova.radius) {
            // Deal damage
            const supernovaDamage = 15 + this.player.upgrades.supernova * 5;
            enemy.takeDamage(supernovaDamage);
            
            // Pull enemy towards supernova
            const pullStrength = 120 + this.player.upgrades.supernova * 40;
            const dir = normalize(supernova.x - enemy.x, supernova.y - enemy.y);
            enemy.x += dir.x * pullStrength * dt;
            enemy.y += dir.y * pullStrength * dt;
          }
        }
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(this.player, dt);
      this.maybeEnemyAttack(enemy);

      if (circleHit(enemy, this.player)) {
        this.player.takeDamage(enemy.contactDamage * dt);
      }
      
      // Apply aura damage if player has aura upgrade
      if (this.player.upgrades.aura > 0) {
        const auraRadius = 40 + this.player.upgrades.aura * 15;
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < auraRadius) {
          // Apply initial aura DoT if not already active
          if (enemy.auraDotDuration <= 0) {
            enemy.auraDotDuration = 3 + this.player.upgrades.aura * 0.5; // 3-5.5 second duration
          } else {
            enemy.auraDotDuration = 3 + this.player.upgrades.aura * 0.5; // Refresh duration on re-entry
          }
          
          // Tick aura damage
          enemy.auraDotTickTimer += dt;
          const auraDotDamagePerTick = 2 + this.player.upgrades.aura * 1.5;
          if (enemy.auraDotTickTimer >= 0.2) { // Tick every 0.2 seconds
            enemy.takeDamage(auraDotDamagePerTick);
            enemy.auraDotTickTimer = 0;
          }
        }
      }
    }

    for (const rock of this.rocks) {
      rock.update(dt);
      if (rock.canDamagePlayer && circleHit(rock, this.player)) {
        this.player.takeDamage(6 * dt);
      }
    }

    for (const cube of this.cubes) {
      cube.update(dt);
      if (cube.isDead) {
        cube.picked = true;
        continue;
      }

      if (circleHit(cube, this.player)) {
        const upgradeInfo = this.getUpgradeInfo(cube.type);
        const rarityInfo = this.getRarityInfo(cube.rarity);
        const upgradeAmount = rarityInfo.value;

        this.player.applyTemporaryUpgrade(cube.type, upgradeAmount, 15);

        // Show floating text for pickup using the short upgrade acronym and rarity color
        this.floatingTexts.push(new FloatingText(cube.x, cube.y - 20, `+${this.formatUpgradeValue(upgradeAmount)} ${upgradeInfo.acronym}`, rarityInfo.color));

        // Increment XP for upgrade pickup
        this.currentXP += upgradeAmount;
        
        // Check for ship upgrade milestone based on XP
        if (this.currentXP >= this.xpForNextMilestone) {
          this.currentXP = 0;
          this.milestonesCompleted += 1;
          
          // Calculate next milestone XP requirement with a much steeper scaling curve
          this.xpForNextMilestone = Math.ceil(BASE_XP_FOR_UPGRADE * Math.pow(XP_MILESTONE_GROWTH, this.milestonesCompleted));
          
          if (this.ui && typeof this.ui.showNotification === 'function') {
            this.ui.showNotification("XP BONUS UNLOCKED");
          }
          
          // Increase maxhp by 50
          this.player.maxHp += 50;
          this.player.hp = this.player.maxHp;
          
          // Show permanent XP bonus selection instead of resetting stats
          this.showMilestoneUpgradeSelection();
        }
        
        // Update XP bar in UI
        if (this.ui && typeof this.ui.updateXP === 'function') {
          this.ui.updateXP(this.currentXP, this.xpForNextMilestone);
        }
        
        cube.picked = true;
      }
    }
    this.cubes = this.cubes.filter((cube) => !cube.picked && !cube.isDead);

    for (const hpBox of this.hpBoxes) {
      hpBox.update(dt);
      if (circleHit(hpBox, this.player)) {
        const hpHeal = Math.round(this.player.maxHp * 0.25); // 25% of max HP
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + hpHeal);
        this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 30, `+${hpHeal} HP`, "#ff6b6b"));
        hpBox.picked = true;
      }
    }
    this.hpBoxes = this.hpBoxes.filter((hpBox) => !hpBox.picked);

    this.updateProjectiles(this.playerProjectiles, dt);
    this.updateProjectiles(this.enemyProjectiles, dt);
    this.resolveProjectileHits();

    // Handle rock respawning
    for (const rock of this.rocks) {
      if (rock.isDestroyed) {
        rock.timeSinceDestroyed += dt;
        if (rock.timeSinceDestroyed >= ROCK_RESPAWN_TIME) {
          rock.resetForRespawn();
          rock.timeSinceDestroyed = 0;
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => !enemy.isDead);
    this.aoeRing = this.aoeRing && this.aoeRing.ttl > 0 ? { ...this.aoeRing, ttl: this.aoeRing.ttl - dt } : null;

    // Update and filter floating texts
    for (const text of this.floatingTexts) {
      text.update(dt);
    }
    this.floatingTexts = this.floatingTexts.filter((text) => !text.isDone);

    this.updateUI();
  }

  updateProjectiles(list, dt) {
    for (const projectile of list) {
      projectile.update(dt);
    }

    const { width, height } = this.canvas;
    const margin = 20;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const p = list[i];
      if (p.x < -margin || p.y < -margin || p.x > width + margin || p.y > height + margin || p.dead) {
        list.splice(i, 1);
      }
    }
  }

  resolveProjectileHits() {
    for (const projectile of this.playerProjectiles) {
      // Update headhunter targeting (only search every 0.1s to optimize)
      if (projectile.type === "headhunter") {
        const liveTarget = projectile.targetEnemy && !projectile.targetEnemy.isDead ? projectile.targetEnemy : null;
        if (!liveTarget || projectile.targetSearchTimer <= 0) {
          const nextTarget = this.findNearestEnemy(projectile.x, projectile.y);
          if (nextTarget) {
            projectile.targetEnemy = nextTarget;
            const dir = normalize(nextTarget.x - projectile.x, nextTarget.y - projectile.y);
            const speed = Math.max(240, Math.hypot(projectile.vx, projectile.vy) || 0);
            if (dir.x !== 0 || dir.y !== 0) {
              projectile.vx = dir.x * speed;
              projectile.vy = dir.y * speed;
            }
          } else if (!projectile.vx && !projectile.vy) {
            projectile.vy = -300;
          }

          projectile.targetSearchTimer = 0.1;
        }

        if (projectile.targetEnemy && projectile.targetEnemy.isDead) {
          projectile.targetEnemy = null;
        }
      }
      
      // Handle dispel projectiles removing enemy projectiles
      if (projectile.type === "dispel") {
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
          const enemyProj = this.enemyProjectiles[i];
          if (circleHit(projectile, enemyProj)) {
            this.enemyProjectiles.splice(i, 1);
          }
        }
      }
      
      // Player projectile vs enemies
      for (const enemy of this.enemies) {
        if (!projectile.dead && circleHit(projectile, enemy)) {
          let damage = projectile.damage;
          
          // Handle pierce
          if (projectile.piercesLeft > 0) {
            projectile.piercesLeft--;
            enemy.takeDamage(damage);
            
            // If also has bounce, duplicate the projectile
            if (projectile.bounces > 0) {
              const newProj = new Projectile({
                x: projectile.x,
                y: projectile.y,
                vx: -projectile.vx * 0.9,
                vy: projectile.vy,
                radius: projectile.radius,
                damage: projectile.damage * 0.5,
                type: projectile.type,
                bounces: projectile.bounces - 1,
                piercesLeft: projectile.piercesLeft,
                isCritical: projectile.isCritical,
                chainLevel: projectile.chainLevel,
                stunLevel: projectile.stunLevel
              });
              this.playerProjectiles.push(newProj);
            }
          } else if (projectile.bounces > 0) {
            // Handle bounce without pierce
            projectile.bounces--;
            projectile.damage *= 0.5; // 50% damage reduction per bounce
            projectile.vx *= -0.9;
            projectile.vy *= 0.9;
            enemy.takeDamage(damage);
          } else {
            // Normal hit
            enemy.takeDamage(damage);
            
            // Handle special weapon effects
            if (projectile.type === "bomb") {
              // Bomb explosion - damage nearby enemies
              for (const otherEnemy of this.enemies) {
                const dist = Math.hypot(otherEnemy.x - projectile.x, otherEnemy.y - projectile.y);
                if (dist < 80 && otherEnemy !== enemy) {
                  otherEnemy.takeDamage(damage * 0.7);
                }
              }
            }
            
            projectile.dead = true;
          }
          
          // Apply chain damage - damage neighbors if chain upgrade is active
          if (projectile.chainLevel > 0) {
            const chainRange = 80 + projectile.chainLevel * 40; // Range increases with upgrade
            for (const otherEnemy of this.enemies) {
              const dist = Math.hypot(otherEnemy.x - enemy.x, otherEnemy.y - enemy.y);
              if (dist < chainRange && otherEnemy !== enemy) {
                otherEnemy.takeDamage(damage * 0.6);
              }
            }
          }
          
          // Apply stun if stun upgrade is active
          if (projectile.stunLevel > 0) {
            const stunDuration = 0.3 + projectile.stunLevel * 0.2; // 0.3s + 0.2s per upgrade
            enemy.applyStun(stunDuration);
          }
          
          // Drop loot (adjusted rates based on enemy type)
          if (enemy.isDead) {
            const isBoss = enemy.type === ENEMY_TYPES.BOSS;
            const cubeDrop = isBoss ? 0.6 : 0.12; // Bosses: 60%, Mobs: 12%
            const hpDrop = isBoss ? 0.35 : 0.05; // Bosses: 35%, Mobs: 5%
            
            if (Math.random() < cubeDrop) {
              this.spawnCube(enemy.x, enemy.y);
            }
            if (Math.random() < hpDrop) {
              this.spawnHPBox(enemy.x, enemy.y);
            }
          }
        }
      }
      
      // Player projectile vs rocks
      for (const rock of this.rocks) {
        if (!projectile.dead && circleHit(projectile, rock)) {
          rock.hit();
          
          if (!projectile.bounces || projectile.piercesLeft > 0) {
            if (projectile.piercesLeft > 0) {
              projectile.piercesLeft--;
            } else {
              projectile.dead = true;
            }
          } else if (projectile.bounces > 0) {
            projectile.bounces--;
            projectile.damage *= 0.5;
            projectile.vx *= -0.9;
            projectile.vy *= 0.9;
          } else {
            projectile.dead = true;
          }
        }
      }
    }

    // Enemy projectiles vs player and rocks
    for (const projectile of this.enemyProjectiles) {
      if (!projectile.dead && circleHit(projectile, this.player)) {
        // Player aura protection against enemy projectiles
        if (this.player.upgrades.aura > 0) {
          const auraRadius = 40 + this.player.upgrades.aura * 15;
          const dist = Math.hypot(this.player.x - projectile.x, this.player.y - projectile.y);
          if (dist < auraRadius) {
            projectile.dead = true;
          } else {
            this.player.takeDamage(projectile.damage);
            projectile.dead = true;
          }
        } else {
          this.player.takeDamage(projectile.damage);
          projectile.dead = true;
        }
      }
      
      for (const rock of this.rocks) {
        if (!projectile.dead && circleHit(projectile, rock)) {
          rock.hit();
          projectile.dead = true;
        }
      }
    }
  }

  shootPlayerProjectiles() {
    const horizontalRows = 1 + this.getWholeUpgradeCount(this.player.upgrades.rows);
    const verticalRows = 1 + this.getWholeUpgradeCount(this.player.upgrades.verticalRows);
    const count = 1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles);
    const burstMultiplier = this.player.burstActive ? 2 : 1;
    const finalCount = Math.floor(count * burstMultiplier);
    
    const totalSpread = Math.min(1.2, 0.1 * (finalCount - 1));
    const speed = 390 + this.player.upgrades.speed * 45;
    
    // Calculate damage multiplier based on ship upgrades
    const shipUpgradeCount = this.milestonesCompleted;
    const damageMultiplier = 1 + shipUpgradeCount * 2;
    
    // Calculate projectile damage penalty (7% reduction per upgrade, resets on ship upgrade)
    const projectileDamagePenalty = Math.pow(0.93, this.player.upgrades.projectiles);
    
    // Get damage color based on damage upgrade
    const damageUpgrades = [1, 1.2, 1.5, 2, 3, 5];
    const damageTier = Math.min(this.getWholeUpgradeCount(this.player.upgrades.damage), damageUpgrades.length - 1);
    const damageScale = damageUpgrades[damageTier];
    const damageColors = ["#66c2ff", "#ffdd61", "#ff9d3d", "#ff5b5b", "#d946ef", "#ffffff"];
    const projectileColor = damageColors[damageTier];
    
    // Size upgrade
    const baseBulletRadius = 5 + this.player.upgrades.size * 1.5;
    
    // Critical strike chance and damage
    const criticalRate = 0.05 * this.player.upgrades.criticalRate; // 5% per upgrade
    const criticalDamage = 1.5 + 0.5 * this.player.upgrades.criticalDamage; // 1.5x base + 0.5x per upgrade
    
    // Helper function to check critical hit
    const isCriticalHit = () => Math.random() < criticalRate;
    const getCriticalMultiplier = () => isCriticalHit() ? criticalDamage : 1;
    
    // Helper function to create a projectile with all attributes
    const createProjectile = (x, y, vx, vy, radius, baseDamage, type = "normal", bounces = 0, piercesLeft = 0, chainLevel = 0, stunLevel = 0) => {
      const critical = isCriticalHit();
      const critMult = critical ? criticalDamage : 1;
      return new Projectile({
        x, y, vx, vy, radius,
        damage: baseDamage * damageScale * projectileDamagePenalty * critMult,
        damageMultiplier,
        color: projectileColor,
        type,
        bounces,
        piercesLeft,
        isCritical: critical,
        chainLevel,
        stunLevel
      });
    };
    
    // Basic projectiles with rows
    for (let row = 0; row < horizontalRows; row += 1) {
      const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
      
      for (let i = 0; i < finalCount; i += 1) {
        const ratio = finalCount === 1 ? 0.5 : i / (finalCount - 1);
        const angle = -Math.PI / 2 + (ratio - 0.5) * totalSpread;
        
        const piercesLeft = this.getWholeUpgradeCount(this.player.upgrades.pierce);
        const bounces = this.getWholeUpgradeCount(this.player.upgrades.bounce);
        
        this.playerProjectiles.push(
          createProjectile(
            this.player.x + rowOffset,
            this.player.y - this.player.radius,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            baseBulletRadius,
            14,
            "normal",
            bounces,
            piercesLeft,
            this.player.upgrades.chain,
            this.player.upgrades.stun
          )
        );
      }
    }
    
    // Vertical projectiles (both sides with reduced damage)
    for (let col = 0; col < verticalRows; col += 1) {
      const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
      
      // Left side
      for (let i = 0; i < finalCount; i += 1) {
        const ratio = finalCount === 1 ? 0.5 : i / (finalCount - 1);
        const angle = -3 * Math.PI / 4 + (ratio - 0.5) * totalSpread;
        
        const piercesLeft = this.getWholeUpgradeCount(this.player.upgrades.pierce);
        const bounces = this.getWholeUpgradeCount(this.player.upgrades.bounce);
        
        this.playerProjectiles.push(
          createProjectile(
            this.player.x - this.player.radius + colOffset,
            this.player.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            baseBulletRadius * 0.8,
            14 * 0.3,
            "normal",
              this.getWholeUpgradeCount(this.player.upgrades.bounce),
              this.getWholeUpgradeCount(this.player.upgrades.pierce),
            this.player.upgrades.chain,
            this.player.upgrades.stun
          )
        );
      }
      
      // Right side
      for (let i = 0; i < finalCount; i += 1) {
        const ratio = finalCount === 1 ? 0.5 : i / (finalCount - 1);
        const angle = -Math.PI / 4 + (ratio - 0.5) * totalSpread;
        
        const piercesLeft = this.getWholeUpgradeCount(this.player.upgrades.pierce);
        const bounces = this.getWholeUpgradeCount(this.player.upgrades.bounce);
        
        this.playerProjectiles.push(
          createProjectile(
            this.player.x + this.player.radius + colOffset,
            this.player.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            baseBulletRadius * 0.8,
            14 * 0.3,
            "normal",
            bounces,
            piercesLeft,
            this.player.upgrades.chain,
            this.player.upgrades.stun
          )
        );
      }
    }
    
    // Laser projectiles with rows
    for (let laserRow = 0; laserRow < horizontalRows; laserRow += 1) {
      const rowOffset = horizontalRows === 1 ? 0 : (laserRow - (horizontalRows - 1) / 2) * 40;
      
      const laserCount = this.getWholeUpgradeCount(this.player.upgrades.laser);
      for (let laser = 0; laser < laserCount; laser += 1) {
        const laserOffset = laserCount === 1 ? 0 : (laser - (laserCount - 1) / 2) * 35;
        this.playerProjectiles.push(
          new Projectile({
            x: this.player.x + rowOffset + laserOffset,
            y: this.player.y - this.player.radius,
            vx: Math.sin((rowOffset + laserOffset) / 50) * 100,
            vy: -500,
            radius: 8,
            damage: 50 * damageScale * projectileDamagePenalty * getCriticalMultiplier(),
            damageMultiplier,
            isLaser: true,
            color: "#ffff00",
            isCritical: isCriticalHit()
          })
        );
      }
    }
    
    // Random weapon - high rate, tiny projectiles affected by projectile upgrade and rows
    const randomCount = this.getWholeUpgradeCount(this.player.upgrades.random);
    if (randomCount > 0) {
      const randomProjectiles = 5 + randomCount * 3 + (1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles)) * 2;
      for (let i = 0; i < randomProjectiles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const randomSpeed = 250 + Math.random() * 150;
        
        // Horizontal rows
        for (let row = 0; row < horizontalRows; row++) {
          const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + rowOffset,
              this.player.y - this.player.radius,
              Math.cos(angle) * randomSpeed,
              Math.sin(angle) * randomSpeed,
              2 + this.player.upgrades.size * 0.5,
              3,
              "random",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const vAngle = Math.random() * Math.PI * 2;
          const vSpeed = 250 + Math.random() * 150;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + colOffset,
              this.player.y,
              Math.cos(vAngle) * vSpeed,
              Math.sin(vAngle) * vSpeed,
              2 + this.player.upgrades.size * 0.5,
              3 * 0.3,
              "random",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
      }
    }
    
    // Plasma weapon - big slow circles with DoT, affected by projectile upgrade
    const plasmaCount = this.getWholeUpgradeCount(this.player.upgrades.plasma);
    if (plasmaCount > 0) {
      const plasmaProjectileCount = 1 + plasmaCount + (1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles));
      for (let p = 0; p < plasmaProjectileCount; p++) {
        // Horizontal rows
        for (let row = 0; row < horizontalRows; row++) {
          const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
          const spread = plasmaCount === 1 ? 0 : (p - (plasmaCount - 1) / 2) * 0.3;
          const angle = -Math.PI / 2 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + rowOffset,
              this.player.y - this.player.radius,
              Math.cos(angle) * 150,
              Math.sin(angle) * 150,
              12 + this.player.upgrades.size * 2,
              8,
              "plasma",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows - LEFT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = plasmaCount === 1 ? 0 : (p - (plasmaCount - 1) / 2) * 0.3;
          const angle = -3 * Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x - this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 150,
              Math.sin(angle) * 150,
              (12 + this.player.upgrades.size * 2) * 0.8,
              8 * 0.3,
              "plasma",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows - RIGHT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = plasmaCount === 1 ? 0 : (p - (plasmaCount - 1) / 2) * 0.3;
          const angle = -Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 150,
              Math.sin(angle) * 150,
              (12 + this.player.upgrades.size * 2) * 0.8,
              8 * 0.3,
              "plasma",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
      }
    }
    
    // Bomb weapon - explodes on contact, affected by projectile upgrade
    const bombCount = this.getWholeUpgradeCount(this.player.upgrades.bomb);
    if (bombCount > 0) {
      const bombProjectileCount = 1 + bombCount + (1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles));
      for (let b = 0; b < bombProjectileCount; b++) {
        // Horizontal rows
        for (let row = 0; row < horizontalRows; row++) {
          const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
          const spread = bombCount === 1 ? 0 : (b - (bombCount - 1) / 2) * 0.2;
          const angle = -Math.PI / 2 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + rowOffset,
              this.player.y - this.player.radius,
              Math.cos(angle) * 200,
              Math.sin(angle) * 200,
              10 + this.player.upgrades.size * 1.5,
              15,
              "bomb",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows - LEFT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = bombCount === 1 ? 0 : (b - (bombCount - 1) / 2) * 0.2;
          const angle = -3 * Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x - this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 200,
              Math.sin(angle) * 200,
              (10 + this.player.upgrades.size * 1.5) * 0.8,
              15 * 0.3,
              "bomb",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows - RIGHT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = bombCount === 1 ? 0 : (b - (bombCount - 1) / 2) * 0.2;
          const angle = -Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 200,
              Math.sin(angle) * 200,
              (10 + this.player.upgrades.size * 1.5) * 0.8,
              15 * 0.3,
              "bomb",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
      }
    }
    
    // Dispel weapon - low damage/speed projectiles that dispel enemy projectiles, affected by projectile upgrade
    const dispelCount = this.getWholeUpgradeCount(this.player.upgrades.dispel);
    if (dispelCount > 0) {
      const dispelProjectileCount = 2 + dispelCount * 2 + (1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles));
      for (let d = 0; d < dispelProjectileCount; d++) {
        // Horizontal rows
        for (let row = 0; row < horizontalRows; row++) {
          const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
          const spread = (d - (dispelCount - 1) / 2) * (Math.PI / 12);
          const angle = -Math.PI / 2 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + rowOffset,
              this.player.y - this.player.radius,
              Math.cos(angle) * 100,
              Math.sin(angle) * 100,
              4,
              2,
              "dispel"
            )
          );
        }
        
        // Vertical rows - LEFT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = (d - (dispelCount - 1) / 2) * (Math.PI / 12);
          const angle = -3 * Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x - this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 100,
              Math.sin(angle) * 100,
              3.2,
              2 * 0.3,
              "dispel",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows - RIGHT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = (d - (dispelCount - 1) / 2) * (Math.PI / 12);
          const angle = -Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 100,
              Math.sin(angle) * 100,
              3.2,
              2 * 0.3,
              "dispel",
              0,
              0,
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
      }
    }
    
    // Arc weapon - projectiles in arc shape, affected by projectile upgrade
    const arcCount = this.getWholeUpgradeCount(this.player.upgrades.arc);
    if (arcCount > 0) {
      const arcProjectileCount = 1 + arcCount + (1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles));
      for (let a = 0; a < arcProjectileCount; a++) {
        // Horizontal rows
        for (let row = 0; row < horizontalRows; row++) {
          const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
          const spread = arcCount === 1 ? 0 : (a - (arcCount - 1) / 2) * 0.15;
          const angle = -Math.PI / 2 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + rowOffset,
              this.player.y - this.player.radius,
              Math.cos(angle) * 280,
              Math.sin(angle) * 280,
              6 + this.player.upgrades.size,
              12,
              "arc",
              this.getWholeUpgradeCount(this.player.upgrades.bounce),
              this.getWholeUpgradeCount(this.player.upgrades.pierce),
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
        
        // Vertical rows
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          const spread = arcCount === 1 ? 0 : (a - (arcCount - 1) / 2) * 0.15;
          const angle = -Math.PI / 4 + spread;
          
          this.playerProjectiles.push(
            createProjectile(
              this.player.x + this.player.radius + colOffset,
              this.player.y,
              Math.cos(angle) * 280,
              Math.sin(angle) * 280,
              (6 + this.player.upgrades.size) * 0.8,
              12 * 0.3,
              "arc",
              this.getWholeUpgradeCount(this.player.upgrades.bounce),
              this.getWholeUpgradeCount(this.player.upgrades.pierce),
              this.player.upgrades.chain,
              this.player.upgrades.stun
            )
          );
        }
      }
    }
    
    // Headhunter weapon - seeks enemies, affected by projectile upgrade
    const hunterCount = this.getWholeUpgradeCount(this.player.upgrades.headhunter);
    if (hunterCount > 0) {
      const hunterProjectileCount = 1 + hunterCount + (1 + this.getWholeUpgradeCount(this.player.upgrades.projectiles));
      for (let h = 0; h < hunterProjectileCount; h++) {
        // Horizontal rows
        for (let row = 0; row < horizontalRows; row++) {
          const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
          
          const proj = createProjectile(
            this.player.x + rowOffset,
            this.player.y - this.player.radius,
            0,
            -300,
            5 + this.player.upgrades.size * 0.8,
            10,
            "headhunter",
            this.getWholeUpgradeCount(this.player.upgrades.bounce),
            this.getWholeUpgradeCount(this.player.upgrades.pierce),
            this.player.upgrades.chain,
            this.player.upgrades.stun
          );
          
          // Find nearest enemy
          proj.targetEnemy = this.findNearestEnemy(proj.x, proj.y);
          this.playerProjectiles.push(proj);
        }
        
        // Vertical rows - LEFT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          
          const proj = createProjectile(
            this.player.x - this.player.radius + colOffset,
            this.player.y,
            300,
            0,
            4 + this.player.upgrades.size * 0.64,
            10 * 0.3,
            "headhunter",
            this.getWholeUpgradeCount(this.player.upgrades.bounce),
            this.getWholeUpgradeCount(this.player.upgrades.pierce),
            this.player.upgrades.chain,
            this.player.upgrades.stun
          );
          
          // Find nearest enemy
          proj.targetEnemy = this.findNearestEnemy(proj.x, proj.y);
          this.playerProjectiles.push(proj);
        }
        
        // Vertical rows - RIGHT side
        for (let col = 0; col < verticalRows; col++) {
          const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
          
          const proj = createProjectile(
            this.player.x + this.player.radius + colOffset,
            this.player.y,
            -300,
            0,
            4 + this.player.upgrades.size * 0.64,
            10 * 0.3,
            "headhunter",
            this.getWholeUpgradeCount(this.player.upgrades.bounce),
            this.getWholeUpgradeCount(this.player.upgrades.pierce),
            this.player.upgrades.chain,
            this.player.upgrades.stun
          );
          
          // Find nearest enemy
          proj.targetEnemy = this.findNearestEnemy(proj.x, proj.y);
          this.playerProjectiles.push(proj);
        }
      }
    }
  }

  maybeEnemyAttack(enemy) {
    const dir = normalize(this.player.x - enemy.x, this.player.y - enemy.y);

    if (enemy.type === ENEMY_TYPES.PROJECTILE && enemy.shootTimer <= 0) {
      enemy.shootTimer = 1.4;
      this.enemyProjectiles.push(
        new Projectile({
          x: enemy.x,
          y: enemy.y,
          vx: dir.x * 220,
          vy: dir.y * 220,
          radius: 6,
          damage: 9,
          fromEnemy: true
        })
      );
    }

    if (enemy.type === ENEMY_TYPES.BOSS) {
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = 2.1;
        for (let i = 0; i < 8; i += 1) {
          const angle = (Math.PI * 2 * i) / 8;
          this.enemyProjectiles.push(
            new Projectile({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 160,
              vy: Math.sin(angle) * 160,
              radius: 7,
              damage: 8,
              fromEnemy: true
            })
          );
        }
      }

      if (enemy.secondaryTimer <= 0) {
        enemy.secondaryTimer = 1.6;
        const spread = [-0.25, 0, 0.25];
        for (const offset of spread) {
          const angle = Math.atan2(dir.y, dir.x) + offset;
          this.enemyProjectiles.push(
            new Projectile({
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 250,
              vy: Math.sin(angle) * 250,
              radius: 6,
              damage: 10,
              fromEnemy: true
            })
          );
        }
      }

      if (enemy.aoeTimer <= 0) {
        enemy.aoeTimer = 3.8;
        const aoeRadius = 85;
        this.aoeRing = { x: enemy.x, y: enemy.y, radius: aoeRadius, ttl: 0.25 };
        if (Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) <= aoeRadius + this.player.radius) {
          this.player.takeDamage(12);
        }
      }
    }
  }

  spawnWave() {
    this.waveIndex += 1;
    this.wavesSurvived = this.waveIndex;

    // Check for difficulty increase every 5 waves
    if (this.waveIndex % 5 === 0 && this.waveIndex !== this.lastDifficultyWave) {
      this.lastDifficultyWave = this.waveIndex;
      if (this.ui && typeof this.ui.showNotification === 'function') {
        this.ui.showNotification("DIFFICULTY INCREASED");
      }
    }

    // Show wave upgrade selection (starting from wave 2)
    if (this.waveIndex > 1 && this.ui && typeof this.ui.showWaveUpgradeSelection === 'function') {
      this.pausedForUpgradeSelection = true;
      this.paused = true;
      this.showUpgradeSelection();
    } else {
      this.doSpawnWaveEnemies();
    }
  }

  showUpgradeSelection() {
    const options = this.pickUniqueUpgrades(3, ["speed"]).map((upgradeKey) => this.buildUpgradeChoice(upgradeKey));
    
    this.ui.showWaveUpgradeSelection(options, (selected) => {
      // Apply the selected upgrade permanently
      this.player.upgrades[selected.key] += selected.amount || 1;
      if (!this.player.permanentUpgrades.includes(selected.key)) {
        this.player.permanentUpgrades.push(selected.key);
      }
      
      // Now spawn the wave and unpause
      this.pausedForUpgradeSelection = false;
      this.paused = false;
      this.ui.setPaused(false);
      this.doSpawnWaveEnemies();
    });
  }

  showMilestoneUpgradeSelection() {
    const options = this.pickUniqueUpgrades(3, ["speed"]).map((upgradeKey) => this.buildUpgradeChoice(upgradeKey));
    
    this.pausedForUpgradeSelection = true;
    this.paused = true;
    if (this.ui && typeof this.ui.setPaused === "function") {
      this.ui.setPaused(true);
    }

    this.ui.showWaveUpgradeSelection(options, (selected) => {
      this.player.upgrades[selected.key] += selected.amount || 1;

      this.pausedForUpgradeSelection = false;
      this.paused = false;
      if (this.ui && typeof this.ui.setPaused === "function") {
        this.ui.setPaused(false);
      }
    });
  }

  doSpawnWaveEnemies() {
    const baseMultiplier = 1 + Math.floor(this.waveIndex / 3) * 0.5;
    const basics = Math.floor((5 + this.waveIndex * 1.2) * baseMultiplier); // Increased from 3
    const tanks = Math.floor((2 + Math.floor(this.waveIndex / 1.5)) * baseMultiplier); // Increased from 1
    const shooters = Math.floor((1 + Math.floor(this.waveIndex / 3)) * baseMultiplier);

    for (let i = 0; i < basics; i += 1) this.spawnEnemy(ENEMY_TYPES.BASIC);
    for (let i = 0; i < tanks; i += 1) this.spawnEnemy(ENEMY_TYPES.TANK);
    for (let i = 0; i < shooters; i += 1) this.spawnEnemy(ENEMY_TYPES.PROJECTILE);

    if (Math.random() < 0.1 + Math.min(0.15, this.waveIndex * 0.01)) {
      this.spawnEnemy(ENEMY_TYPES.BOSS);
    }
    
    // Allow multiple bosses to spawn (1 extra boss every 5 waves)
    const extraBosses = Math.floor((this.waveIndex - 1) / 5);
    for (let i = 0; i < extraBosses; i++) {
      if (Math.random() < 0.5 + this.waveIndex * 0.05) {
        this.spawnEnemy(ENEMY_TYPES.BOSS);
      }
    }
  }

  spawnEnemy(type) {
    const spawnLocation = randomSide(this.canvas.width, this.canvas.height);
    const enemy = new Enemy(type, spawnLocation.x, spawnLocation.y, this.sprites[type]);
    
    // Increase enemy HP based on wave
    let hpMultiplier = 1 + (this.waveIndex - 1) * 0.15;
    let damageMultiplier = 1;
    
    // Every 5 waves, double HP and damage
    const difficultyLevel = Math.floor(this.waveIndex / 5);
    damageMultiplier = Math.pow(2, difficultyLevel);
    hpMultiplier *= damageMultiplier;
    
    enemy.hp = Math.floor(enemy.maxHp * hpMultiplier);
    enemy.maxHp = enemy.hp;
    enemy.contactDamage *= damageMultiplier;
    
    this.enemies.push(enemy);
  }

  spawnRock() {
    const x = 70 + Math.random() * (this.canvas.width - 140);
    const y = 70 + Math.random() * (this.canvas.height - 140);
    this.rocks.push(new Rock(x, y, this.sprites.rock));
  }

  spawnCube(x, y) {
    const pool = [
      UPGRADE_TYPES.PROJECTILES, UPGRADE_TYPES.SPEED, UPGRADE_TYPES.RATE, UPGRADE_TYPES.ROWS, UPGRADE_TYPES.VERTICAL_ROWS, UPGRADE_TYPES.BURST, UPGRADE_TYPES.LASER, UPGRADE_TYPES.DAMAGE,
      UPGRADE_TYPES.AURA, UPGRADE_TYPES.SIZE, UPGRADE_TYPES.RANDOM, UPGRADE_TYPES.PLASMA, UPGRADE_TYPES.BOMB, UPGRADE_TYPES.DISPEL, UPGRADE_TYPES.ARC, UPGRADE_TYPES.HEADHUNTER,
      UPGRADE_TYPES.BOUNCE, UPGRADE_TYPES.PIERCE, UPGRADE_TYPES.CRITICAL_RATE, UPGRADE_TYPES.CRITICAL_DAMAGE
    ];
    const type = pool[Math.floor(Math.random() * pool.length)];
    const upgradeInfo = this.getUpgradeInfo(type);
    const rarity = this.rollRarity();
    this.cubes.push(new Cube(x, y, type, rarity, upgradeInfo.acronym));
  }

  spawnHPBox(x, y) {
    this.hpBoxes.push(new HPBox(x, y));
  }

  updateUI() {
    this.ui.updateHp(this.player.hp, this.player.maxHp);
    this.ui.updateWave(this.waveIndex);
  }

  drawSprite(entity) {
    const image = entity.sprite;
    if (image.complete && image.naturalWidth > 0) {
      this.ctx.drawImage(image, entity.x - entity.radius, entity.y - entity.radius, entity.radius * 2, entity.radius * 2);
    } else {
      this.ctx.fillStyle = "#c7d6ff";
      this.ctx.beginPath();
      this.ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const rock of this.rocks) this.drawSprite(rock);
    this.drawSprite(this.player);
    
    // Draw aura if active
    if (this.player.upgrades.aura > 0) {
      const auraRadius = 40 + this.player.upgrades.aura * 15;
      this.ctx.strokeStyle = `rgba(0, 255, 0, ${0.3 + 0.1 * this.player.upgrades.aura})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, auraRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    for (const enemy of this.enemies) this.drawSprite(enemy);

    // Batch render projectiles by type for better performance
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const renderMargin = 50;

    // Group projectiles by type for batched rendering
    const laserProjs = [];
    const bombProjs = [];
    const dispelProjs = [];
    const arcProjs = [];
    const randomProjs = [];
    const headhunterProjs = [];
    const normalProjs = [];

    for (const p of this.playerProjectiles) {
      // Cull offscreen projectiles
      if (p.x < -renderMargin || p.y < -renderMargin || p.x > canvasW + renderMargin || p.y > canvasH + renderMargin) {
        continue;
      }

      if (p.isLaser) laserProjs.push(p);
      else if (p.type === "bomb") bombProjs.push(p);
      else if (p.type === "dispel") dispelProjs.push(p);
      else if (p.type === "arc") arcProjs.push(p);
      else if (p.type === "random") randomProjs.push(p);
      else if (p.type === "headhunter") headhunterProjs.push(p);
      else normalProjs.push(p);
    }

    // Render lasers with reduced shadow
    for (const p of laserProjs) {
      this.ctx.fillStyle = p.color || "#ffff00";
      this.ctx.shadowColor = p.color || "#ffff00";
      this.ctx.shadowBlur = 5;
      this.ctx.fillRect(p.x - p.radius, p.y - 15, p.radius * 2, 30);
    }
    this.ctx.shadowBlur = 0;

    // Render bombs
    for (const p of bombProjs) {
      this.ctx.fillStyle = p.color || "#66c2ff";
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      if (p.isCritical) this.ctx.rotate(Math.PI / 4);
      this.ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
      this.ctx.restore();
    }

    // Render dispel (crosses)
    this.ctx.strokeStyle = "#00ff80";
    this.ctx.lineWidth = 2;
    for (const p of dispelProjs) {
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - p.radius, p.y - p.radius);
      this.ctx.lineTo(p.x + p.radius, p.y + p.radius);
      this.ctx.moveTo(p.x + p.radius, p.y - p.radius);
      this.ctx.lineTo(p.x - p.radius, p.y + p.radius);
      this.ctx.stroke();
    }

    // Render arcs
    for (const p of arcProjs) {
      this.ctx.fillStyle = p.color || "#66c2ff";
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.beginPath();
      this.ctx.moveTo(0, -p.radius);
      this.ctx.lineTo(p.radius, p.radius);
      this.ctx.lineTo(-p.radius, p.radius);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    // Render random (small crosses)
    this.ctx.strokeStyle = "#ff00ff";
    this.ctx.lineWidth = 1.5;
    for (const p of randomProjs) {
      this.ctx.beginPath();
      this.ctx.moveTo(p.x - p.radius, p.y);
      this.ctx.lineTo(p.x + p.radius, p.y);
      this.ctx.moveTo(p.x, p.y - p.radius);
      this.ctx.lineTo(p.x, p.y + p.radius);
      this.ctx.stroke();
    }

    // Render headhunter (diamonds)
    for (const p of headhunterProjs) {
      this.ctx.fillStyle = p.color || "#66c2ff";
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.beginPath();
      this.ctx.moveTo(0, -p.radius);
      this.ctx.lineTo(p.radius * 0.7, -p.radius * 0.3);
      this.ctx.lineTo(p.radius, 0);
      this.ctx.lineTo(p.radius * 0.7, p.radius * 0.3);
      this.ctx.lineTo(0, p.radius);
      this.ctx.lineTo(-p.radius * 0.7, p.radius * 0.3);
      this.ctx.lineTo(-p.radius, 0);
      this.ctx.lineTo(-p.radius * 0.7, -p.radius * 0.3);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    // Render normal projectiles (circles - plasma & default)
    for (const p of normalProjs) {
      this.ctx.fillStyle = p.color || "#66c2ff";
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Render critical hit glows
    this.ctx.strokeStyle = "#ff00ff";
    this.ctx.lineWidth = 1;
    for (const p of [...laserProjs, ...bombProjs, ...arcProjs, ...headhunterProjs, ...normalProjs]) {
      if (p.isCritical) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius + 2, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    }

    this.ctx.fillStyle = "#ff5b6e";
    for (const p of this.enemyProjectiles) {
      // Cull offscreen
      if (p.x >= -renderMargin && p.y >= -renderMargin && p.x <= canvasW + renderMargin && p.y <= canvasH + renderMargin) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    for (const cube of this.cubes) {
      this.ctx.save();
      this.ctx.translate(cube.x, cube.y);
      this.ctx.rotate(cube.spin);
      const cubeRarity = this.getRarityInfo(cube.rarity);
      const label = cube.acronym || this.getUpgradeInfo(cube.type).acronym;

      this.ctx.fillStyle = cubeRarity.color;
      this.ctx.fillRect(-cube.radius, -cube.radius, cube.radius * 2, cube.radius * 2);
      this.ctx.rotate(-cube.spin);
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      this.ctx.font = "bold 11px Arial";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "bottom";
      this.ctx.fillText(label, 0, -cube.radius - 4);
      this.ctx.restore();
    }

    for (const hpBox of this.hpBoxes) {
      this.ctx.save();
      this.ctx.translate(hpBox.x, hpBox.y);
      this.ctx.rotate(hpBox.spin);
      this.ctx.fillStyle = "#ff6b6b";
      this.ctx.fillRect(-hpBox.radius, -hpBox.radius, hpBox.radius * 2, hpBox.radius * 2);
      this.ctx.restore();
    }

    if (this.aoeRing) {
      this.ctx.strokeStyle = "rgba(255, 120, 80, 0.8)";
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(this.aoeRing.x, this.aoeRing.y, this.aoeRing.radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Draw supernovas
    for (const supernova of this.supernovas) {
      const progress = supernova.elapsed / supernova.ttl; // 0 to 1
      const opacity = Math.max(0, 1 - progress); // Fade out
      
      // Draw outer glow
      this.ctx.fillStyle = `rgba(255, 150, 0, ${0.3 * opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(supernova.x, supernova.y, supernova.radius * 1.2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw main circle
      this.ctx.fillStyle = `rgba(255, 200, 0, ${0.6 * opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(supernova.x, supernova.y, supernova.radius * 0.8, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw bright center
      this.ctx.fillStyle = `rgba(255, 255, 100, ${opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(supernova.x, supernova.y, supernova.radius * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw floating texts
    for (const floatingText of this.floatingTexts) {
      floatingText.draw(this.ctx);
    }
  }
}
