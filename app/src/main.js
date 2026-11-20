// Neon Vice Cover Forge — studio logic.
// Loads photos (eight built-in scenes plus the user's own uploads),
// renders multi-panel covers on canvas with the grade pipeline from
// grades.js and the lettering from lettering.js, and exports PNGs
// at the three post sizes. Photos are graded once per grade setting
// and cached, so dragging and zooming panels stays at frame rate.
// A ?shot= mode renders deterministic presets for screenshots.

import { LAYOUTS, layoutById, panelBox, panelContains } from './layouts.js';
import { GRADES, resolveGrade, cssFilter, applyGrade, applyVignette } from './grades.js';
import { LETTERING, drawCaption } from './lettering.js';

const SAMPLES = ['sunset-beach', 'neon-street', 'skyline', 'boulevard', 'pier', 'marina', 'desert-road', 'boardwalk'];
const SIZES = { '1080x1080': [1080, 1080], '1080x1350': [1080, 1350], '1920x1080': [1920, 1080] };
const CAPTIONS = ['NEON VICE', 'SUNSET HEIST', 'MIDNIGHT RUN', 'LEONIDA NIGHTS', 'VICE CITY BLUES', 'GOLDEN HOUR', 'PALM TREE BANDIT', 'OCEAN DRIVE', 'LAST LIGHT', 'HEAT WAVE'];
const GUTTER_COLOR = '#0a0a10';
const GRADE_CACHE_CAP = 1600;

const state = {
  layoutId: 'big-two',
  gradeId: 'vice-sunset',
  gradeOverrides: {},
  letteringId: 'blockbuster',
  caption: 'NEON VICE',
  subtitle: 'COVER FORGE',
  size: [1080, 1080],
  photos: [],
  panels: [],
  selected: 0,
  chosenPhoto: 0,
};

const preview = document.getElementById('preview');
const pctx = preview.getContext('2d');
const gradedCache = new Map();
let renderQueued = false;

function gradeParams() {
  return resolveGrade(state.gradeId, state.gradeOverrides);
}

function gradeKey(p) {
  return [p.posterize, p.ink, p.duotone, p.duoDark.join(','), p.duoLight.join(','),
    p.halftone, p.grain, p.saturation, p.contrast, p.brightness, p.hue].join('|');
}

// The photo with the current grade baked in, cached per grade setting.
function gradedPhoto(photo) {
  const p = gradeParams();
  const key = `${photo.id}|${gradeKey(p)}`;
  let canvas = gradedCache.get(key);
  if (canvas) return canvas;
  const img = photo.img;
  const scale = Math.min(1, GRADE_CACHE_CAP / Math.max(img.naturalWidth, img.naturalHeight));
  canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = canvas.getContext('2d');
  c.filter = cssFilter(p);
  c.drawImage(img, 0, 0, canvas.width, canvas.height);
  c.filter = 'none';
  applyGrade(canvas, p, 4242 + photo.id * 97, canvas.width / 1200);
  gradedCache.set(key, canvas);
  return canvas;
}

