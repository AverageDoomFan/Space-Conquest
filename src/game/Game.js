import { Cube } from "./entities/Cube.js";
import { Enemy } from "./entities/Enemy.js";
import { Player } from "./entities/Player.js";
import { Projectile } from "./entities/Projectile.js";
import { Rock } from "./entities/Rock.js";
import { Input } from "./systems/Input.js";
import { ENEMY_TYPES, GAME_HEIGHT, GAME_WIDTH, SPRITES, UPGRADE_TYPES, WAVE_INTERVAL_MS } from "./constants.js";
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

    this.reset();
  }

  reset() {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, this.sprites.player);
    this.enemies = [];
    this.playerProjectiles = [];
    this.enemyProjectiles = [];
    this.rocks = [];
    this.cubes = [];
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

    this.update(dt);
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

      for (const rock of this.rocks) {
        if (circleHit(enemy, rock)) {
          this.player.takeDamage(6 * dt);
        }
      }
    }

    for (const cube of this.cubes) {
      cube.update(dt);
      if (circleHit(cube, this.player)) {
        this.player.upgrades[cube.type] += 1;
        cube.picked = true;
      }
    }
    this.cubes = this.cubes.filter((cube) => !cube.picked);

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
          if (enemy.isDead && Math.random() < 0.28) {
            this.spawnCube(enemy.x, enemy.y);
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
    const count = 1 + this.player.upgrades.projectiles;
    const totalSpread = Math.min(1.2, 0.1 * (count - 1));
    for (let i = 0; i < count; i += 1) {
      const ratio = count === 1 ? 0.5 : i / (count - 1);
      const angle = -Math.PI / 2 + (ratio - 0.5) * totalSpread;
      const speed = 390 + this.player.upgrades.speed * 45;
      this.playerProjectiles.push(
        new Projectile({
          x: this.player.x,
          y: this.player.y - this.player.radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 5,
          damage: 14
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

    const basics = 2 + this.waveIndex;
    const tanks = Math.floor(this.waveIndex / 2);
    const shooters = 1 + Math.floor(this.waveIndex / 3);

    for (let i = 0; i < basics; i += 1) this.spawnEnemy(ENEMY_TYPES.BASIC);
    for (let i = 0; i < tanks; i += 1) this.spawnEnemy(ENEMY_TYPES.TANK);
    for (let i = 0; i < shooters; i += 1) this.spawnEnemy(ENEMY_TYPES.PROJECTILE);

    if (Math.random() < 0.1 + Math.min(0.15, this.waveIndex * 0.01)) {
      this.spawnEnemy(ENEMY_TYPES.BOSS);
    }
  }

  spawnEnemy(type) {
    const corner = randomCorner(this.canvas.width, this.canvas.height);
    this.enemies.push(new Enemy(type, corner.x, corner.y, this.sprites[type]));
  }

  spawnRock() {
    const x = 70 + Math.random() * (this.canvas.width - 140);
    const y = 70 + Math.random() * (this.canvas.height - 140);
    this.rocks.push(new Rock(x, y, this.sprites.rock));
  }

  spawnCube(x, y) {
    const pool = [UPGRADE_TYPES.PROJECTILES, UPGRADE_TYPES.SPEED, UPGRADE_TYPES.RATE];
    const type = pool[Math.floor(Math.random() * pool.length)];
    this.cubes.push(new Cube(x, y, type));
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

    this.ctx.fillStyle = "#66c2ff";
    for (const p of this.playerProjectiles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
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
      this.ctx.fillStyle = cube.type === UPGRADE_TYPES.PROJECTILES ? "#61e0ff" : cube.type === UPGRADE_TYPES.SPEED ? "#80ff7f" : "#ffd561";
      this.ctx.fillRect(-cube.radius, -cube.radius, cube.radius * 2, cube.radius * 2);
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
