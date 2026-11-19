// Neon Poster rendering engine: multi-panel layouts, colour grades (including a
// posterize + inked-edge "Poster Comic" grade done with raw pixels), and stacked
// two-line poster lettering. Pure canvas 2D, no libraries, no network.

export const LAYOUTS = {
  single: { label: 'Single', panels: [{ x: 0, y: 0, w: 1, h: 1 }] },
  duo: {
    label: 'Duo',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  trio: {
    label: 'Trio',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  quad: {
    label: 'Quad 2×2',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  hero: {
    label: 'Hero + 2',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
  banner: {
    label: 'Banner + 2',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.58 },
      { x: 0, y: 0.58, w: 0.5, h: 0.42 },
      { x: 0.5, y: 0.58, w: 0.5, h: 0.42 },
    ],
  },
};

export const GRADES = {
  sunset: { label: 'Sunset', filter: 'saturate(1.35) contrast(1.08) brightness(1.03)' },
  neon: { label: 'Neon Night', filter: 'saturate(1.65) contrast(1.16) brightness(1.02)' },
  poster: { label: 'Poster Comic', filter: 'saturate(1.18) contrast(1.06)' },
  golden: { label: 'Golden Hour', filter: 'sepia(0.32) saturate(1.35) contrast(1.05) brightness(1.04)' },
  noir: { label: 'Mono Noir', filter: 'grayscale(1) contrast(1.28) brightness(1.02)' },
};

export const CAPTION_STYLES = {
  sunset: { label: 'Sunset Fill' },
  neon: { label: 'Neon Glow' },
  chrome: { label: 'Chrome' },
  pop: { label: 'Poster Pop' },
};

/** A fresh panel state. Framing defaults favour the upper part of the photo so
 *  faces and subjects near the top are not cut off (oy -0.45 shows the top). */
export function freshPanel(photoId = null) {
  return { photoId, zoom: 1, ox: 0, oy: -0.45 };
}

/** Posterize + ink edges: flattens colour into bands and darkens strong edges so
 *  a photograph reads like printed poster illustration. Returns a canvas. */
export function posterizeImage(img) {
  const MAX = 1100;
  const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const lum = new Float32Array(w * h);
  const STEPS = 5;
  for (let i = 0, p = 0; i < px.length; i += 4, p++) {
    let r = px[i], g = px[i + 1], b = px[i + 2];
    // gentle saturation lift before flattening
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 1.25; g = avg + (g - avg) * 1.25; b = avg + (b - avg) * 1.25;
    const q = (v) => Math.round(Math.max(0, Math.min(255, v)) / 255 * (STEPS - 1)) / (STEPS - 1) * 255;
    px[i] = q(r); px[i + 1] = q(g); px[i + 2] = q(b);
    lum[p] = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
  }
  // ink: darken where luminance jumps to a neighbour
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const p = y * w + x;
      const edge = Math.max(Math.abs(lum[p] - lum[p + 1]), Math.abs(lum[p] - lum[p + w]));
      if (edge > 26) {
        const f = Math.max(0.25, 1 - (edge - 26) / 90);
        const i = p * 4;
        px[i] *= f; px[i + 1] *= f; px[i + 2] *= f;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

function gradeOverlay(ctx, gradeId, x, y, w, h) {
  let g;
  if (gradeId === 'sunset') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,170,60,0.10)');
    g.addColorStop(0.55, 'rgba(255,90,90,0.06)');
    g.addColorStop(1, 'rgba(190,30,110,0.30)');
  } else if (gradeId === 'neon') {
    g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(30,200,255,0.16)');
    g.addColorStop(0.5, 'rgba(120,40,200,0.10)');
    g.addColorStop(1, 'rgba(255,40,160,0.24)');
  } else if (gradeId === 'golden') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,200,90,0.16)');
    g.addColorStop(1, 'rgba(160,80,20,0.22)');
  } else if (gradeId === 'noir') {
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0.05)');
    g.addColorStop(1, 'rgba(0,0,0,0.38)');
  } else { // poster
    g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,160,60,0.08)');
    g.addColorStop(1, 'rgba(200,40,120,0.20)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // vignette
  const v = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
}