function panelPath(ctx, panel, w, h, inset) {
  ctx.beginPath();
  if (panel.poly) {
    panel.poly.forEach(([nx, ny], i) => {
      const x = nx * w, y = ny * h;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
  } else {
    ctx.rect(panel.x * w + inset, panel.y * h + inset, panel.w * w - inset * 2, panel.h * h - inset * 2);
  }
}

// Draws one panel: the graded photo cover-fitted into the panel box,
// panned by dx/dy (-1..1 across the overflow) and scaled by zoom.
function drawPanel(ctx, panel, slot, w, h, gutter) {
  const box = panelBox(panel);
  const px = box.x * w, py = box.y * h, pw = box.w * w, ph = box.h * h;
  const photo = state.photos[slot.photo];
  ctx.save();
  panelPath(ctx, panel, w, h, panel.poly ? 0 : gutter / 2);
  ctx.clip();
  if (photo && photo.img.complete && photo.img.naturalWidth > 0) {
    const src = gradedPhoto(photo);
    const base = Math.max(pw / src.width, ph / src.height);
    const scale = base * slot.zoom;
    const dw = src.width * scale, dh = src.height * scale;
    const x = px + (pw - dw) * ((slot.dx + 1) / 2);
    const y = py + (ph - dh) * ((slot.dy + 1) / 2);
    ctx.drawImage(src, x, y, dw, dh);
  } else {
    ctx.fillStyle = '#241640';
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
  if (panel.poly) {
    ctx.save();
    panelPath(ctx, panel, w, h, 0);
    ctx.strokeStyle = GUTTER_COLOR;
    ctx.lineWidth = gutter;
    ctx.stroke();
    ctx.restore();
  }
}

// Renders the whole cover into ctx at w×h. `editor` adds the
// selected-panel outline (never part of an export).
function renderCover(ctx, w, h, editor = false) {
  const layout = layoutById(state.layoutId);
  const panels = layout.panels();
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  ctx.fillStyle = GUTTER_COLOR;
  ctx.fillRect(0, 0, w, h);
  panels.forEach((panel, i) => {
    const slot = state.panels[i] ?? { photo: 0, dx: 0, dy: 0, zoom: 1 };
    drawPanel(ctx, panel, slot, w, h, gutter);
  });
  applyVignette(ctx, w, h, gradeParams().vignette);
  drawCaption(ctx, w, h, state.caption, state.subtitle, state.letteringId);
  if (editor && panels[state.selected]) {
    ctx.save();
    panelPath(ctx, panels[state.selected], w, h, gutter / 2);
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.setLineDash([w * 0.012, w * 0.008]);
    ctx.stroke();
    ctx.restore();
  }
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const [w, h] = state.size;
    if (preview.width !== w || preview.height !== h) { preview.width = w; preview.height = h; }
    renderCover(pctx, w, h, !document.body.classList.contains('shot-cover'));
  });
}

function syncPanels() {
  const count = layoutById(state.layoutId).panels().length;
  const next = [];
  for (let i = 0; i < count; i++) {
    next.push(state.panels[i] ?? { photo: state.photos.length ? i % state.photos.length : 0, dx: 0, dy: 0, zoom: 1 });
  }
  state.panels = next;
  state.selected = Math.min(state.selected, count - 1);
  document.getElementById('selected-panel-label').textContent = String(state.selected + 1);
}

function loadPhoto(name, url, sample = false) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ id: state.photos.length, name, img, url, sample });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadSamples() {
  const loaded = await Promise.all(SAMPLES.map((n) => loadPhoto(n, `samples/${n}.jpg`, true)));
  state.photos = loaded.filter(Boolean);
  state.photos.forEach((p, i) => { p.id = i; });
  buildPhotoStrip();
  syncPanels();
  queueRender();
}

function buildPhotoStrip() {
  const strip = document.getElementById('photo-strip');
  strip.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const el = document.createElement('img');
    el.src = photo.url;
    el.alt = photo.name;
    el.title = photo.name;
    if (i === state.chosenPhoto) el.classList.add('chosen');
    el.addEventListener('click', () => {
      state.chosenPhoto = i;
      const slot = state.panels[state.selected];
      if (slot) { slot.photo = i; slot.dx = 0; slot.dy = 0; slot.zoom = 1; }
      buildPhotoStrip();
      queueRender();
    });
    strip.appendChild(el);
  });
}

function buildPicker(elId, items, currentId, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.name;
    if (item.id === currentId) b.classList.add('active');
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  }
}

const SLIDERS = ['posterize', 'ink', 'duotone', 'halftone', 'grain', 'vignette', 'saturation', 'contrast'];

