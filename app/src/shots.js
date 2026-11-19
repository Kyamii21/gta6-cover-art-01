// Fixed scenes for screenshots. ?shot=cover-wide | cover-square | cover-portrait
// shows only the rendered cover (body.shot-cover); ?shot=editor shows the full
// editor with samples loaded. Every panel uses a DIFFERENT sample photo.
// window.__shotReady is set once the scene has painted.

const SCENES = {
  'cover-wide': {
    coverOnly: true,
    size: [1920, 1080],
    layout: 'hero',
    grade: 'poster',
    panels: [
      { photo: 'beach-sunset', zoom: 1.05, ox: 0, oy: -0.3 },
      { photo: 'convertible', zoom: 1.1, ox: 0.1, oy: -0.2 },
      { photo: 'neon-street', zoom: 1.05, ox: -0.1, oy: -0.35 },
    ],
    caption: { line1: 'NEON', line2: 'HORIZON', style: 'sunset', size: 108, outline: 15, y: 88, tilt: -2 },
  },
  'cover-square': {
    coverOnly: true,
    size: [1080, 1080],
    layout: 'quad',
    grade: 'sunset',
    panels: [
      { photo: 'convertible', zoom: 1.15, ox: 0.15, oy: -0.25 },
      { photo: 'fishing-boat', zoom: 1.05, ox: 0, oy: -0.3 },
      { photo: 'boulevard', zoom: 1.05, ox: 0, oy: -0.4 },
      { photo: 'neon-street', zoom: 1.1, ox: -0.15, oy: -0.3 },
    ],
    caption: { line1: 'SUMMER', line2: 'HEIST', style: 'pop', size: 100, outline: 14, y: 88, tilt: -2 },
  },
  'cover-portrait': {
    coverOnly: true,
    size: [1080, 1350],
    layout: 'banner',
    grade: 'neon',
    panels: [
      { photo: 'neon-street', zoom: 1.1, ox: 0, oy: -0.3 },
      { photo: 'pier', zoom: 1.05, ox: 0.15, oy: -0.55 },
      { photo: 'beach-sunset', zoom: 1.1, ox: -0.1, oy: -0.25 },
    ],
    caption: { line1: 'MIDNIGHT', line2: 'DRIVE', style: 'neon', size: 104, outline: 13, y: 90, tilt: -1.5 },
  },
  editor: {
    coverOnly: false,
    size: [1920, 1080],
    layout: 'hero',
    grade: 'poster',
    panels: [
      { photo: 'beach-sunset', zoom: 1.05, ox: 0, oy: -0.3 },
      { photo: 'convertible', zoom: 1.1, ox: 0.1, oy: -0.2 },
      { photo: 'neon-street', zoom: 1.05, ox: -0.1, oy: -0.35 },
    ],
    caption: { line1: 'NEON', line2: 'HORIZON', style: 'sunset', size: 108, outline: 15, y: 88, tilt: -2 },
  },
};

export function runShot(shot, api) {
  const scene = SCENES[shot] ?? SCENES.editor;
  if (scene.coverOnly) document.body.classList.add('shot-cover');
  api.state.layout = scene.layout;
  api.state.grade = scene.grade;
  api.state.panels = [];
  api.setSize(scene.size[0], scene.size[1]);
  scene.panels.forEach((p, i) => api.setPanel(i, p.photo, p));
  api.setCaption(scene.caption);
  api.state.selected = scene.coverOnly ? -1 : 0;
  api.syncInputs();
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
