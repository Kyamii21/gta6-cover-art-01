// Cover renderer for Cover Forge: panel layouts in the comic-poster style,
// photo cover-fitting with per-panel zoom and shift, and the full cover
// paint (panels, grade wash, caption, grain, vignette) at any size.

import { gradeFilter, paintGradeWash, paintGrain, paintVignette, paintCaptionScrim } from './grades.js';
import { drawCaption } from './lettering.js';

export const LAYOUTS = {
  single: { label: 'Single', panels: 1 },
  duo: { label: 'Duo', panels: 2 },
  trio: { label: 'Trio', panels: 3 },
  quad: { label: 'Quad', panels: 4 },
  hero: { label: 'Hero + 2', panels: 3 },
};

function rect(x, y, w, h) {
  return { points: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], bbox: { x, y, w, h } };
}

function quad(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { points, bbox: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } };
}

// Panel polygons for a layout at a given canvas size, gutters included.
export function layoutPanels(layoutId, w, h) {
  const g = Math.max(4, Math.min(w, h) * 0.014);
  const s = h * 0.035; // divider slant
  switch (layoutId) {
    case 'single':
      return [rect(0, 0, w, h)];
    case 'duo': {
      const mid = w / 2;
      return [
        quad([[0, 0], [mid + s - g / 2, 0], [mid - s - g / 2, h], [0, h]]),
        quad([[mid + s + g / 2, 0], [w, 0], [w, h], [mid - s + g / 2, h]]),
      ];
    }
    case 'trio': {
      const splitY = h * 0.56;
      const mid = w / 2;
      return [
        rect(0, 0, w, splitY - g / 2),
        quad([[0, splitY + g / 2], [mid + s - g / 2, splitY + g / 2], [mid - s - g / 2, h], [0, h]]),
        quad([[mid + s + g / 2, splitY + g / 2], [w, splitY + g / 2], [w, h], [mid - s + g / 2, h]]),
      ];
    }
    case 'hero': {
      const splitX = w * 0.58;
      const midY = h / 2;
      return [
        quad([[0, 0], [splitX + s - g / 2, 0], [splitX - s - g / 2, h], [0, h]]),
        quad([[splitX + s + g / 2, 0], [w, 0], [w, midY - g / 2], [splitX + g / 2, midY - g / 2]]),
        quad([[splitX + g / 2, midY + g / 2], [w, midY + g / 2], [w, h], [splitX - s + g / 2, h]]),
      ];
    }
    case 'quad':
    default: {
      const mx = w / 2;
      const my = h / 2;
      return [
        rect(0, 0, mx - g / 2, my - g / 2),
        rect(mx + g / 2, 0, w - mx - g / 2, my - g / 2),
        rect(0, my + g / 2, mx - g / 2, h - my - g / 2),
        rect(mx + g / 2, my + g / 2, w - mx - g / 2, h - my - g / 2),
      ];
    }
  }
}

function tracePolygon(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function pointInPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// Which panel (index) sits under a canvas point, or -1.
export function panelAt(layoutId, w, h, x, y) {
  const panels = layoutPanels(layoutId, w, h);
  for (let i = 0; i < panels.length; i++) {
    if (pointInPolygon(panels[i].points, x, y)) return i;
  }
  return -1;
}

function drawPhotoCover(ctx, img, bbox, panel, filter) {
  const { x, y, w, h } = bbox;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2 + panel.ox * Math.max(0, (dw - w) / 2);
  const dy = y + (h - dh) / 2 + panel.oy * Math.max(0, (dh - h) / 2);
  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawPlaceholder(ctx, bbox, index) {
  const { x, y, w, h } = bbox;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#2a1052');
  g.addColorStop(0.55, '#8a2a7a');
  g.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, w * 0.01);
  const step = Math.max(18, w / 9);
  ctx.beginPath();
  for (let d = -h; d < w + h; d += step) {
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.font = `900 ${Math.round(Math.min(w, h) * 0.34)}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.02);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.strokeText(String(index + 1), x + w / 2, y + h / 2);
  ctx.restore();
}

// Paints the whole cover: black gutters, graded photo panels, caption,
// grain and vignette. The same function paints preview and export.
export function renderCover(ctx, w, h, state) {
  ctx.save();
  ctx.fillStyle = '#07040d';
  ctx.fillRect(0, 0, w, h);

  const panels = layoutPanels(state.layout, w, h);
  const filter = gradeFilter(state.grade);

  panels.forEach((panel, i) => {
    const p = state.panels[i] || { photoIdx: -1, zoom: 1, ox: 0, oy: 0 };
    const photo = p.photoIdx >= 0 ? state.photos[p.photoIdx] : null;
    ctx.save();
    tracePolygon(ctx, panel.points);
    ctx.clip();
    if (photo && photo.img) {
      drawPhotoCover(ctx, photo.img, panel.bbox, p, filter);
    } else {
      drawPlaceholder(ctx, panel.bbox, i);
    }
    paintGradeWash(ctx, panel.bbox.x, panel.bbox.y, panel.bbox.w, panel.bbox.h, state.grade);
    ctx.restore();

    ctx.save();
    tracePolygon(ctx, panel.points);
    ctx.strokeStyle = 'rgba(5, 2, 10, 0.95)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.006);
    ctx.stroke();
    ctx.restore();
  });

  if (state.selectedPanel >= 0 && state.showSelection && panels[state.selectedPanel]) {
    ctx.save();
    tracePolygon(ctx, panels[state.selectedPanel].points);
    ctx.strokeStyle = '#2fd4c4';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
    ctx.setLineDash([Math.min(w, h) * 0.02, Math.min(w, h) * 0.012]);
    ctx.stroke();
    ctx.restore();
  }

  paintCaptionScrim(ctx, w, h, state.captionTop);
  drawCaption(ctx, w, h, state.caption, state.captionStyle, state.captionSize, state.captionTop);
  paintGrain(ctx, w, h, state.grain);
  paintVignette(ctx, w, h, state.vignette);
  ctx.restore();
}
