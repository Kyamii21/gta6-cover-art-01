// Editor wiring: uploads, samples, pickers, drag and zoom per panel, export.

import { LAYOUTS, panelsForLayout } from "./layouts.js";
import { GRADES } from "./grades.js";
import { LETTERING_STYLES } from "./lettering.js";
import { EXPORT_SIZES, createPanelState, renderCover, renderExportCanvas, panelAtPoint } from "./cover.js";

export const SAMPLE_PHOTOS = [
  { id: "beach-sunset", name: "Beach Sunset", file: "samples/beach-sunset.jpg" },
  { id: "convertible", name: "Convertible", file: "samples/convertible.jpg" },
  { id: "neon-street", name: "Neon Street", file: "samples/neon-street.jpg" },
  { id: "rooftop-dusk", name: "Rooftop Dusk", file: "samples/rooftop-dusk.jpg" },
  { id: "pier-fishing", name: "Pier Fishing", file: "samples/pier-fishing.jpg" },
  { id: "palm-boulevard", name: "Palm Boulevard", file: "samples/palm-boulevard.jpg" },
];

export function createEditorState() {
  return {
    layoutId: "grid-four",
    gradeId: "poster-comic",
    gradeStrength: 0.85,
    letteringId: "stacked-poster",
    sizeId: "square",
    title: "NEON SHORE",
    subtitle: "Vice City Nights",
    selectedPanel: 0,
    activePhoto: null,
    panels: [],
    sampleImages: {},
  };
}

export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });
}

export function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  return loadImageFromUrl(url);
}

function ensurePanelStates(state) {
  const size = EXPORT_SIZES.find((s) => s.id === state.sizeId) || EXPORT_SIZES[0];
  const count = panelsForLayout(state.layoutId, size.width / size.height).length;
  while (state.panels.length < count) state.panels.push(createPanelState(state.activePhoto));
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

export function buildPicker(container, items, activeId, onPick) {
  container.innerHTML = "";
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-button" + (item.id === activeId ? " active" : "");
    button.dataset.id = item.id;
    const label = document.createElement("span");
    label.textContent = item.name;
    const hint = document.createElement("small");
    hint.textContent = item.hint || "";
    button.appendChild(label);
    button.appendChild(hint);
    button.addEventListener("click", () => onPick(item.id));
    container.appendChild(button);
  }
}

export function refreshPickers(state, refs, onChange) {
  buildPicker(refs.layoutPicker, LAYOUTS, state.layoutId, (id) => { state.layoutId = id; ensurePanelStates(state); onChange(); });
  buildPicker(refs.gradePicker, GRADES, state.gradeId, (id) => { state.gradeId = id; onChange(); });
  buildPicker(refs.letteringPicker, LETTERING_STYLES, state.letteringId, (id) => { state.letteringId = id; onChange(); });
  buildPicker(refs.sizePicker, EXPORT_SIZES, state.sizeId, (id) => { state.sizeId = id; ensurePanelStates(state); onChange(); });
}

export function buildSampleStrip(state, container, onSamplePicked) {
  container.innerHTML = "";
  for (const sample of SAMPLE_PHOTOS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sample-thumb";
    button.title = sample.name;
    const img = document.createElement("img");
    img.src = sample.file;
    img.alt = sample.name;
    button.appendChild(img);
    button.addEventListener("click", async () => {
      if (!state.sampleImages[sample.id]) {
        state.sampleImages[sample.id] = await loadImageFromUrl(sample.file);
      }
      onSamplePicked(state.sampleImages[sample.id], sample);
    });
    container.appendChild(button);
  }
}

export async function preloadSample(state, sampleId) {
  const sample = SAMPLE_PHOTOS.find((s) => s.id === sampleId) || SAMPLE_PHOTOS[0];
  if (!state.sampleImages[sample.id]) {
    state.sampleImages[sample.id] = await loadImageFromUrl(sample.file);
  }
  return state.sampleImages[sample.id];
}

export function assignPhotoToSelectedPanel(state, image) {
  ensurePanelStates(state);
  state.activePhoto = image;
  state.panels[state.selectedPanel] = createPanelState(image);
}

export function fillAllPanelsWithActivePhoto(state) {
  ensurePanelStates(state);
  if (!state.activePhoto) return;
  state.panels = state.panels.map(() => createPanelState(state.activePhoto));
}

export async function fillPanelsWithSamples(state) {
  ensurePanelStates(state);
  for (let i = 0; i < state.panels.length; i++) {
    const sample = SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length];
    const image = await preloadSample(state, sample.id);
    state.panels[i] = createPanelState(image);
  }
  state.activePhoto = state.panels[0] ? state.panels[0].photo : null;
}

export function attachCanvasGestures(canvas, state, onChange) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  function toNormalised(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height };
  }
  canvas.addEventListener("pointerdown", (event) => {
    const point = toNormalised(event);
    const panels = panelsForLayout(state.layoutId, canvas.width / canvas.height);
    state.selectedPanel = panelAtPoint(panels, point.x, point.y);
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.classList.add("dragging");
    canvas.setPointerCapture(event.pointerId);
    onChange();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const bounds = canvas.getBoundingClientRect();
    const panelState = state.panels[state.selectedPanel];
    if (!panelState) return;
    panelState.offsetX = (panelState.offsetX || 0) + (event.clientX - lastX) / bounds.width;
    panelState.offsetY = (panelState.offsetY || 0) + (event.clientY - lastY) / bounds.height;
    lastX = event.clientX;
    lastY = event.clientY;
    onChange();
  });
  function endDrag() {
    dragging = false;
    canvas.classList.remove("dragging");
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const panelState = state.panels[state.selectedPanel];
    if (!panelState) return;
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    panelState.zoom = Math.min(3, Math.max(1, (panelState.zoom || 1) + delta));
    onChange();
  }, { passive: false });
}

export function syncPreviewSize(canvas, state) {
  const size = EXPORT_SIZES.find((s) => s.id === state.sizeId) || EXPORT_SIZES[0];
  const scale = 900 / Math.max(size.width, size.height);
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
}

export function drawEditorPreview(canvas, state) {
  ensurePanelStates(state);
  syncPreviewSize(canvas, state);
  renderCover(canvas, state, { showSelection: true });
}

export function exportCoverPng(state) {
  const canvas = renderExportCanvas(state, state.sizeId);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve({ blob, canvas }), "image/png");
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
