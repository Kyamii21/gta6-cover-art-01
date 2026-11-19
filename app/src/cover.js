// Cover renderer: draws photo panels, applies the colour grade, adds the
// poster frame and caption lettering. Preview and export share this code.

import { panelsForLayout } from "./layouts.js";
import { applyGradeToCanvas } from "./grades.js";
import { drawCaptionLettering } from "./lettering.js";

export const EXPORT_SIZES = [
  { id: "square", name: "Square 1080 x 1080", hint: "Feed post", width: 1080, height: 1080 },
  { id: "portrait", name: "Portrait 1080 x 1350", hint: "Tall post", width: 1080, height: 1350 },
  { id: "landscape", name: "Landscape 1920 x 1080", hint: "Wide banner", width: 1920, height: 1080 },
];

export function sizeById(sizeId) {
  return EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
}

export function createPanelState(photo) {
  return { photo: photo || null, offsetX: 0, offsetY: 0, zoom: 1 };
}

function drawPhotoInPanel(ctx, panel, state, canvasW, canvasH) {
  const px = panel.x * canvasW;
  const py = panel.y * canvasH;
  const pw = panel.w * canvasW;
  const ph = panel.h * canvasH;
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.fillStyle = "#241a3d";
  ctx.fillRect(px, py, pw, ph);
  const img = state && state.photo;
  if (img && img.naturalWidth > 0) {
    const zoom = Math.max(1, state.zoom || 1);
    const coverScale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * coverScale;
    const dh = img.naturalHeight * coverScale;
    // Focus centre-top so faces stay in frame by default.
    const baseX = px + (pw - dw) / 2;
    const baseY = py + (ph - dh) * 0.28;
    const dx = baseX + (state.offsetX || 0) * pw;
    const dy = baseY + (state.offsetY || 0) * ph;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#3d3461";
    ctx.font = "600 " + Math.round(ph * 0.07) + "px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Add a photo", px + pw / 2, py + ph / 2);
  }
  ctx.restore();
}

function drawPanelGutters(ctx, panels, canvasW, canvasH) {
  const gutter = Math.max(3, Math.round(Math.min(canvasW, canvasH) * 0.006));
  ctx.fillStyle = "#14101f";
  for (const panel of panels) {
    ctx.strokeStyle = "#14101f";
    ctx.lineWidth = gutter;
    ctx.strokeRect(panel.x * canvasW, panel.y * canvasH, panel.w * canvasW, panel.h * canvasH);
  }
  ctx.strokeStyle = "#14101f";
  ctx.lineWidth = gutter * 2;
  ctx.strokeRect(0, 0, canvasW, canvasH);
  // Thin paper-white keyline inside the outer frame for a printed-poster feel.
  ctx.strokeStyle = "rgba(255,247,238,0.85)";
  ctx.lineWidth = Math.max(2, Math.round(gutter * 0.7));
  const inset = gutter * 2;
  ctx.strokeRect(inset, inset, canvasW - inset * 2, canvasH - inset * 2);
}

function drawSelectedPanelHighlight(ctx, panels, selectedIndex, canvasW, canvasH) {
  const panel = panels[selectedIndex];
  if (!panel) return;
  ctx.strokeStyle = "#19e3d3";
  ctx.lineWidth = Math.max(3, Math.round(Math.min(canvasW, canvasH) * 0.005));
  ctx.setLineDash([14, 9]);
  ctx.strokeRect(panel.x * canvasW + 3, panel.y * canvasH + 3, panel.w * canvasW - 6, panel.h * canvasH - 6);
  ctx.setLineDash([]);
}

export function renderCover(canvas, state, options) {
  const opts = options || {};
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const aspect = canvasW / canvasH;
  const panels = panelsForLayout(state.layoutId, aspect);
  ctx.fillStyle = "#14101f";
  ctx.fillRect(0, 0, canvasW, canvasH);
  panels.forEach((panel, index) => {
    drawPhotoInPanel(ctx, panel, state.panels[index], canvasW, canvasH);
  });
  drawPanelGutters(ctx, panels, canvasW, canvasH);
  applyGradeToCanvas(canvas, state.gradeId, state.gradeStrength);
  drawCaptionLettering(ctx, canvasW, canvasH, state.letteringId, state.title, state.subtitle);
  if (opts.showSelection) {
    drawSelectedPanelHighlight(ctx, panels, state.selectedPanel, canvasW, canvasH);
  }
  return panels;
}

export function renderExportCanvas(state, sizeId) {
  const size = sizeById(sizeId);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  renderCover(canvas, state, { showSelection: false });
  return canvas;
}

export function panelAtPoint(panels, normX, normY) {
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (normX >= p.x && normX <= p.x + p.w && normY >= p.y && normY <= p.y + p.h) return i;
  }
  return 0;
}
