// Neon Poster editor wiring: photo library (samples + local uploads), panel
// selection with drag/zoom framing, layout & grade pickers, caption controls,
// and full-resolution PNG export. A `?shot=` query loads a fixed scene for
// screenshots instead (./shots.js). Photos are read locally and never uploaded.
import { LAYOUTS, GRADES, CAPTION_STYLES, freshPanel, posterizeImage, drawCover, panelRects } from './render.js';
import { runShot } from './shots.js';

const SAMPLES = ['beach-sunset', 'convertible', 'neon-street', 'fishing-boat', 'boulevard', 'pier'];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const thumbsEl = document.getElementById('thumbs');

const state = {
  layout: 'hero',
  panels: [],
  photos: new Map(),
  grade: 'sunset',
  gap: 10,
  frame: '#12081f',
  caption: { line1: 'NEON', line2: 'HORIZON', style: 'sunset', size: 100, outline: 14, y: 86, tilt: -2 },
  selected: 0,
  activePhoto: null,
};
let uploadSeq = 0;

function ensurePanels() {
  const n = LAYOUTS[state.layout].panels.length;
  while (state.panels.length < n) {
    const idx = state.panels.length;
    const sampleId = SAMPLES[idx % SAMPLES.length];
    state.panels.push(freshPanel(state.photos.has(sampleId) ? sampleId : null));
  }
  if (state.selected >= n) state.selected = 0;
}

function ensurePoster(photo) {
  if (!photo.poster) photo.poster = posterizeImage(photo.img);
}

function redraw() {
  ensurePanels();
  if (state.grade === 'poster') {
    for (const p of state.panels) {
      const photo = p.photoId != null ? state.photos.get(p.photoId) : null;
      if (photo) ensurePoster(photo);
    }
  }
  drawCover(canvas, state, false);
  syncPanelControls();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(id, url, thumbUrl) {
  const img = await loadImage(url);
  state.photos.set(id, { img, poster: null });
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.photoId = id;
  btn.title = id;
  const t = document.createElement('img');
  t.src = thumbUrl ?? url;
  t.alt = id;
  btn.appendChild(t);
  btn.addEventListener('click', () => {
    state.activePhoto = id;
    const panel = state.panels[state.selected];
    panel.photoId = id;
    panel.zoom = 1; panel.ox = 0; panel.oy = -0.45;
    markActiveThumb();
    redraw();
  });
  thumbsEl.appendChild(btn);
  return id;
}

function markActiveThumb() {
  for (const b of thumbsEl.children) b.classList.toggle('active', b.dataset.photoId === state.activePhoto);
}

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  for (const file of images) {
    const url = URL.createObjectURL(file);
    const id = `upload-${++uploadSeq}`;
    await addPhoto(id, url, url);
    const panel = state.panels[state.selected];
    panel.photoId = id;
    panel.zoom = 1; panel.ox = 0; panel.oy = -0.45;
    state.activePhoto = id;
    if (state.selected < LAYOUTS[state.layout].panels.length - 1) state.selected++;
  }
  if (images.length) {
    markActiveThumb();
    status.textContent = `Added ${images.length} photo${images.length > 1 ? 's' : ''}. Drag on the preview to frame each panel.`;
    redraw();
  }
}

// ---------- pickers ----------
function buildChips(elId, entries, current, onPick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  for (const [id, def] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === current));
    b.addEventListener('click', () => {
      for (const x of el.children) x.setAttribute('aria-checked', 'false');
      b.setAttribute('aria-checked', 'true');
      onPick(id);
    });
    el.appendChild(b);
  }
}

function setLayout(id) {
  state.layout = id;
  ensurePanels();
  redraw();
}
function setGrade(id) {
  state.grade = id;
  redraw();
}
function setCaptionStyle(id) {
  state.caption.style = id;
  redraw();
}

// ---------- panel controls ----------
const zoomEl = document.getElementById('zoom');
const zoomVal = document.getElementById('zoom-val');
const panelName = document.getElementById('panel-name');

function syncPanelControls() {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panelName.textContent = `Panel ${state.selected + 1} of ${LAYOUTS[state.layout].panels.length}`;
  zoomEl.value = panel.zoom;
  zoomVal.textContent = `${panel.zoom.toFixed(2)}×`;
}

zoomEl.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(zoomEl.value);
  zoomVal.textContent = `${Number(zoomEl.value).toFixed(2)}×`;
  redraw();
});
document.getElementById('reset-panel').addEventListener('click', () => {
  const p = state.panels[state.selected];
  p.zoom = 1; p.ox = 0; p.oy = -0.45;
  redraw();
});
document.getElementById('clear-panel').addEventListener('click', () => {
  state.panels[state.selected].photoId = null;
  redraw();
});
document.getElementById('fill-all').addEventListener('click', () => {
  const src = state.panels[state.selected].photoId ?? state.activePhoto;
  if (src == null) { status.textContent = 'Pick a photo first.'; return; }
  for (const p of state.panels) { p.photoId = src; }
  status.textContent = 'Same photo in every panel — drag each panel to frame a different part.';
  redraw();
});

