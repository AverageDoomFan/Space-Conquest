import { Cube } from "./entities/Cube.js";
import { Enemy } from "./entities/Enemy.js";
import { HPBox } from "./entities/HPBox.js";
import { Player } from "./entities/Player.js";
import { Projectile } from "./entities/Projectile.js";
import { Rock } from "./entities/Rock.js";
import { Input } from "./systems/Input.js";
import { ENEMY_TYPES, GAME_HEIGHT, GAME_WIDTH, SPRITES, UPGRADE_TYPES, WAVE_INTERVAL_MS, MAX_SPEED_UPGRADES } from "./constants.js";
import { circleHit, loadSprite, normalize, randomCorner } from "./utils.js";

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
    this.cumulativeUpgrades = 0;
    this.paused = false;

    this.reset();
  }

  reset() {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.sprites.player);
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.rocks = [];
    this.cubes = [];
    this.hpBoxes = [];
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.aoeRing = null;

    for (let i = 0; i < 6; i += 1) {
      this.spawnRock();
    }
    this.spawnWave();
    this.updateUI();
  }

  start() {
    this.reset();
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

    // Handle pause toggle
    if (this.input.isPressed("escape")) {
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

    for (const enemy of this.enemies) {
      enemy.update(this.player, dt);
      this.maybeEnemyAttack(enemy);

      if (circleHit(enemy, this.player)) {
        this.player.takeDamage(enemy.contactDamage * dt);
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
      if (circleHit(cube, this.player)) {
        this.player.upgrades[cube.type] += 1;
        this.cumulativeUpgrades += 1;
        
        // Check for 30 upgrade milestone (stackable)
        if (this.cumulativeUpgrades % 30 === 0) {
          if (this.ui && typeof this.ui.showNotification === 'function') {
            this.ui.showNotification("SHIP UPGRADED");
          }
          
          // Increase maxhp by 50
          this.player.maxHp += 50;
          this.player.hp = this.player.maxHp;
          
          // Reset upgrades except speed (keep speed boost)
          this.player.upgrades.projectiles = 0;
          this.player.upgrades.rate = 0;
          this.player.upgrades.rows = 0;
          this.player.upgrades.verticalRows = 0;
          this.player.upgrades.burst = 0;
          this.player.upgrades.laser = 0;
          this.player.upgrades.damage = 0;
        }
        
        cube.picked = true;
      }
    }
    this.cubes = this.cubes.filter((cube) => !cube.picked);

    for (const hpBox of this.hpBoxes) {
      hpBox.update(dt);
      if (circleHit(hpBox, this.player)) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
        hpBox.picked = true;
      }
    }
    this.hpBoxes = this.hpBoxes.filter((hpBox) => !hpBox.picked);

    this.updateProjectiles(this.playerProjectiles, dt);
    this.updateProjectiles(this.enemyProjectiles, dt);
    this.resolveProjectileHits();

    this.enemies = this.enemies.filter((enemy) => !enemy.isDead);
    this.rocks = this.rocks.filter((rock) => !rock.isDestroyed);
    this.aoeRing = this.aoeRing && this.aoeRing.ttl > 0 ? { ...this.aoeRing, ttl: this.aoeRing.ttl - dt } : null;

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
      for (const enemy of this.enemies) {
        if (!projectile.dead && circleHit(projectile, enemy)) {
          enemy.takeDamage(projectile.damage);
          projectile.dead = true;
          if (enemy.isDead) {
            if (Math.random() < 0.28) {
              this.spawnCube(enemy.x, enemy.y);
            }
            if (Math.random() < 0.15) {
              this.spawnHPBox(enemy.x, enemy.y);
            }
          }
        }
      }
      for (const rock of this.rocks) {
        if (!projectile.dead && circleHit(projectile, rock)) {
          rock.hit();
          projectile.dead = true;
        }
      }
    }

    for (const projectile of this.enemyProjectiles) {
      if (!projectile.dead && circleHit(projectile, this.player)) {
        this.player.takeDamage(projectile.damage);
        projectile.dead = true;
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
    const horizontalRows = 1 + this.player.upgrades.rows;
    const verticalRows = 1 + this.player.upgrades.verticalRows;
    const count = 1 + this.player.upgrades.projectiles;
    const burstMultiplier = this.player.burstActive ? 2 : 1;
    const finalCount = Math.floor(count * burstMultiplier);
    
    const totalSpread = Math.min(1.2, 0.1 * (finalCount - 1));
    const speed = 390 + this.player.upgrades.speed * 45;
    
    // Calculate damage multiplier based on ship upgrades
    const shipUpgradeCount = Math.floor(this.cumulativeUpgrades / 30);
    const damageMultiplier = 1 + shipUpgradeCount * 2;
    
    // Calculate projectile damage penalty (7% reduction per upgrade, resets on ship upgrade)
    const projectileDamagePenalty = Math.pow(0.93, this.player.upgrades.projectiles);
    
    // Get damage color based on damage upgrade
    const damageUpgrades = [1, 1.2, 1.5, 2, 3, 5];
    const damageTier = Math.min(this.player.upgrades.damage, damageUpgrades.length - 1);
    const damageScale = damageUpgrades[damageTier];
    const damageColors = ["#66c2ff", "#ffdd61", "#ff9d3d", "#ff5b5b", "#d946ef", "#ffffff"];
    const projectileColor = damageColors[damageTier];
    
    // Horizontal projectiles
    for (let row = 0; row < horizontalRows; row += 1) {
      const rowOffset = horizontalRows === 1 ? 0 : (row - (horizontalRows - 1) / 2) * 25;
      
      for (let i = 0; i < finalCount; i += 1) {
        const ratio = finalCount === 1 ? 0.5 : i / (finalCount - 1);
        const angle = -Math.PI / 2 + (ratio - 0.5) * totalSpread;
        this.playerProjectiles.push(
          new Projectile({
            x: this.player.x + rowOffset,
            y: this.player.y - this.player.radius,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5,
            damage: 14 * damageScale * projectileDamagePenalty,
            damageMultiplier: damageMultiplier,
            color: projectileColor
          })
        );
      }
    }
    
    // Vertical projectiles (both left and right sides with reduced damage)
    for (let col = 0; col < verticalRows; col += 1) {
      const colOffset = verticalRows === 1 ? 0 : (col - (verticalRows - 1) / 2) * 25;
      
      // Left side
      for (let i = 0; i < finalCount; i += 1) {
        const ratio = finalCount === 1 ? 0.5 : i / (finalCount - 1);
        const angle = -3 * Math.PI / 4 + (ratio - 0.5) * totalSpread;
        this.playerProjectiles.push(
          new Projectile({
            x: this.player.x - this.player.radius + colOffset,
            y: this.player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5,
            damage: 14 * damageScale * projectileDamagePenalty * 0.3,
            damageMultiplier: damageMultiplier,
            color: projectileColor
          })
        );
      }
      
      // Right side
      for (let i = 0; i < finalCount; i += 1) {
        const ratio = finalCount === 1 ? 0.5 : i / (finalCount - 1);
        const angle = -Math.PI / 4 + (ratio - 0.5) * totalSpread;
        this.playerProjectiles.push(
          new Projectile({
            x: this.player.x + this.player.radius + colOffset,
            y: this.player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 5,
            damage: 14 * damageScale * projectileDamagePenalty * 0.3,
            damageMultiplier: damageMultiplier,
            color: projectileColor
          })
        );
      }
    }
    
    // Lasers (powerful single projectile)
    for (let laser = 0; laser < this.player.upgrades.laser; laser += 1) {
      const laserOffset = this.player.upgrades.laser === 1 ? 0 : (laser - (this.player.upgrades.laser - 1) / 2) * 40;
      this.playerProjectiles.push(
        new Projectile({
          x: this.player.x + laserOffset,
          y: this.player.y - this.player.radius,
          vx: Math.sin(laserOffset / 50) * 100,
          vy: -500,
          radius: 8,
          damage: 50 * damageScale * projectileDamagePenalty,
          damageMultiplier: damageMultiplier,
          isLaser: true,
          color: "#ffff00"
        })
      );
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

    const baseMultiplier = 1 + Math.floor(this.waveIndex / 3) * 0.5;
    const basics = Math.floor((3 + this.waveIndex) * baseMultiplier);
    const tanks = Math.floor((1 + Math.floor(this.waveIndex / 2)) * baseMultiplier);
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
    const corner = randomCorner(this.canvas.width, this.canvas.height);
    const enemy = new Enemy(type, corner.x, corner.y, this.sprites[type]);
    
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
    const pool = [UPGRADE_TYPES.PROJECTILES, UPGRADE_TYPES.SPEED, UPGRADE_TYPES.RATE, UPGRADE_TYPES.ROWS, UPGRADE_TYPES.VERTICAL_ROWS, UPGRADE_TYPES.BURST, UPGRADE_TYPES.LASER, UPGRADE_TYPES.DAMAGE];
    const type = pool[Math.floor(Math.random() * pool.length)];
    this.cubes.push(new Cube(x, y, type));
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
    for (const enemy of this.enemies) this.drawSprite(enemy);

    for (const p of this.playerProjectiles) {
      this.ctx.fillStyle = p.color || "#66c2ff";
      if (p.isLaser) {
        // Draw lasers as glowing rectangles
        this.ctx.shadowColor = p.color || "#ffff00";
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(p.x - p.radius, p.y - 15, p.radius * 2, 30);
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.fillStyle = "#ff5b6e";
    for (const p of this.enemyProjectiles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    for (const cube of this.cubes) {
      this.ctx.save();
      this.ctx.translate(cube.x, cube.y);
      this.ctx.rotate(cube.spin);
      let color = "#ffd561";
      if (cube.type === UPGRADE_TYPES.PROJECTILES) color = "#61e0ff";
      else if (cube.type === UPGRADE_TYPES.SPEED) color = "#80ff7f";
      else if (cube.type === UPGRADE_TYPES.ROWS) color = "#ff80d5";
      else if (cube.type === UPGRADE_TYPES.RATE) color = "#ffa500";
      else if (cube.type === UPGRADE_TYPES.VERTICAL_ROWS) color = "#ff1493";
      else if (cube.type === UPGRADE_TYPES.BURST) color = "#ffd700";
      else if (cube.type === UPGRADE_TYPES.LASER) color = "#ffff00";
      else if (cube.type === UPGRADE_TYPES.DAMAGE) color = "#ff69b4";
      this.ctx.fillStyle = color;
      this.ctx.fillRect(-cube.radius, -cube.radius, cube.radius * 2, cube.radius * 2);
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
  }
}
