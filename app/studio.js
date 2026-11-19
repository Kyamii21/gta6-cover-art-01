// Cover Forge studio: editor state, photo loading, panel interaction,
// live preview, PNG export, and the ?shot= presets used for screenshots.

import { LAYOUTS, layoutPanels, panelAt, renderCover } from './cover-renderer.js';

const SAMPLE_SOURCES = ['samples/boulevard.jpg', 'samples/pier.jpg'];

const state = {
  photos: [], // { img, name, thumbSrc }
  layout: 'quad',
  panels: [],
  grade: 'sunset',
  grain: 0.35,
  vignette: 0.45,
  caption: 'VICE CITY NIGHTS',
  captionStyle: 'sunset-block',
  captionSize: 1,
  captionTop: false,
  selectedPanel: 0,
  showSelection: true,
  exportSize: { w: 1920, h: 1080 },
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');
let renderQueued = false;

function ensurePanels() {
  const count = LAYOUTS[state.layout].panels;
  while (state.panels.length < count) {
    const idx = state.photos.length > 0 ? state.panels.length % state.photos.length : -1;
    state.panels.push({ photoIdx: idx, zoom: 1, ox: 0, oy: 0 });
  }
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

function previewSize() {
  const { w, h } = state.exportSize;
  const scale = Math.min(1, 1280 / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function render() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    ensurePanels();
    const size = document.body.classList.contains('shot-cover')
      ? { w: window.innerWidth, h: window.innerHeight }
      : previewSize();
    if (preview.width !== size.w || preview.height !== size.h) {
      preview.width = size.w;
      preview.height = size.h;
    }
    renderCover(pctx, size.w, size.h, state);
    syncPanelControls();
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function addPhoto(src, name) {
  const img = await loadImage(src);
  state.photos.push({ img, name, thumbSrc: src });
  const idx = state.photos.length - 1;
  state.panels.forEach((p, i) => {
    if (p.photoIdx < 0) p.photoIdx = idx % state.photos.length;
    void i;
  });
  buildPhotoStrip();
  render();
  return idx;
}

async function loadSamples() {
  for (const src of SAMPLE_SOURCES) {
    if (!state.photos.some((p) => p.thumbSrc === src)) {
      await addPhoto(src, src.split('/').pop());
    }
  }
  // Spread the samples across panels for an instant poster.
  state.panels.forEach((p, i) => {
    if (state.photos.length > 0) p.photoIdx = i % state.photos.length;
  });
  buildPhotoStrip();
  render();
}

function buildPhotoStrip() {
  const strip = $('photoStrip');
  strip.textContent = '';
  state.photos.forEach((photo, i) => {
    const el = document.createElement('img');
    el.className = 'photo-thumb';
    el.src = photo.thumbSrc;
    el.alt = photo.name;
    el.title = photo.name;
    if (state.panels.some((p) => p.photoIdx === i)) el.classList.add('is-used');
    el.addEventListener('click', () => {
      ensurePanels();
      state.panels[state.selectedPanel].photoIdx = i;
      buildPhotoStrip();
      render();
    });
    strip.appendChild(el);
  });
}

function syncPanelControls() {
  ensurePanels();
  const p = state.panels[state.selectedPanel];
  $('panelBadge').textContent = String(state.selectedPanel + 1);
  $('zoomRange').value = p.zoom;
  $('shiftXRange').value = p.ox;
  $('shiftYRange').value = p.oy;
}

function wireButtonGroup(containerId, attr, apply) {
  const box = $(containerId);
  box.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      apply(btn.dataset[attr]);
      render();
    });
  });
}

function setActiveInGroup(containerId, attr, value) {
  $(containerId).querySelectorAll('button').forEach((b) => {
    b.classList.toggle('is-active', b.dataset[attr] === value);
  });
}

function canvasPoint(event) {
  const rect = preview.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * preview.width,
    y: ((event.clientY - rect.top) / rect.height) * preview.height,
  };
}

let dragging = null;

function wirePointer() {
  preview.addEventListener('pointerdown', (event) => {
    const pt = canvasPoint(event);
    const hit = panelAt(state.layout, preview.width, preview.height, pt.x, pt.y);
    if (hit >= 0) state.selectedPanel = hit;
    dragging = { x: pt.x, y: pt.y };
    preview.setPointerCapture(event.pointerId);
    render();
  });
  preview.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const pt = canvasPoint(event);
    const panels = layoutPanels(state.layout, preview.width, preview.height);
    const bbox = panels[state.selectedPanel].bbox;
    const p = state.panels[state.selectedPanel];
    p.ox = Math.max(-1, Math.min(1, p.ox + ((pt.x - dragging.x) / bbox.w) * 1.6));
    p.oy = Math.max(-1, Math.min(1, p.oy + ((pt.y - dragging.y) / bbox.h) * 1.6));
    dragging = pt;
    render();
  });
  const stop = () => { dragging = null; };
  preview.addEventListener('pointerup', stop);
  preview.addEventListener('pointercancel', stop);
  preview.addEventListener('wheel', (event) => {
    event.preventDefault();
    const p = state.panels[state.selectedPanel];
    p.zoom = Math.max(1, Math.min(3, p.zoom * Math.exp(-event.deltaY * 0.0012)));
    render();
  }, { passive: false });
}

function wireDrop() {
  const wrap = $('canvasWrap');
  const veilOn = (on) => wrap.classList.toggle('is-dropping', on);
  ['dragenter', 'dragover'].forEach((name) => wrap.addEventListener(name, (e) => { e.preventDefault(); veilOn(true); }));
  ['dragleave', 'drop'].forEach((name) => wrap.addEventListener(name, (e) => { e.preventDefault(); veilOn(false); }));
  wrap.addEventListener('drop', async (e) => {
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith('image/')) await addPhoto(URL.createObjectURL(file), file.name);
    }
  });
}