function syncSliders() {
  const p = gradeParams();
  for (const key of SLIDERS) {
    document.getElementById(`sl-${key}`).value = p[key];
    document.getElementById(`out-${key}`).textContent = p[key];
  }
}

function refreshPickers() {
  buildPicker('layout-picker', LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id; syncPanels(); refreshPickers(); queueRender();
  });
  buildPicker('grade-picker', GRADES, state.gradeId, (id) => {
    state.gradeId = id; state.gradeOverrides = {}; syncSliders(); refreshPickers(); queueRender();
  });
  buildPicker('lettering-picker', LETTERING, state.letteringId, (id) => {
    state.letteringId = id; refreshPickers(); queueRender();
  });
  document.querySelectorAll('#size-picker button').forEach((b) => {
    b.classList.toggle('active', SIZES[b.dataset.size].join('x') === state.size.join('x'));
  });
}

function wireControls() {
  document.getElementById('file-input').addEventListener('change', async (ev) => {
    for (const file of ev.target.files) {
      const photo = await loadPhoto(file.name, URL.createObjectURL(file));
      if (photo) { photo.id = state.photos.length; state.photos.push(photo); }
    }
    buildPhotoStrip();
    queueRender();
  });
  document.getElementById('btn-fill-all').addEventListener('click', () => {
    for (const slot of state.panels) { slot.photo = state.chosenPhoto; slot.dx = 0; slot.dy = 0; slot.zoom = 1; }
    queueRender();
  });
  for (const key of SLIDERS) {
    document.getElementById(`sl-${key}`).addEventListener('input', (ev) => {
      state.gradeOverrides[key] = Number(ev.target.value);
      document.getElementById(`out-${key}`).textContent = ev.target.value;
      queueRender();
    });
  }
  document.getElementById('caption-input').addEventListener('input', (ev) => { state.caption = ev.target.value; queueRender(); });
  document.getElementById('subtitle-input').addEventListener('input', (ev) => { state.subtitle = ev.target.value; queueRender(); });
  document.querySelectorAll('#size-picker button').forEach((b) => {
    b.addEventListener('click', () => { state.size = SIZES[b.dataset.size]; refreshPickers(); queueRender(); });
  });
  document.getElementById('btn-shuffle').addEventListener('click', shuffle);
  document.getElementById('btn-export').addEventListener('click', exportPng);
}

function shuffle() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layoutId = pick(LAYOUTS).id;
  state.gradeId = pick(GRADES).id;
  state.gradeOverrides = {};
  state.letteringId = pick(LETTERING).id;
  state.caption = pick(CAPTIONS);
  document.getElementById('caption-input').value = state.caption;
  syncPanels();
  for (const slot of state.panels) {
    slot.photo = Math.floor(Math.random() * state.photos.length);
    slot.dx = 0; slot.dy = 0; slot.zoom = 1;
  }
  syncSliders();
  refreshPickers();
  queueRender();
}

