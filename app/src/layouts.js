// Poster panel layouts for Neon Poster. Each layout returns panel rectangles
// in normalised 0..1 coordinates so the same layout works at every export size.

export const LAYOUTS = [
  { id: "grid-four", name: "Grid 4", hint: "Classic 2 x 2 poster" },
  { id: "hero-three", name: "Hero + 3", hint: "Big hero, three strips" },
  { id: "full-bleed", name: "Full Bleed", hint: "One photo, full frame" },
  { id: "grid-six", name: "Grid 6", hint: "Six-panel story wall" },
  { id: "grid-nine", name: "Grid 9", hint: "Nine-panel cover grid" },
  { id: "split-duo", name: "Split Duo", hint: "Two tall halves" },
];

function rect(x, y, w, h) {
  return { x, y, w, h };
}

export function panelsForLayout(layoutId, aspect) {
  const tall = aspect < 0.9;
  if (layoutId === "full-bleed") return [rect(0, 0, 1, 1)];
  if (layoutId === "split-duo") {
    return tall ? [rect(0, 0, 1, 0.5), rect(0, 0.5, 1, 0.5)] : [rect(0, 0, 0.5, 1), rect(0.5, 0, 0.5, 1)];
  }
  if (layoutId === "hero-three") {
    if (tall) {
      return [rect(0, 0, 1, 0.55), rect(0, 0.55, 1 / 3, 0.45), rect(1 / 3, 0.55, 1 / 3, 0.45), rect(2 / 3, 0.55, 1 / 3, 0.45)];
    }
    return [rect(0, 0, 0.58, 1), rect(0.58, 0, 0.42, 1 / 3), rect(0.58, 1 / 3, 0.42, 1 / 3), rect(0.58, 2 / 3, 0.42, 1 / 3)];
  }
  if (layoutId === "grid-six") {
    const cols = tall ? 2 : 3;
    const rows = tall ? 3 : 2;
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(rect(c / cols, r / rows, 1 / cols, 1 / rows));
    return out;
  }
  if (layoutId === "grid-nine") {
    const out = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(rect(c / 3, r / 3, 1 / 3, 1 / 3));
    return out;
  }
  // grid-four default
  return [rect(0, 0, 0.5, 0.5), rect(0.5, 0, 0.5, 0.5), rect(0, 0.5, 0.5, 0.5), rect(0.5, 0.5, 0.5, 0.5)];
}

export function panelCountForLayout(layoutId, aspect) {
  return panelsForLayout(layoutId, aspect).length;
}
