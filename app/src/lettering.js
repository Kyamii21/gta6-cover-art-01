// Caption lettering drawn on the cover canvas with system font stacks only.
// Styles use stroke, shadow and gradient fills — no downloaded font files.

export const LETTERING_STYLES = [
  { id: "stacked-poster", name: "Stacked Poster", hint: "Big title + subtitle" },
  { id: "neon-sign", name: "Neon Sign", hint: "Glowing script subtitle" },
  { id: "sunset-block", name: "Sunset Block", hint: "Gradient block letters" },
  { id: "ink-outline", name: "Ink Outline", hint: "Heavy black outline" },
  { id: "clean-credit", name: "Clean Credit", hint: "Small film credit line" },
];

const TITLE_FONT = "900 %spx 'Arial Black', Impact, system-ui, sans-serif";
const SCRIPT_FONT = "italic 700 %spx 'Brush Script MT', 'Segoe Script', cursive";
const CREDIT_FONT = "600 %spx system-ui, sans-serif";

function fitFontSize(ctx, text, template, maxWidth, startSize) {
  let size = startSize;
  ctx.font = template.replace("%s", String(Math.round(size)));
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 2;
    ctx.font = template.replace("%s", String(Math.round(size)));
  }
  return size;
}

function drawStackedPoster(ctx, w, h, title, subtitle) {
  const bandH = h * 0.26;
  const bandY = h - bandH;
  const shade = ctx.createLinearGradient(0, bandY - h * 0.08, 0, h);
  shade.addColorStop(0, "rgba(10,6,24,0)");
  shade.addColorStop(0.35, "rgba(10,6,24,0.55)");
  shade.addColorStop(1, "rgba(10,6,24,0.88)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY - h * 0.08, w, bandH + h * 0.08);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const titleSize = fitFontSize(ctx, title, TITLE_FONT, w * 0.92, h * 0.13);
  ctx.font = TITLE_FONT.replace("%s", String(Math.round(titleSize)));
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#14101f";
  ctx.lineWidth = Math.max(4, titleSize * 0.14);
  ctx.shadowColor = "rgba(255,61,138,0.65)";
  ctx.shadowBlur = titleSize * 0.22;
  ctx.shadowOffsetY = titleSize * 0.05;
  ctx.strokeText(title, w / 2, h - bandH * 0.38);
  const grad = ctx.createLinearGradient(0, h - bandH, 0, h);
  grad.addColorStop(0, "#ffe9a8");
  grad.addColorStop(0.55, "#ffb340");
  grad.addColorStop(1, "#ff3d8a");
  ctx.fillStyle = grad;
  ctx.fillText(title, w / 2, h - bandH * 0.38);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (subtitle) {
    const subSize = fitFontSize(ctx, subtitle, CREDIT_FONT, w * 0.9, h * 0.038);
    ctx.font = CREDIT_FONT.replace("%s", String(Math.round(subSize)));
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    ctx.fillText(subtitle.toUpperCase(), w / 2, h - bandH * 0.14);
    ctx.shadowBlur = 0;
  }
}

function drawNeonSign(ctx, w, h, title, subtitle) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const titleSize = fitFontSize(ctx, title, TITLE_FONT, w * 0.92, h * 0.11);
  ctx.font = TITLE_FONT.replace("%s", String(Math.round(titleSize)));
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#19e3d3";
  ctx.lineWidth = Math.max(3, titleSize * 0.06);
  ctx.shadowColor = "#19e3d3";
  ctx.shadowBlur = titleSize * 0.35;
  ctx.strokeText(title, w / 2, h * 0.9);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, w / 2, h * 0.9);
  ctx.shadowBlur = 0;
  if (subtitle) {
    const subSize = fitFontSize(ctx, subtitle, SCRIPT_FONT, w * 0.85, h * 0.075);
    ctx.font = SCRIPT_FONT.replace("%s", String(Math.round(subSize)));
    ctx.fillStyle = "#ff3d8a";
    ctx.shadowColor = "#ff3d8a";
    ctx.shadowBlur = subSize * 0.4;
    ctx.fillText(subtitle, w / 2, h * 0.97);
    ctx.shadowBlur = 0;
  }
}

function drawSunsetBlock(ctx, w, h, title, subtitle) {
  ctx.textAlign = "center";
  const titleSize = fitFontSize(ctx, title, TITLE_FONT, w * 0.94, h * 0.14);
  ctx.font = TITLE_FONT.replace("%s", String(Math.round(titleSize)));
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(5, titleSize * 0.16);
  ctx.strokeText(title, w / 2, h * 0.92);
  const grad = ctx.createLinearGradient(0, h * 0.78, 0, h * 0.95);
  grad.addColorStop(0, "#ffd23d");
  grad.addColorStop(0.5, "#ff7a3d");
  grad.addColorStop(1, "#e91e7a");
  ctx.fillStyle = grad;
  ctx.fillText(title, w / 2, h * 0.92);
  if (subtitle) {
    const subSize = fitFontSize(ctx, subtitle, CREDIT_FONT, w * 0.9, h * 0.036);
    ctx.font = CREDIT_FONT.replace("%s", String(Math.round(subSize)));
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(10,6,24,0.85)";
    ctx.shadowBlur = 10;
    ctx.fillText(subtitle.toUpperCase(), w / 2, h * 0.968);
    ctx.shadowBlur = 0;
  }
}

function drawInkOutline(ctx, w, h, title, subtitle) {
  ctx.textAlign = "center";
  const titleSize = fitFontSize(ctx, title, TITLE_FONT, w * 0.92, h * 0.12);
  ctx.font = TITLE_FONT.replace("%s", String(Math.round(titleSize)));
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0d0a18";
  ctx.lineWidth = Math.max(6, titleSize * 0.2);
  ctx.strokeText(title, w / 2, h * 0.9);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, w / 2, h * 0.9);
  if (subtitle) {
    const subSize = fitFontSize(ctx, subtitle, CREDIT_FONT, w * 0.9, h * 0.034);
    ctx.font = CREDIT_FONT.replace("%s", String(Math.round(subSize)));
    ctx.fillStyle = "#ffe9a8";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText(subtitle.toUpperCase(), w / 2, h * 0.955);
    ctx.shadowBlur = 0;
  }
}

function drawCleanCredit(ctx, w, h, title, subtitle) {
  ctx.textAlign = "center";
  const combined = subtitle ? title + "  ·  " + subtitle : title;
  const size = fitFontSize(ctx, combined, CREDIT_FONT, w * 0.92, h * 0.04);
  ctx.font = CREDIT_FONT.replace("%s", String(Math.round(size)));
  ctx.fillStyle = "rgba(10,6,24,0.55)";
  const tw = ctx.measureText(combined).width;
  ctx.fillRect((w - tw) / 2 - 18, h * 0.915, tw + 36, size * 1.7);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(combined, w / 2, h * 0.915 + size * 1.25);
}

export function drawCaptionLettering(ctx, w, h, styleId, titleRaw, subtitleRaw) {
  const title = (titleRaw || "").trim().toUpperCase() || "NEON POSTER";
  const subtitle = (subtitleRaw || "").trim();
  if (styleId === "neon-sign") drawNeonSign(ctx, w, h, title, subtitle);
  else if (styleId === "sunset-block") drawSunsetBlock(ctx, w, h, title, subtitle);
  else if (styleId === "ink-outline") drawInkOutline(ctx, w, h, title, subtitle);
  else if (styleId === "clean-credit") drawCleanCredit(ctx, w, h, title, subtitle);
  else drawStackedPoster(ctx, w, h, title, subtitle);
}
