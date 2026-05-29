export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function normalize(dx, dy) {
  const len = Math.hypot(dx, dy);
  if (!len) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

export function circleHit(a, b) {
  return distance(a, b) <= a.radius + b.radius;
}

export function randomCorner(width, height, margin = 20) {
  const corners = [
    { x: margin, y: margin },
    { x: width - margin, y: margin },
    { x: margin, y: height - margin },
    { x: width - margin, y: height - margin }
  ];
  return corners[Math.floor(Math.random() * corners.length)];
}

export function loadSprite(path) {
  const image = new Image();
  image.src = path;
  return image;
}