function exportPng() {
  const [w, h] = state.size;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  renderCover(canvas.getContext('2d'), w, h, false);
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

// --- Panel interaction: click to select, drag to pan, wheel or
// two-finger pinch to zoom, double-click to reset.
let drag = null;
const activePointers = new Map();
let pinchStart = null;

function canvasPoint(ev) {
  const r = preview.getBoundingClientRect();
  return { nx: (ev.clientX - r.left) / r.width, ny: (ev.clientY - r.top) / r.height, r };
}

function pinchDistance() {
  const pts = [...activePointers.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

preview.addEventListener('pointerdown', (ev) => {
  activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const { nx, ny } = canvasPoint(ev);
  const panels = layoutById(state.layoutId).panels();
  const idx = panels.findIndex((p) => panelContains(p, nx, ny));
  if (idx >= 0) {
    state.selected = idx;
    document.getElementById('selected-panel-label').textContent = String(idx + 1);
  }
  const slot = state.panels[state.selected];
  drag = { x: ev.clientX, y: ev.clientY, dx: slot.dx, dy: slot.dy };
  if (activePointers.size === 2) {
    pinchStart = { dist: pinchDistance(), zoom: slot.zoom };
    drag = null;
  }
  preview.setPointerCapture(ev.pointerId);
  queueRender();
});

preview.addEventListener('pointermove', (ev) => {
  if (activePointers.has(ev.pointerId)) {
    activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  }
  if (pinchStart && activePointers.size >= 2) {
    const slot = state.panels[state.selected];
    const dist = pinchDistance();
    if (dist > 0 && pinchStart.dist > 0) {
      slot.zoom = clamp(pinchStart.zoom * (dist / pinchStart.dist), 1, 4);
      queueRender();
    }
    return;
  }
  if (!drag) return;
  const slot = state.panels[state.selected];
  const panel = layoutById(state.layoutId).panels()[state.selected];
  const box = panelBox(panel);
  const photo = state.photos[slot.photo];
  if (!photo) return;
  const [w, h] = state.size;
  const pw = box.w * w, ph = box.h * h;
  const src = gradedPhoto(photo);
  const base = Math.max(pw / src.width, ph / src.height) * slot.zoom;
  const overX = src.width * base - pw, overY = src.height * base - ph;
  const r = preview.getBoundingClientRect();
  const scaleX = w / r.width, scaleY = h / r.height;
  if (overX > 1) slot.dx = clamp(drag.dx - ((ev.clientX - drag.x) * scaleX * 2) / overX, -1, 1);
  if (overY > 1) slot.dy = clamp(drag.dy - ((ev.clientY - drag.y) * scaleY * 2) / overY, -1, 1);
  queueRender();
});

preview.addEventListener('pointerup', (ev) => {
  activePointers.delete(ev.pointerId);
  if (activePointers.size < 2) pinchStart = null;
  if (activePointers.size === 0) drag = null;
});
preview.addEventListener('pointercancel', (ev) => {
  activePointers.delete(ev.pointerId);
  if (activePointers.size < 2) pinchStart = null;
  if (activePointers.size === 0) drag = null;
});

preview.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const slot = state.panels[state.selected];
  slot.zoom = clamp(slot.zoom * Math.exp(-ev.deltaY * 0.0012), 1, 4);
  queueRender();
}, { passive: false });

preview.addEventListener('dblclick', () => {
  const slot = state.panels[state.selected];
  slot.dx = 0; slot.dy = 0; slot.zoom = 1;
  queueRender();
});

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// --- Screenshot presets (?shot=cover|editor&layout=..&grade=..&...)
function applyShotParams(params) {
  if (params.get('layout')) state.layoutId = params.get('layout');
  if (params.get('grade')) state.gradeId = params.get('grade');
  if (params.get('lettering')) state.letteringId = params.get('lettering');
  if (params.get('caption')) state.caption = params.get('caption');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('size') && SIZES[params.get('size')]) state.size = SIZES[params.get('size')];
  document.getElementById('caption-input').value = state.caption;
  document.getElementById('subtitle-input').value = state.subtitle;
  syncPanels();
  const wanted = (params.get('photos') ?? '').split(',').filter(Boolean);
  wanted.forEach((name, i) => {
    const idx = state.photos.findIndex((p) => p.name === name);
    if (idx >= 0 && state.panels[i]) state.panels[i].photo = idx;
  });
}

async function boot() {
  wireControls();
  refreshPickers();
  syncSliders();
  await loadSamples();
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    applyShotParams(params);
    if (shot === 'cover') document.body.classList.add('shot-cover');
    syncSliders();
    refreshPickers();
  }
  await Promise.all([
    document.fonts.load('900 40px "Forge Black"'),
    document.fonts.load('italic 700 40px "Forge Serif"'),
    document.fonts.load('italic 700 40px "Forge Italic"'),
  ]).catch(() => {});
  queueRender();
  if (shot) {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  }
}

boot();
