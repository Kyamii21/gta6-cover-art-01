// Caption lettering for Cover Forge: four poster styles drawn with canvas
// text — gradient fills, heavy outlines, neon glow, chrome and retro serif.
// All fonts are system font stacks, so nothing is fetched or shipped.

const HEAVY_STACK = '"Arial Black", "Archivo Black", Impact, "Franklin Gothic Heavy", sans-serif';
const SANS_STACK = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF_STACK = 'Georgia, "Playfair Display", "Times New Roman", serif';

export const CAPTION_STYLES = {
  'sunset-block': { font: HEAVY_STACK, weight: 900, skew: -0.06 },
  'neon-sign': { font: SANS_STACK, weight: 800, skew: 0 },
  'chrome': { font: HEAVY_STACK, weight: 900, skew: -0.03 },
  'retro': { font: SERIF_STACK, weight: 700, skew: 0 },
};

function setFont(ctx, style, px) {
  ctx.font = `${style.weight} ${px}px ${style.font}`;
  try { ctx.letterSpacing = `${Math.max(1, px * 0.02)}px`; } catch (e) { /* older canvas: no letter-spacing */ }
}

function wrapLines(ctx, words, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(trial).width <= maxWidth || line === '') {
      line = trial;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

function fitCaption(ctx, text, style, w, h, sizeMul) {
  const maxWidth = w * 0.9;
  let px = Math.round(h * 0.135 * sizeMul);
  const words = text.split(/\s+/).filter(Boolean);
  let lines = [];
  while (px > 10) {
    setFont(ctx, style, px);
    lines = wrapLines(ctx, words, maxWidth);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest <= maxWidth && lines.length <= 2) break;
    px = Math.round(px * 0.92);
  }
  return { px, lines };
}

function gradientFor(ctx, styleId, x, yTop, yBottom) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
  if (styleId === 'sunset-block') {
    g.addColorStop(0, '#ffe45c');
    g.addColorStop(0.42, '#ff9a3c');
    g.addColorStop(0.72, '#ff4d7e');
    g.addColorStop(1, '#b04dff');
  } else if (styleId === 'chrome') {
    g.addColorStop(0, '#fdfdff');
    g.addColorStop(0.34, '#c9d4e6');
    g.addColorStop(0.5, '#5d6b85');
    g.addColorStop(0.56, '#eef3ff');
    g.addColorStop(0.78, '#8fa3c4');
    g.addColorStop(1, '#e8eefc');
  } else if (styleId === 'neon-sign') {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#bdf3ff');
  } else {
    g.addColorStop(0, '#fff6e0');
    g.addColorStop(1, '#f3d9a4');
  }
  return g;
}

function strokeLine(ctx, line, x, y, px, color, widthMul) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, px * widthMul);
  ctx.strokeText(line, x, y);
  ctx.restore();
}

// Draws the caption, wrapped and auto-fitted, at the top or bottom band.
export function drawCaption(ctx, w, h, rawText, styleId, sizeMul, atTop) {
  const text = (rawText || '').trim().toUpperCase();
  if (text === '') return;
  const style = CAPTION_STYLES[styleId] || CAPTION_STYLES['sunset-block'];
  const { px, lines } = fitCaption(ctx, text, style, w, h, sizeMul);
  const lineH = px * 1.04;
  const blockH = lineH * lines.length;
  const topY = atTop ? h * 0.045 : h * 0.955 - blockH;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (style.skew !== 0) {
    ctx.translate(w / 2, topY + blockH / 2);
    ctx.transform(1, 0, style.skew, 1, 0, 0);
    ctx.translate(-w / 2, -(topY + blockH / 2));
  }
  setFont(ctx, style, px);

  lines.forEach((line, i) => {
    const y = topY + i * lineH;
    const cx = w / 2;
    if (styleId === 'neon-sign') {
      ctx.save();
      ctx.shadowColor = '#ff3d8a';
      ctx.shadowBlur = px * 0.42;
      ctx.fillStyle = '#ffd7ef';
      ctx.fillText(line, cx, y);
      ctx.fillText(line, cx, y);
      ctx.shadowColor = '#2fd4c4';
      ctx.shadowBlur = px * 0.2;
      ctx.fillStyle = gradientFor(ctx, styleId, cx, y, y + px);
      ctx.fillText(line, cx, y);
      ctx.restore();
    } else if (styleId === 'retro') {
      ctx.save();
      ctx.fillStyle = '#c22e3e';
      ctx.fillText(line, cx + px * 0.045, y + px * 0.045);
      ctx.fillStyle = gradientFor(ctx, styleId, cx, y, y + px);
      ctx.fillText(line, cx, y);
      ctx.restore();
    } else {
      strokeLine(ctx, line, cx, y, px, 'rgba(10, 4, 18, 0.92)', 0.16);
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = px * 0.06;
      ctx.shadowOffsetY = px * 0.03;
      ctx.fillStyle = gradientFor(ctx, styleId, cx, y, y + px);
      ctx.fillText(line, cx, y);
      ctx.restore();
      if (styleId === 'sunset-block') {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line, cx, y - px * 0.012);
        ctx.restore();
      }
    }
  });
  ctx.restore();
}
