import { Game } from "./game/Game.js";

const menu = document.getElementById("menu-screen");
const shipSelection = document.getElementById("ship-selection");
const gameScreen = document.getElementById("game-screen");
const gameOver = document.getElementById("game-over");
const previousScore = document.getElementById("previous-score");
const finalScore = document.getElementById("final-score");
const newGameButton = document.getElementById("new-game-button");
const backToMenu = document.getElementById("back-to-menu");

const hpBar = document.getElementById("hp-bar");
const hpText = document.getElementById("hp-text");
const waveCounter = document.getElementById("wave-counter");
const notification = document.getElementById("notification");
const pauseOverlay = document.getElementById("pause-overlay");
const waveUpgradeSelection = document.getElementById("wave-upgrade-selection");
const upgradeOptions = document.getElementById("upgrade-options");
const canvas = document.getElementById("game-canvas");

const scoreKey = "space-conquest-previous-score";

// Ship definitions with their bonuses
const SHIPS = [
  { name: "Rapid Fire", bonus: "rate", bonusValue: 2, description: "+2 Fire Rate" },
  { name: "Multishot", bonus: "projectiles", bonusValue: 1, description: "+1 Projectile" },
  { name: "Swift Runner", bonus: "speed", bonusValue: 2, description: "+2 Speed" },
  { name: "Laser Master", bonus: "laser", bonusValue: 1, description: "+1 Laser" },
  { name: "Precision", bonus: "damage", bonusValue: 1, description: "+1 Damage Tier" },
  { name: "Spray & Pray", bonus: "random", bonusValue: 1, description: "+1 Random" },
  { name: "Energy Core", bonus: "plasma", bonusValue: 1, description: "+1 Plasma" },
  { name: "Bomber", bonus: "bomb", bonusValue: 1, description: "+1 Bomb" },
  { name: "Pulse Aura", bonus: "aura", bonusValue: 1, description: "+1 Aura" },
  { name: "Sharpshooter", bonus: "arc", bonusValue: 1, description: "+1 Arc" },
  { name: "Seeker", bonus: "headhunter", bonusValue: 1, description: "+1 Headhunter" },
  { name: "Bouncer", bonus: "bounce", bonusValue: 1, description: "+1 Bounce" },
  { name: "Piercer", bonus: "pierce", bonusValue: 1, description: "+1 Pierce" },
  { name: "Crit Chance", bonus: "criticalRate", bonusValue: 2, description: "+2 Crit Rate" },
  { name: "Critical Power", bonus: "criticalDamage", bonusValue: 2, description: "+2 Crit Dmg" },
  { name: "Spread Shot", bonus: "rows", bonusValue: 1, description: "+1 Row" },
  { name: "Side Burst", bonus: "verticalRows", bonusValue: 1, description: "+1 V-Row" },
  { name: "Overcharged", bonus: "burst", bonusValue: 1, description: "+1 Burst" },
  { name: "Disruptor", bonus: "dispel", bonusValue: 1, description: "+1 Dispel" },
  { name: "Size Matters", bonus: "size", bonusValue: 3, description: "+3 Size" }
];

let selectedShip = null;

function getPreviousScore() {
  return Number(localStorage.getItem(scoreKey) || 0);
}

function setPreviousScore(value) {
  localStorage.setItem(scoreKey, String(value));
}

function showMenu() {
  menu.classList.add("active");
  shipSelection.classList.remove("active");
  gameScreen.classList.remove("active");
  gameOver.classList.add("hidden");
  previousScore.textContent = String(getPreviousScore());
}

function showShipSelection() {
  menu.classList.remove("active");
  shipSelection.classList.add("active");
  gameScreen.classList.remove("active");
  gameOver.classList.add("hidden");
  
  // Generate ship selection UI
  const shipOptions = document.getElementById("ship-options");
  shipOptions.innerHTML = "";
  
  SHIPS.forEach((ship, index) => {
    const button = document.createElement("button");
    button.className = "ship-option";
    button.innerHTML = `<h3>${ship.name}</h3><p>${ship.description}</p>`;
    button.addEventListener("click", () => selectShip(ship));
    shipOptions.appendChild(button);
  });
}

function selectShip(ship) {
  selectedShip = ship;
  showGame();
  game.start(ship);
}

function showGame() {
  menu.classList.remove("active");
  shipSelection.classList.remove("active");
  gameScreen.classList.add("active");
  gameOver.classList.add("hidden");
}

const game = new Game(canvas, {
  updateHp(current, max) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    hpBar.style.width = `${pct}%`;
    hpText.textContent = `${Math.ceil(current)} / ${max}`;
  },
  updateWave(wave) {
    waveCounter.textContent = `Wave: ${wave}`;
  },
  showNotification: (message) => {
    if (notification) {
      notification.textContent = message;
      notification.classList.remove("show");
      // Trigger reflow to restart animation
      void notification.offsetWidth;
      notification.classList.add("show");
    }
  },
  setPaused: (isPaused) => {
    if (isPaused) {
      pauseOverlay.classList.remove("hidden");
    } else {
      pauseOverlay.classList.add("hidden");
    }
  },
  showWaveUpgradeSelection: (options, callback) => {
    waveUpgradeSelection.classList.remove("hidden");
    upgradeOptions.innerHTML = "";
    
    options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "upgrade-option";
      button.textContent = option.name;
      button.addEventListener("click", () => {
        callback(option);
        waveUpgradeSelection.classList.add("hidden");
      });
      upgradeOptions.appendChild(button);
    });
  },
  onGameOver(score) {
    finalScore.textContent = String(score);
    setPreviousScore(score);
    gameOver.classList.remove("hidden");
  }
});

newGameButton.addEventListener("click", () => {
  showShipSelection();
});

backToMenu.addEventListener("click", () => {
  showMenu();
});

showMenu();