// ---------- canvas interaction: click select, drag move, wheel zoom ----------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
function panelAt(pt) {
  const rects = panelRects(canvas.width, canvas.height, state.layout, state.gap);
  return rects.findIndex((r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h);
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const idx = panelAt(pt);
  if (idx < 0) return;
  state.selected = idx;
  drag = { last: pt };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = canvasPoint(e);
  const panel = state.panels[state.selected];
  const photo = panel.photoId != null ? state.photos.get(panel.photoId) : null;
  if (photo) {
    const rect = panelRects(canvas.width, canvas.height, state.layout, state.gap)[state.selected];
    const iw = photo.img.naturalWidth, ih = photo.img.naturalHeight;
    const base = Math.max(rect.w / iw, rect.h / ih);
    const dw = iw * base * panel.zoom, dh = ih * base * panel.zoom;
    const overX = Math.max(1, (dw - rect.w) / 2), overY = Math.max(1, (dh - rect.h) / 2);
    panel.ox = Math.max(-1, Math.min(1, panel.ox - (pt.x - drag.last.x) / overX));
    panel.oy = Math.max(-1, Math.min(1, panel.oy - (pt.y - drag.last.y) / overY));
  }
  drag.last = pt;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const idx = panelAt(canvasPoint(e));
  if (idx < 0) return;
  state.selected = idx;
  const panel = state.panels[idx];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

// ---------- other controls ----------
const gapEl = document.getElementById('gap');
gapEl.addEventListener('input', () => {
  state.gap = Number(gapEl.value);
  document.getElementById('gap-val').textContent = gapEl.value;
  redraw();
});
document.getElementById('frame-color').addEventListener('input', (e) => {
  state.frame = e.target.value;
  redraw();
});

const capBind = [
  ['cap1', 'line1', (v) => v],
  ['cap2', 'line2', (v) => v],
  ['cap-size', 'size', Number],
  ['cap-outline', 'outline', Number],
  ['cap-y', 'y', Number],
  ['cap-tilt', 'tilt', Number],
];
for (const [elId, key, conv] of capBind) {
  const el = document.getElementById(elId);
  el.addEventListener('input', () => {
    state.caption[key] = conv(el.value);
    const lab = document.getElementById(`${elId}-val`);
    if (lab) lab.textContent = key === 'size' || key === 'y' ? `${el.value}%` : key === 'tilt' ? `${el.value}°` : el.value;
    redraw();
  });
}

const sizeEl = document.getElementById('export-size');
function setSize(w, h) {
  canvas.width = w; canvas.height = h;
  sizeEl.value = `${w}x${h}`;
  document.getElementById('stage-label').textContent = `Preview — ${w} × ${h}`;
  redraw();
}
sizeEl.addEventListener('change', () => {
  const [w, h] = sizeEl.value.split('x').map(Number);
  setSize(w, h);
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = sizeEl.value.split('x').map(Number);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  drawCover(out, state, true);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-poster-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved neon-poster-${w}x${h}.png`;
  }, 'image/png');
});

const input = document.getElementById('photo-input');
input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
const drop = document.getElementById('drop');
for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragging'); });
for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragging'); });
drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

// ---------- shot API (used by shots.js) ----------
const shotApi = {
  state,
  setLayout, setGrade, setCaptionStyle, setSize, redraw,
  setPanel(i, photoId, opts = {}) {
    ensurePanels();
    const p = state.panels[i];
    p.photoId = photoId;
    p.zoom = opts.zoom ?? 1;
    p.ox = opts.ox ?? 0;
    p.oy = opts.oy ?? -0.45;
  },
  setCaption(patch) { Object.assign(state.caption, patch); },
  syncInputs() {
    document.getElementById('cap1').value = state.caption.line1;
    document.getElementById('cap2').value = state.caption.line2;
    document.getElementById('cap-size').value = state.caption.size;
    document.getElementById('cap-outline').value = state.caption.outline;
    document.getElementById('cap-y').value = state.caption.y;
    document.getElementById('cap-tilt').value = state.caption.tilt;
    buildChips('layouts', LAYOUTS, state.layout, setLayout);
    buildChips('grades', GRADES, state.grade, setGrade);
    buildChips('cap-styles', CAPTION_STYLES, state.caption.style, setCaptionStyle);
  },
};

// ---------- boot ----------
buildChips('layouts', LAYOUTS, state.layout, setLayout);
buildChips('grades', GRADES, state.grade, setGrade);
buildChips('cap-styles', CAPTION_STYLES, state.caption.style, setCaptionStyle);

(async () => {
  for (const name of SAMPLES) await addPhoto(name, `samples/${name}.jpg`);
  state.activePhoto = SAMPLES[0];
  markActiveThumb();
  ensurePanels();
  await document.fonts.load('700 100px "Poster Sans"');
  await document.fonts.load('400 40px "Poster Sans"');
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    runShot(shot, shotApi);
  } else {
    redraw();
  }
})();