function exportPng() {
  ensurePanels();
  const { w, h } = state.exportSize;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const wasShowing = state.showSelection;
  state.showSelection = false;
  renderCover(out.getContext('2d'), w, h, state);
  state.showSelection = wasShowing;
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

const SHOT_PRESETS = {
  'cover-wide': { layout: 'quad', grade: 'sunset', caption: 'VICE CITY NIGHTS', captionStyle: 'sunset-block', captionSize: 1.05, zooms: [1.15, 1.3, 1.05, 1.25], shifts: [[0.2, -0.1], [-0.25, 0.15], [0, 0.2], [0.3, 0]] },
  'cover-square': { layout: 'trio', grade: 'neon', caption: 'NEON DISTRICT', captionStyle: 'neon-sign', captionSize: 1.1, zooms: [1.2, 1.35, 1.1], shifts: [[0, -0.15], [0.25, 0.1], [-0.2, 0]] },
  'cover-portrait': { layout: 'hero', grade: 'duotone', caption: 'MIDNIGHT RUN', captionStyle: 'chrome', captionSize: 1.15, zooms: [1.25, 1.4, 1.15], shifts: [[0.15, 0], [-0.2, -0.1], [0.1, 0.2]] },
  'editor': { layout: 'quad', grade: 'sunset', caption: 'VICE CITY NIGHTS', captionStyle: 'sunset-block', captionSize: 1, zooms: [1.15, 1.3, 1.05, 1.25], shifts: [[0.2, -0.1], [-0.25, 0.15], [0, 0.2], [0.3, 0]] },
};

async function applyShotPreset(name) {
  const preset = SHOT_PRESETS[name];
  if (!preset) return false;
  if (name.startsWith('cover-')) document.body.classList.add('shot-cover');
  state.layout = preset.layout;
  state.grade = preset.grade;
  state.caption = preset.caption;
  state.captionStyle = preset.captionStyle;
  state.captionSize = preset.captionSize;
  state.showSelection = name === 'editor';
  await loadSamples();
  state.panels.forEach((p, i) => {
    p.zoom = preset.zooms[i % preset.zooms.length];
    const [ox, oy] = preset.shifts[i % preset.shifts.length];
    p.ox = ox;
    p.oy = oy;
  });
  if (name === 'editor') state.selectedPanel = 1;
  syncUiFromState();
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
    document.title = 'SHOT_READY';
  }));
  return true;
}

function syncUiFromState() {
  setActiveInGroup('layoutGrid', 'layout', state.layout);
  setActiveInGroup('gradeGrid', 'grade', state.grade);
  setActiveInGroup('captionStyleGrid', 'style', state.captionStyle);
  $('captionInput').value = state.caption;
  $('captionSizeRange').value = state.captionSize;
  $('grainRange').value = state.grain;
  $('vignetteRange').value = state.vignette;
}

function wireControls() {
  wireButtonGroup('layoutGrid', 'layout', (v) => { state.layout = v; ensurePanels(); });
  wireButtonGroup('gradeGrid', 'grade', (v) => { state.grade = v; });
  wireButtonGroup('captionStyleGrid', 'style', (v) => { state.captionStyle = v; });

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const [w, h] = btn.dataset.size.split('x').map(Number);
      state.exportSize = { w, h };
      render();
    });
  });

  $('photoInput').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      if (file.type.startsWith('image/')) await addPhoto(URL.createObjectURL(file), file.name);
    }
    e.target.value = '';
  });
  $('samplesBtn').addEventListener('click', loadSamples);
  $('exportBtn').addEventListener('click', exportPng);

  $('zoomRange').addEventListener('input', (e) => { state.panels[state.selectedPanel].zoom = Number(e.target.value); render(); });
  $('shiftXRange').addEventListener('input', (e) => { state.panels[state.selectedPanel].ox = Number(e.target.value); render(); });
  $('shiftYRange').addEventListener('input', (e) => { state.panels[state.selectedPanel].oy = Number(e.target.value); render(); });

  $('fillAllBtn').addEventListener('click', () => {
    const idx = state.panels[state.selectedPanel].photoIdx;
    state.panels.forEach((p) => { p.photoIdx = idx; });
    buildPhotoStrip();
    render();
  });
  $('resetPanelBtn').addEventListener('click', () => {
    Object.assign(state.panels[state.selectedPanel], { zoom: 1, ox: 0, oy: 0 });
    render();
  });

  $('grainRange').addEventListener('input', (e) => { state.grain = Number(e.target.value); render(); });
  $('vignetteRange').addEventListener('input', (e) => { state.vignette = Number(e.target.value); render(); });
  $('captionInput').addEventListener('input', (e) => { state.caption = e.target.value; render(); });
  $('captionSizeRange').addEventListener('input', (e) => { state.captionSize = Number(e.target.value); render(); });
  $('captionBottomBtn').addEventListener('click', () => {
    state.captionTop = false;
    $('captionBottomBtn').classList.add('is-active');
    $('captionTopBtn').classList.remove('is-active');
    render();
  });
  $('captionTopBtn').addEventListener('click', () => {
    state.captionTop = true;
    $('captionTopBtn').classList.add('is-active');
    $('captionBottomBtn').classList.remove('is-active');
    render();
  });
}

async function boot() {
  ensurePanels();
  wireControls();
  wirePointer();
  wireDrop();
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot && (await applyShotPreset(shot))) return;
  render();
  loadSamples();
}

boot();
