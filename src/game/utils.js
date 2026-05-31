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

export function randomSide(width, height, margin = 20) {
  // Spawn on any of the 4 sides: top, bottom, left, right
  const side = Math.floor(Math.random() * 4);
  let x, y;
  
  switch(side) {
    case 0: // Top
      x = margin + Math.random() * (width - 2 * margin);
      y = margin;
      break;
    case 1: // Bottom
      x = margin + Math.random() * (width - 2 * margin);
      y = height - margin;
      break;
    case 2: // Left
      x = margin;
      y = margin + Math.random() * (height - 2 * margin);
      break;
    case 3: // Right
      x = width - margin;
      y = margin + Math.random() * (height - 2 * margin);
      break;
  }
  return { x, y };
}

export function loadSprite(path) {
  const image = new Image();
  image.src = path;
  return image;
}
