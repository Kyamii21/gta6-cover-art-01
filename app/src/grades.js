// Colour grades for Neon Vice Cover Forge.
// A grade is a preset over one adjustable pipeline. The renderer
// draws each panel photo through a CSS filter (saturation, contrast,
// brightness, hue), then applyGrade() runs the pixel stages:
// posterize -> duotone -> halftone -> Sobel ink -> film grain,
// and a vignette gradient is laid over the finished cover.
// Grain uses a seeded PRNG so every render of the same cover is
// byte-identical (screenshots and exports stay deterministic).

export const GRADE_DEFAULTS = {
  posterize: 0,     // 0 = off, otherwise 2..12 colour levels
  ink: 0,           // Sobel edge darkening, 0..100
  duotone: 0,       // blend toward two-colour ramp, 0..100
  duoDark: [26, 6, 44],
  duoLight: [255, 190, 120],
  halftone: 0,      // dot-screen strength, 0..100
  grain: 0,         // film grain, 0..100
  vignette: 0,      // corner darkening, 0..100
  saturation: 100,  // percent
  contrast: 100,    // percent
  brightness: 100,  // percent
  hue: 0,           // degrees
};

export const GRADES = [
  { id: 'vice-sunset', name: 'Vice Sunset', params: { posterize: 8, saturation: 145, contrast: 112, brightness: 104, hue: -6, vignette: 35, grain: 12 } },
  { id: 'neon-nights', name: 'Neon Nights', params: { saturation: 165, contrast: 122, brightness: 98, hue: 8, vignette: 45, grain: 22 } },
  { id: 'poster-comic', name: 'Poster Comic', params: { posterize: 4, ink: 85, saturation: 150, contrast: 115, vignette: 18 } },
  { id: 'duotone-heat', name: 'Duotone Heat', params: { duotone: 88, duoDark: [38, 4, 58], duoLight: [255, 170, 80], contrast: 110, vignette: 25 } },
  { id: 'halftone-pop', name: 'Halftone Pop', params: { posterize: 6, halftone: 70, saturation: 140, contrast: 108 } },
  { id: 'golden-hour', name: 'Golden Hour', params: { saturation: 128, contrast: 104, brightness: 108, hue: -10, vignette: 22, grain: 8 } },
  { id: 'miami-teal', name: 'Miami Teal', params: { duotone: 55, duoDark: [4, 38, 52], duoLight: [255, 190, 220], saturation: 130, contrast: 108 } },
  { id: 'noir-ink', name: 'Noir Ink', params: { saturation: 12, contrast: 128, ink: 70, grain: 34, vignette: 55 } },
  { id: 'vaporwave', name: 'Vaporwave', params: { posterize: 5, duotone: 62, duoDark: [30, 6, 74], duoLight: [120, 230, 255], saturation: 150, hue: 14, grain: 14 } },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function resolveGrade(id, overrides = {}) {
  return { ...GRADE_DEFAULTS, ...gradeById(id).params, ...overrides };
}

export function cssFilter(p) {
  return `saturate(${p.saturation}%) contrast(${p.contrast}%) brightness(${p.brightness}%) hue-rotate(${p.hue}deg)`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Runs the pixel stages on a canvas in place. `scale` is the ratio
// of this canvas to the final cover size, so halftone dots and ink
// width stay proportional at preview and export resolutions.
export function applyGrade(canvas, p, seed = 1337, scale = 1) {
  const w = canvas.width, h = canvas.height;
  if (w === 0 || h === 0) return;
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;

  const levels = p.posterize >= 2 ? p.posterize : 0;
  const duo = p.duotone / 100;
  const [dr, dg, db] = p.duoDark;
  const [lr, lg, lb] = p.duoLight;
  const half = p.halftone / 100;
  const cell = Math.max(3, Math.round(7 * scale));
  const inkAmt = p.ink / 100;
  const grainAmt = p.grain / 100;

  // Pass 1: posterize + duotone + halftone; keep luminance for ink.
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    let r = d[o], g = d[o + 1], b = d[o + 2];
    if (levels) {
      const step = 255 / (levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    }
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (duo > 0) {
      const t = y / 255;
      r = r + (dr + (lr - dr) * t - r) * duo;
      g = g + (dg + (lg - dg) * t - g) * duo;
      b = b + (db + (lb - db) * t - b) * duo;
      y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    if (half > 0) {
      const x = i % w, yy = (i / w) | 0;
      const cx = (x % cell) - cell / 2 + 0.5;
      const cy = (yy % cell) - cell / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy) / (cell / 2);
      const dark = 1 - y / 255;
      if (dist < dark) {
        const f = 1 - half * 0.85;
        r *= f; g *= f; b *= f;
      }
    }
    d[o] = r; d[o + 1] = g; d[o + 2] = b;
    lum[i] = y;
  }

  // Pass 2: Sobel ink — darken where the luminance gradient is steep.
  if (inkAmt > 0) {
    for (let yy = 1; yy < h - 1; yy++) {
      for (let x = 1; x < w - 1; x++) {
        const i = yy * w + x;
        const gx = -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1]
                   + lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
        const gy = -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1]
                   + lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
        const mag = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 420);
        if (mag > 0.12) {
          const f = 1 - inkAmt * Math.min(1, (mag - 0.12) * 1.6);
          const o = i * 4;
          d[o] *= f; d[o + 1] *= f; d[o + 2] *= f;
        }
      }
    }
  }

  // Pass 3: seeded film grain.
  if (grainAmt > 0) {
    const rand = mulberry32(seed);
    const amp = grainAmt * 42;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const noise = (rand() - 0.5) * 2 * amp;
      d[o] += noise; d[o + 1] += noise; d[o + 2] += noise;
    }
  }

  ctx.putImageData(img, 0, 0);
}

// Radial vignette laid over a finished cover.
export function applyVignette(ctx, w, h, amount) {
  if (amount <= 0) return;
  const r = Math.sqrt(w * w + h * h) / 2;
  const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${(amount / 100) * 0.62})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