function drawPanelPhoto(ctx, source, panel, rect, gradeId) {
  const iw = source.naturalWidth ?? source.width;
  const ih = source.naturalHeight ?? source.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const dw = iw * base * panel.zoom;
  const dh = ih * base * panel.zoom;
  const dx = rect.x - (dw - rect.w) * (0.5 + panel.ox * 0.5);
  const dy = rect.y - (dh - rect.h) * (0.5 + panel.oy * 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = GRADES[gradeId]?.filter ?? 'none';
  ctx.drawImage(source, dx, dy, dw, dh);
  ctx.filter = 'none';
  gradeOverlay(ctx, gradeId, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function drawPlaceholder(ctx, rect, index) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  g.addColorStop(0, '#2a1140');
  g.addColorStop(1, '#12081f');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(230,219,255,0.75)';
  ctx.font = `700 ${Math.max(14, Math.min(rect.w, rect.h) * 0.07)}px "Poster Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Panel ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2 - 14);
  ctx.font = `400 ${Math.max(11, Math.min(rect.w, rect.h) * 0.045)}px "Poster Sans", sans-serif`;
  ctx.fillStyle = 'rgba(185,166,217,0.8)';
  ctx.fillText('add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2 + 16);
}

function fitFont(ctx, text, weight, size, maxWidth) {
  let s = size;
  ctx.font = `${weight} ${s}px "Poster Sans", sans-serif`;
  while (ctx.measureText(text).width > maxWidth && s > 10) {
    s -= 2;
    ctx.font = `${weight} ${s}px "Poster Sans", sans-serif`;
  }
  return s;
}

function captionFill(ctx, style, x, yTop, yBottom) {
  if (style === 'sunset') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#ffe259');
    g.addColorStop(0.45, '#ffa751');
    g.addColorStop(0.8, '#ff4fa3');
    g.addColorStop(1, '#c9187a');
    return g;
  }
  if (style === 'chrome') {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#cfe8ff');
    g.addColorStop(0.52, '#5f8fce');
    g.addColorStop(0.55, '#eaf6ff');
    g.addColorStop(1, '#7fb2e8');
    return g;
  }
  if (style === 'pop') return '#ffd60a';
  return '#eafcff'; // neon
}

function drawCaption(ctx, w, h, cap) {
  const lines = [cap.line1, cap.line2].map((t) => (t ?? '').trim().toUpperCase()).filter(Boolean);
  if (!lines.length) return;
  const baseSize = (h * 0.115) * (cap.size / 100);
  const maxW = w * 0.92;
  const sizes = lines.map((t, i) => fitFont(ctx, t, 700, i === 0 ? baseSize : baseSize * 0.8, maxW));
  const lineH = sizes.map((s) => s * 1.04);
  const blockH = lineH.reduce((a, b) => a + b, 0);
  const blockBottom = (cap.y / 100) * h;
  const blockTop = blockBottom - blockH;
  const cx = w / 2;
  const cy = blockTop + blockH / 2;

  // scrim behind the lettering for legibility
  const scrim = ctx.createLinearGradient(0, Math.max(0, blockTop - blockH * 0.5), 0, Math.min(h, blockBottom + blockH * 0.35));
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(0.5, 'rgba(0,0,0,0.42)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, Math.max(0, blockTop - blockH * 0.5), w, Math.min(h, blockBottom + blockH * 0.35) - Math.max(0, blockTop - blockH * 0.5));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((cap.tilt ?? 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  let y = blockTop;
  lines.forEach((text, i) => {
    const s = sizes[i];
    y += lineH[i];
    const baseline = y - s * 0.12;
    ctx.font = `700 ${s}px "Poster Sans", sans-serif`;
    if (cap.style === 'pop') {
      ctx.fillStyle = '#12081f';
      ctx.fillText(text, cx + s * 0.055, baseline + s * 0.055);
    }
    if (cap.style === 'neon') {
      ctx.shadowColor = '#ff2fb3';
      ctx.shadowBlur = s * 0.35;
    }
    if (cap.outline > 0) {
      ctx.strokeStyle = cap.style === 'chrome' ? '#0b1e3a' : '#14061f';
      ctx.lineWidth = cap.outline * (s / 100);
      ctx.strokeText(text, cx, baseline);
    }
    ctx.fillStyle = captionFill(ctx, cap.style, cx, baseline - s, baseline);
    ctx.fillText(text, cx, baseline);
    if (cap.style === 'neon') { // second pass tightens the glow core
      ctx.shadowBlur = s * 0.12;
      ctx.fillText(text, cx, baseline);
      ctx.shadowBlur = 0;
    }
  });
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` at the canvas's own pixel size.
 * state: { layout, panels, photos: Map(id -> {img, poster}), grade, gap, frame,
 *          caption: {line1, line2, style, size, outline, y, tilt}, selected }
 * `forExport` hides the selection outline.
 */
export function drawCover(canvas, state, forExport = false) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = state.frame || '#12081f';
  ctx.fillRect(0, 0, w, h);
  const rects = LAYOUTS[state.layout].panels;
  const gapPx = (state.gap / 1080) * Math.min(w, h);
  rects.forEach((r, i) => {
    const rect = {
      x: r.x * w + gapPx / 2,
      y: r.y * h + gapPx / 2,
      w: r.w * w - gapPx,
      h: r.h * h - gapPx,
    };
    const panel = state.panels[i] ?? freshPanel();
    const photo = panel.photoId != null ? state.photos.get(panel.photoId) : null;
    if (photo) {
      const source = state.grade === 'poster' ? (photo.poster ?? photo.img) : photo.img;
      drawPanelPhoto(ctx, source, panel, rect, state.grade);
    } else {
      drawPlaceholder(ctx, rect, i);
    }
    if (!forExport && state.selected === i) {
      ctx.save();
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = Math.max(3, w * 0.003);
      ctx.setLineDash([w * 0.012, w * 0.008]);
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.restore();
    }
  });
  drawCaption(ctx, w, h, state.caption);
}

/** Panel rectangles in canvas pixels (for hit-testing in the editor). */
export function panelRects(w, h, layout, gap) {
  const gapPx = (gap / 1080) * Math.min(w, h);
  return LAYOUTS[layout].panels.map((r) => ({
    x: r.x * w + gapPx / 2,
    y: r.y * h + gapPx / 2,
    w: r.w * w - gapPx,
    h: r.h * h - gapPx,
  }));
}
