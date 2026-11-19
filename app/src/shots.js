// Screenshot preset scenes driven by the shot query parameter.
// Editor shows the studio with samples loaded; cover modes fill the frame
// with one exported cover so screenshots show the app's own drawing.

import { SAMPLE_PHOTOS, preloadSample, fillPanelsWithSamples } from "./editor.js";
import { createPanelState, renderCover, sizeById } from "./cover.js";

export const SHOT_MODES = ["editor", "cover-landscape", "cover-square", "cover-portrait"];

function applyShotPreset(state, shot) {
  if (shot === "cover-landscape") {
    state.sizeId = "landscape";
    state.layoutId = "hero-three";
    state.gradeId = "poster-comic";
    state.letteringId = "stacked-poster";
    state.title = "NEON SHORE";
    state.subtitle = "Vice City Nights";
  } else if (shot === "cover-square") {
    state.sizeId = "square";
    state.layoutId = "grid-four";
    state.gradeId = "vice-sunset";
    state.letteringId = "sunset-block";
    state.title = "SUNSET HEIST";
    state.subtitle = "Golden Hour Crew";
  } else if (shot === "cover-portrait") {
    state.sizeId = "portrait";
    state.layoutId = "grid-six";
    state.gradeId = "neon-night";
    state.letteringId = "neon-sign";
    state.title = "NIGHT SHIFT";
    state.subtitle = "Neon Boulevard";
  } else {
    state.sizeId = "square";
    state.layoutId = "grid-four";
    state.gradeId = "poster-comic";
    state.letteringId = "stacked-poster";
    state.title = "NEON SHORE";
    state.subtitle = "Vice City Nights";
  }
  state.gradeStrength = 0.9;
}

async function loadShotPanels(state, shot) {
  await fillPanelsWithSamples(state);
  // Rotate the sample order per preset so no photo repeats across panels.
  const orderByShot = {
    "cover-landscape": ["convertible", "palm-boulevard", "neon-street", "rooftop-dusk"],
    "cover-square": ["beach-sunset", "convertible", "neon-street", "rooftop-dusk"],
    "cover-portrait": ["neon-street", "convertible", "pier-fishing", "rooftop-dusk", "beach-sunset", "palm-boulevard"],
    editor: ["beach-sunset", "convertible", "neon-street", "rooftop-dusk"],
  };
  const order = orderByShot[shot] || orderByShot.editor;
  for (let i = 0; i < state.panels.length; i++) {
    const image = await preloadSample(state, order[i % order.length]);
    state.panels[i] = createPanelState(image);
  }
  state.activePhoto = state.panels[0] ? state.panels[0].photo : null;
  state.selectedPanel = 0;
}

export async function runShotMode(state, shot, refs) {
  applyShotPreset(state, shot);
  await loadShotPanels(state, shot);
  if (shot === "editor") {
    refs.titleInput.value = state.title;
    refs.subtitleInput.value = state.subtitle;
    return "editor";
  }
  document.body.classList.add("shot-cover");
  refs.studio.hidden = true;
  refs.shotStage.hidden = false;
  const size = sizeById(state.sizeId);
  const canvas = refs.shotCanvas;
  canvas.width = size.width;
  canvas.height = size.height;
  renderCover(canvas, state, { showSelection: false });
  return "cover";
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

export { SAMPLE_PHOTOS };
