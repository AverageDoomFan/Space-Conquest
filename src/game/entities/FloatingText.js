export class FloatingText {
  constructor(x, y, text, color = "#ffffff") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.lifetime = 2; // seconds
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    this.y -= 50 * dt; // Float upward
  }

  draw(ctx) {
    const alpha = Math.max(0, 1 - this.elapsed / this.lifetime);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }

  get isDone() {
    return this.elapsed >= this.lifetime;
  }
}
