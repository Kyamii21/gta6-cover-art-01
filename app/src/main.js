// Neon Poster bootstrap: builds the editor, loads a starter sample so the
// cover is alive on open, and handles screenshot preset modes.

import {
  createEditorState,
  loadImageFromFile,
  buildSampleStrip,
  refreshPickers,
  assignPhotoToSelectedPanel,
  fillAllPanelsWithActivePhoto,
  fillPanelsWithSamples,
  attachCanvasGestures,
  drawEditorPreview,
  exportCoverPng,
  downloadBlob,
  preloadSample,
} from "./editor.js";
import { createPanelState } from "./cover.js";
import { runShotMode, markShotReady } from "./shots.js";

const refs = {
  studio: document.getElementById("studio"),
  shotStage: document.getElementById("shotStage"),
  shotCanvas: document.getElementById("shotCanvas"),
  canvas: document.getElementById("coverCanvas"),
  sampleStrip: document.getElementById("sampleStrip"),
  layoutPicker: document.getElementById("layoutPicker"),
  gradePicker: document.getElementById("gradePicker"),
  letteringPicker: document.getElementById("letteringPicker"),
  sizePicker: document.getElementById("sizePicker"),
  titleInput: document.getElementById("captionTitle"),
  subtitleInput: document.getElementById("captionSubtitle"),
  gradeStrength: document.getElementById("gradeStrength"),
  panelZoom: document.getElementById("panelZoom"),
  statusLine: document.getElementById("statusLine"),
  panelLabel: document.getElementById("panelLabel"),
};

const state = createEditorState();

function setStatus(text) {
  refs.statusLine.textContent = text;
}

function syncControlValues() {
  refs.gradeStrength.value = String(Math.round(state.gradeStrength * 100));
  const panel = state.panels[state.selectedPanel];
  refs.panelZoom.value = String(Math.round(((panel && panel.zoom) || 1) * 100));
  refs.panelLabel.textContent = "Panel " + (state.selectedPanel + 1) + " selected — drag to move, scroll to zoom";
}

function redrawEditor() {
  drawEditorPreview(refs.canvas, state);
  refreshPickers(state, refs, redrawEditor);
  syncControlValues();
}

async function bootEditor() {
  buildSampleStrip(state, refs.sampleStrip, (image) => {
    assignPhotoToSelectedPanel(state, image);
    setStatus("Sample loaded into panel " + (state.selectedPanel + 1) + ".");
    redrawEditor();
  });
  attachCanvasGestures(refs.canvas, state, redrawEditor);

  document.getElementById("photoUpload").addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const first = await loadImageFromFile(files[0]);
    assignPhotoToSelectedPanel(state, first);
    for (let i = 1; i < files.length && i < state.panels.length; i++) {
      const extra = await loadImageFromFile(files[i]);
      state.panels[i] = createPanelState(extra);
    }
    setStatus(files.length + " photo(s) loaded locally. Nothing was uploaded.");
    redrawEditor();
  });

  document.getElementById("fillAllPanels").addEventListener("click", () => {
    fillAllPanelsWithActivePhoto(state);
    setStatus("Every panel now shows the active photo.");
    redrawEditor();
  });

  document.getElementById("cycleSamples").addEventListener("click", async () => {
    await fillPanelsWithSamples(state);
    setStatus("Each panel shows a different sample photo.");
    redrawEditor();
  });

  document.getElementById("resetPanel").addEventListener("click", () => {
    const panel = state.panels[state.selectedPanel];
    if (panel) { panel.offsetX = 0; panel.offsetY = 0; panel.zoom = 1; }
    redrawEditor();
  });

  document.getElementById("resetAllPanels").addEventListener("click", () => {
    state.panels.forEach((panel) => { panel.offsetX = 0; panel.offsetY = 0; panel.zoom = 1; });
    redrawEditor();
  });

  refs.titleInput.addEventListener("input", () => { state.title = refs.titleInput.value; redrawEditor(); });
  refs.subtitleInput.addEventListener("input", () => { state.subtitle = refs.subtitleInput.value; redrawEditor(); });
  refs.gradeStrength.addEventListener("input", () => { state.gradeStrength = Number(refs.gradeStrength.value) / 100; redrawEditor(); });
  refs.panelZoom.addEventListener("input", () => {
    const panel = state.panels[state.selectedPanel];
    if (panel) panel.zoom = Number(refs.panelZoom.value) / 100;
    redrawEditor();
  });

  document.getElementById("exportCover").addEventListener("click", async () => {
    const { blob } = await exportCoverPng(state);
    const filename = "neon-poster-" + state.sizeId + ".png";
    downloadBlob(blob, filename);
    setStatus("Saved " + filename + " — ready to post.");
  });

  // Starter scene: one sample per panel so the poster look shows at once.
  await fillPanelsWithSamples(state);
  state.title = refs.titleInput.value;
  state.subtitle = refs.subtitleInput.value;
  redrawEditor();
  setStatus("Pick a layout and grade, then export your cover PNG.");
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get("shot");
  if (shot) {
    await bootEditor();
    await runShotMode(state, shot, refs);
    if (shot === "editor") redrawEditor();
    markShotReady();
    return;
  }
  await bootEditor();
}

boot().catch((error) => {
  setStatus("Something went wrong: " + error.message);
});
