// Colour grades for Cover Forge: canvas filters plus painted light washes,
// a deterministic film-grain tile, and a vignette. Everything is drawn with
// the 2D canvas API; no image ever leaves the page.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GRADE_FILTERS = {
  sunset: 'saturate(1.38) contrast(1.13) sepia(0.32) hue-rotate(-8deg) brightness(1.05)',
  neon: 'saturate(1.65) contrast(1.26) hue-rotate(14deg) brightness(1.03)',
  duotone: 'grayscale(1) contrast(1.28) brightness(1.06)',
  mono: 'grayscale(1) contrast(1.32) brightness(1.04)',
  none: 'saturate(1.06) contrast(1.05)',
};

export function gradeFilter(gradeId) {
  return GRADE_FILTERS[gradeId] || GRADE_FILTERS.none;
}

function verticalWash(ctx, x, y, w, h, stops, mode, alpha) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function diagonalWash(ctx, x, y, w, h, stops, mode, alpha) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// Paints the light wash that gives each grade its character, over one panel.
export function paintGradeWash(ctx, x, y, w, h, gradeId) {
  if (gradeId === 'sunset') {
    verticalWash(ctx, x, y, w, h, [
      [0, 'rgba(255, 196, 64, 0.85)'],
      [0.45, 'rgba(255, 92, 92, 0.55)'],
      [1, 'rgba(110, 36, 168, 0.8)'],
    ], 'overlay', 0.5);
    verticalWash(ctx, x, y, w, h, [
      [0, 'rgba(255, 220, 150, 0.5)'],
      [1, 'rgba(40, 8, 60, 0.55)'],
    ], 'soft-light', 0.7);
  } else if (gradeId === 'neon') {
    diagonalWash(ctx, x, y, w, h, [
      [0, 'rgba(32, 224, 208, 0.75)'],
      [0.55, 'rgba(64, 80, 255, 0.45)'],
      [1, 'rgba(255, 45, 150, 0.8)'],
    ], 'overlay', 0.55);
    diagonalWash(ctx, x, y, w, h, [
      [0, 'rgba(120, 255, 240, 0.35)'],
      [1, 'rgba(255, 90, 200, 0.4)'],
    ], 'screen', 0.35);
  } else if (gradeId === 'duotone') {
    verticalWash(ctx, x, y, w, h, [
      [0, 'rgba(255, 61, 138, 0.9)'],
      [0.55, 'rgba(146, 64, 200, 0.75)'],
      [1, 'rgba(26, 10, 66, 0.95)'],
    ], 'overlay', 0.62);
    verticalWash(ctx, x, y, w, h, [
      [0, 'rgba(255, 170, 210, 0.45)'],
      [1, 'rgba(16, 4, 40, 0.5)'],
    ], 'soft-light', 0.8);
  } else if (gradeId === 'mono') {
    verticalWash(ctx, x, y, w, h, [
      [0, 'rgba(255, 240, 220, 0.35)'],
      [1, 'rgba(10, 10, 14, 0.4)'],
    ], 'soft-light', 0.6);
  }
}

let grainTile = null;

// A fixed noise tile: the same grain on every render, preview or export.
export function makeGrainTile() {
  if (grainTile) return grainTile;
  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(size, size);
  const rand = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

export function paintGrain(ctx, w, h, amount) {
  if (amount <= 0) return;
  const pattern = ctx.createPattern(makeGrainTile(), 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = amount * 0.4;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function paintVignette(ctx, w, h, amount) {
  if (amount <= 0) return;
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, `rgba(4, 2, 10, ${(0.75 * amount).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// A soft dark scrim behind the caption band so lettering stays readable.
export function paintCaptionScrim(ctx, w, h, atTop) {
  const bandH = h * 0.34;
  const y0 = atTop ? 0 : h - bandH;
  const g = ctx.createLinearGradient(0, y0, 0, y0 + bandH);
  if (atTop) {
    g.addColorStop(0, 'rgba(6, 3, 14, 0.62)');
    g.addColorStop(1, 'rgba(6, 3, 14, 0)');
  } else {
    g.addColorStop(0, 'rgba(6, 3, 14, 0)');
    g.addColorStop(1, 'rgba(6, 3, 14, 0.66)');
  }
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, bandH);
  ctx.restore();
}
