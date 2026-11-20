// Caption lettering for Neon Vice Cover Forge.
// Eight poster styles, all drawn with canvas text so they scale to
// any export size. The caption auto-fits the cover width, wraps to
// at most two lines, and sits across the lower third like a game
// cover; the subtitle rides beneath it in spaced capitals.

const BLACK = '"Forge Black", sans-serif';
const SERIF = '"Forge Serif", serif';

function gradient(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

export const LETTERING = [
  {
    id: 'blockbuster', name: 'Blockbuster',
    font: (s) => `${s}px ${BLACK}`,
    fill: () => '#ffffff',
    stroke: '#0a0a12', strokeW: 0.11, skew: -0.07,
  },
  {
    id: 'neon-glow', name: 'Neon Glow',
    font: (s) => `${s}px ${BLACK}`,
    fill: () => '#ff7ad9',
    stroke: '#2b0535', strokeW: 0.07,
    shadow: { color: '#ff2e88', blur: 0.34, dx: 0, dy: 0 },
  },
  {
    id: 'chrome', name: 'Chrome',
    font: (s) => `${s}px ${BLACK}`,
    fill: (ctx, x, y, w, h) => gradient(ctx, x, y, w, h, [[0, '#ffffff'], [0.38, '#9fdcff'], [0.55, '#2b6cb0'], [0.72, '#cfeeff'], [1, '#5aa7e8']]),
    stroke: '#0a1428', strokeW: 0.1,
  },
  {
    id: 'comic-pop', name: 'Comic Pop',
    font: (s) => `${s}px ${BLACK}`,
    fill: () => '#ffd23f',
    stroke: '#111111', strokeW: 0.11, rotate: -0.035,
    shadow: { color: '#111111', blur: 0, dx: 0.07, dy: 0.07 },
  },
  {
    id: 'stencil', name: 'Stencil',
    font: (s) => `${s}px ${BLACK}`,
    fill: () => null,
    stroke: '#ffffff', strokeW: 0.055, spacing: 0.16, upper: true,
  },
  {
    id: 'script-italic', name: 'Script Italic',
    font: (s) => `italic ${s}px ${SERIF}`,
    fill: (ctx, x, y, w, h) => gradient(ctx, x, y, w, h, [[0, '#fff3c4'], [0.5, '#ffd23f'], [1, '#e08a1e']]),
    stroke: '#3a2200', strokeW: 0.05, skew: -0.05,
  },
  {
    id: 'sunset-gradient', name: 'Sunset Gradient',
    font: (s) => `${s}px ${BLACK}`,
    fill: (ctx, x, y, w, h) => gradient(ctx, x, y, w, h, [[0, '#ffd23f'], [0.55, '#ff7a3c'], [1, '#ff2e88']]),
    stroke: '#ffffff', strokeW: 0.045,
  },
  {
    id: 'outline-ghost', name: 'Outline Ghost',
    font: (s) => `${s}px ${BLACK}`,
    fill: () => null,
    stroke: '#ffffff', strokeW: 0.09, upper: true,
  },
];

export function letteringById(id) {
  return LETTERING.find((l) => l.id === id) ?? LETTERING[0];
}

function wrapCaption(ctx, text, maxWidth, fontFor) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i++) {
    const trial = `${line} ${words[i]}`;
    if (ctx.measureText(trial).width <= maxWidth || lines.length >= 1) {
      line = trial;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines.slice(0, 2);
}

function fitFontSize(ctx, lines, style, maxWidth, startSize) {
  let size = startSize;
  while (size > 12) {
    ctx.font = style.font(size);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth) break;
    size *= maxWidth / widest;
  }
  return size;
}

function drawSpacedText(ctx, text, cx, cy, spacingPx, mode) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacingPx * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    if (mode === 'fill') ctx.fillText(c, x, cy);
    else ctx.strokeText(c, x, cy);
    x += widths[i] + spacingPx;
  });
  ctx.textAlign = prevAlign;
}

// Draws caption + subtitle across the lower third of a w×h cover.
export function drawCaption(ctx, w, h, caption, subtitle, styleId) {
  const style = letteringById(styleId);
  const text = (style.upper ? caption.toUpperCase() : caption).trim();
  if (!text && !subtitle.trim()) return;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  const maxWidth = w * 0.92;
  let size = Math.min(w * 0.16, h * 0.2);
  ctx.font = style.font(size);
  const lines = text ? wrapCaption(ctx, text, maxWidth, style.font) : [];
  if (lines.length) size = fitFontSize(ctx, lines, style, maxWidth, size);
  ctx.font = style.font(size);

  const lineH = size * 0.98;
  const blockH = lines.length * lineH;
  const subSize = Math.max(14, size * 0.3);
  const totalH = blockH + (subtitle.trim() ? subSize * 1.7 : 0);
  const baseY = h - totalH / 2 - h * 0.055;

  if (style.rotate) {
    ctx.translate(w / 2, baseY);
    ctx.rotate(style.rotate);
    ctx.translate(-w / 2, -baseY);
  }
  if (style.skew) {
    ctx.translate(w / 2, baseY);
    ctx.transform(1, 0, style.skew, 1, 0, 0);
    ctx.translate(-w / 2, -baseY);
  }

  const fillStyle = style.fill(ctx, 0, baseY - blockH / 2, w, blockH || size);
  lines.forEach((line, i) => {
    const cy = baseY - totalH / 2 + lineH * (i + 0.5);
    if (style.shadow) {
      ctx.shadowColor = style.shadow.color;
      ctx.shadowBlur = style.shadow.blur * size;
      ctx.shadowOffsetX = style.shadow.dx * size;
      ctx.shadowOffsetY = style.shadow.dy * size;
    }
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      if (style.spacing) drawSpacedText(ctx, line, w / 2, cy, style.spacing * size, 'fill');
      else ctx.fillText(line, w / 2, cy);
    }
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    if (style.stroke) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = Math.max(1, style.strokeW * size);
      if (style.spacing) drawSpacedText(ctx, line, w / 2, cy, style.spacing * size, 'stroke');
      else ctx.strokeText(line, w / 2, cy);
    }
  });

  if (subtitle.trim()) {
    const sub = subtitle.trim().toUpperCase();
    ctx.font = `${subSize}px ${BLACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(5,5,12,0.85)';
    ctx.lineWidth = Math.max(1, subSize * 0.16);
    const cy = baseY + totalH / 2 - subSize * 0.55;
    drawSpacedText(ctx, sub, w / 2, cy, subSize * 0.32, 'stroke');
    drawSpacedText(ctx, sub, w / 2, cy, subSize * 0.32, 'fill');
  }

  ctx.restore();
}
