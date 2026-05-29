export class Input {
  constructor() {
    this.keys = new Set();
    this.handleDown = (event) => this.keys.add(event.key.toLowerCase());
    this.handleUp = (event) => this.keys.delete(event.key.toLowerCase());
  }

  mount() {
    window.addEventListener("keydown", this.handleDown);
    window.addEventListener("keyup", this.handleUp);
  }

  unmount() {
    window.removeEventListener("keydown", this.handleDown);
    window.removeEventListener("keyup", this.handleUp);
  }

  isPressed(...keys) {
    return keys.some((key) => this.keys.has(key.toLowerCase()));
  }
}
