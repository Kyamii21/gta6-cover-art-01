// Colour grades applied with canvas pixel data so preview and export match.
// Every grade blends with the original by strength (0..1).

export const GRADES = [
  { id: "poster-comic", name: "Poster Comic", hint: "Posterize + ink edges" },
  { id: "vice-sunset", name: "Vice Sunset", hint: "Orange-pink glow" },
  { id: "neon-night", name: "Neon Night", hint: "Teal-magenta night" },
  { id: "golden-hour", name: "Golden Hour", hint: "Warm film light" },
  { id: "mono-ink", name: "Mono Ink", hint: "Black ink halftone" },
  { id: "clean", name: "Clean Photo", hint: "No grade" },
];

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function blendChannel(original, graded, strength) {
  return clampByte(original + (graded - original) * strength);
}

function applyViceSunset(data, strength) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = luminance(r, g, b) / 255;
    const warmR = clampByte(r * 1.18 + 18 + lum * 22);
    const warmG = clampByte(g * 0.96 + lum * 8);
    const warmB = clampByte(b * 0.82 + (1 - lum) * 26);
    data[i] = blendChannel(r, warmR, strength);
    data[i + 1] = blendChannel(g, warmG, strength);
    data[i + 2] = blendChannel(b, warmB, strength);
  }
}

function applyNeonNight(data, strength) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = luminance(r, g, b) / 255;
    const neonR = clampByte(r * 0.92 + lum * 30);
    const neonG = clampByte(g * 1.12 + (1 - lum) * 14);
    const neonB = clampByte(b * 1.22 + 16);
    data[i] = blendChannel(r, neonR, strength);
    data[i + 1] = blendChannel(g, neonG, strength);
    data[i + 2] = blendChannel(b, neonB, strength);
  }
}

function applyGoldenHour(data, strength) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const goldR = clampByte(r * 1.12 + 12);
    const goldG = clampByte(g * 1.02 + 4);
    const goldB = clampByte(b * 0.86);
    data[i] = blendChannel(r, goldR, strength);
    data[i + 1] = blendChannel(g, goldG, strength);
    data[i + 2] = blendChannel(b, goldB, strength);
  }
}

function applyMonoInk(data, strength) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = luminance(r, g, b);
    const ink = lum > 170 ? 245 : lum > 110 ? 190 : lum > 60 ? 110 : 28;
    data[i] = blendChannel(r, ink, strength);
    data[i + 1] = blendChannel(g, ink, strength);
    data[i + 2] = blendChannel(b, ink, strength);
  }
}

function applyPosterComic(imageData, strength) {
  const { data, width, height } = imageData;
  const grey = new Float32Array(width * height);
  for (let p = 0, i = 0; p < grey.length; p++, i += 4) {
    grey[p] = luminance(data[i], data[i + 1], data[i + 2]);
  }
  const levels = 5;
  const step = 255 / (levels - 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let pr = Math.round(r / step) * step;
      let pg = Math.round(g / step) * step;
      let pb = Math.round(b / step) * step;
      // Slight saturation push so flat colour areas read as poster paint.
      const lum = grey[p];
      pr = clampByte(lum + (pr - lum) * 1.25);
      pg = clampByte(lum + (pg - lum) * 1.25);
      pb = clampByte(lum + (pb - lum) * 1.25);
      // Sobel-style edge strength from neighbouring luminance.
      const right = grey[y * width + Math.min(width - 1, x + 1)];
      const down = grey[Math.min(height - 1, y + 1) * width + x];
      const edge = Math.abs(grey[p] - right) + Math.abs(grey[p] - down);
      if (edge > 42) {
        const inkMix = Math.min(1, (edge - 42) / 90);
        pr = pr * (1 - inkMix) + 18 * inkMix;
        pg = pg * (1 - inkMix) + 14 * inkMix;
        pb = pb * (1 - inkMix) + 26 * inkMix;
      }
      data[i] = blendChannel(r, pr, strength);
      data[i + 1] = blendChannel(g, pg, strength);
      data[i + 2] = blendChannel(b, pb, strength);
    }
  }
}

export function applyGradeToCanvas(canvas, gradeId, strength) {
  if (gradeId === "clean" || strength <= 0) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (gradeId === "vice-sunset") applyViceSunset(imageData.data, strength);
  else if (gradeId === "neon-night") applyNeonNight(imageData.data, strength);
  else if (gradeId === "golden-hour") applyGoldenHour(imageData.data, strength);
  else if (gradeId === "mono-ink") applyMonoInk(imageData.data, strength);
  else if (gradeId === "poster-comic") applyPosterComic(imageData, strength);
  ctx.putImageData(imageData, 0, 0);
}
