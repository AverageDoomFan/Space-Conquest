import { Game } from "./game/Game.js";

const menu = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const gameOver = document.getElementById("game-over");
const previousScore = document.getElementById("previous-score");
const finalScore = document.getElementById("final-score");
const newGameButton = document.getElementById("new-game-button");
const backToMenu = document.getElementById("back-to-menu");

const hpBar = document.getElementById("hp-bar");
const hpText = document.getElementById("hp-text");
const waveCounter = document.getElementById("wave-counter");
const canvas = document.getElementById("game-canvas");

const scoreKey = "space-conquest-previous-score";

function getPreviousScore() {
  return Number(localStorage.getItem(scoreKey) || 0);
}

function setPreviousScore(value) {
  localStorage.setItem(scoreKey, String(value));
}

function showMenu() {
  menu.classList.add("active");
  gameScreen.classList.remove("active");
  gameOver.classList.add("hidden");
  previousScore.textContent = String(getPreviousScore());
}

function showGame() {
  menu.classList.remove("active");
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
  onGameOver(score) {
    finalScore.textContent = String(score);
    setPreviousScore(score);
    gameOver.classList.remove("hidden");
  }
});

newGameButton.addEventListener("click", () => {
  showGame();
  game.start();
});

backToMenu.addEventListener("click", () => {
  showMenu();
});

showMenu();
