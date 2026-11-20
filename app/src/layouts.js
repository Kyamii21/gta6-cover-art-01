// Poster layouts for Neon Vice Cover Forge.
// Each layout maps a canvas of any size to a list of panels in
// normalized 0..1 coordinates. A panel is either a rect {x,y,w,h}
// or a polygon {poly:[[x,y],...]} for the diagonal bands.
// The renderer insets every panel by half the gutter, so panels
// listed edge-to-edge still get the thick dark seams of a
// game-cover collage.

function rect(x, y, w, h) {
  return { x, y, w, h };
}

export const LAYOUTS = [
  {
    id: 'solo',
    name: 'Solo',
    panels: () => [rect(0, 0, 1, 1)],
  },
  {
    id: 'duo-v',
    name: 'Duo Vertical',
    panels: () => [rect(0, 0, 0.5, 1), rect(0.5, 0, 0.5, 1)],
  },
  {
    id: 'duo-h',
    name: 'Duo Horizontal',
    panels: () => [rect(0, 0, 1, 0.5), rect(0, 0.5, 1, 0.5)],
  },
  {
    id: 'triptych',
    name: 'Triptych',
    panels: () => [rect(0, 0, 1 / 3, 1), rect(1 / 3, 0, 1 / 3, 1), rect(2 / 3, 0, 1 / 3, 1)],
  },
  {
    id: 'big-two',
    name: 'Big + Two',
    panels: () => [rect(0, 0, 0.62, 1), rect(0.62, 0, 0.38, 0.5), rect(0.62, 0.5, 0.38, 0.5)],
  },
  {
    id: 'quad',
    name: 'Quad Grid',
    panels: () => [
      rect(0, 0, 0.5, 0.5), rect(0.5, 0, 0.5, 0.5),
      rect(0, 0.5, 0.5, 0.5), rect(0.5, 0.5, 0.5, 0.5),
    ],
  },
  {
    id: 'hero-strip',
    name: 'Hero + Strip',
    panels: () => [
      rect(0, 0, 1, 0.68),
      rect(0, 0.68, 1 / 3, 0.32), rect(1 / 3, 0.68, 1 / 3, 0.32), rect(2 / 3, 0.68, 1 / 3, 0.32),
    ],
  },
  {
    id: 'diagonal',
    name: 'Diagonal Bands',
    panels: () => [
      { poly: [[0, 0], [0.52, 0], [0.3, 1], [0, 1]] },
      { poly: [[0.52, 0], [0.84, 0], [0.62, 1], [0.3, 1]] },
      { poly: [[0.84, 0], [1, 0], [1, 1], [0.62, 1]] },
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

// Bounding box of a panel (rect or polygon), in normalized coords.
export function panelBox(panel) {
  if (panel.poly) {
    const xs = panel.poly.map((p) => p[0]);
    const ys = panel.poly.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
}

// Point-in-panel test in normalized coords (for click selection).
export function panelContains(panel, nx, ny) {
  if (!panel.poly) {
    return nx >= panel.x && nx <= panel.x + panel.w && ny >= panel.y && ny <= panel.y + panel.h;
  }
  let inside = false;
  const pts = panel.poly;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > ny) !== (yj > ny) && nx < ((xj - xi) * (ny - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
