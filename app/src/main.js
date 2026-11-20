// Neon Vice Cover Forge — GTA-style multi-panel poster cover maker.
// 100% local: photos are read with FileReader / drawn from bundled samples,
// never uploaded. No network requests, no Rockstar assets — original design.
const $ = (s) => document.querySelector(s);
const canvas = $("#cover");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const SAMPLES = [
  ["pier", "Pier Dusk"], ["boulevard", "Boulevard"], ["sunset-beach", "Sunset Beach"],
  ["neon-street", "Neon Street"], ["desert-road", "Desert Road"], ["marina", "Marina"],
  ["skyline", "Skyline"], ["boardwalk", "Boardwalk"],
];

// Layouts: panels as [x,y,w,h] fractions; "diag" panels are parallelograms.
const LAYOUTS = {
  "Classic Grid 4": [[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]],
  "Hero + 3": [[0,0,1,.58],[0,.58,.34,.42],[.34,.58,.33,.42],[.67,.58,.33,.42]],
  "Diagonal Split": "diag",
  "Triptych": [[0,0,.34,1],[.34,0,.33,1],[.67,0,.33,1]],
  "Comic Strip": [[0,0,1,.34],[0,.34,1,.33],[0,.67,1,.33]],
  "Big Left": [[0,0,.62,1],[.62,0,.38,.5],[.62,.5,.38,.5]],
  "Mosaic 6": [[0,0,.34,.5],[.34,0,.33,.5],[.67,0,.33,.5],[0,.5,.34,.5],[.34,.5,.33,.5],[.67,.5,.33,.5]],
  "Single Hero": [[0,0,1,1]],
};

// Gradient-map ramps: [shadow, mid, highlight] RGB stops.
const GRADES = {
  "Poster Comic": { ramp: null, sat: 1.35, con: 1.12 },
  "Sunset Vice": { ramp: [[38,16,84],[255,94,58],[255,214,120]], sat: 1.2, con: 1.08 },
  "Neon Nights": { ramp: [[8,10,44],[190,40,200],[80,230,255]], sat: 1.3, con: 1.15 },
  "Teal & Orange": { ramp: [[6,48,58],[40,150,150],[255,170,80]], sat: 1.15, con: 1.1 },
  "Golden Hour": { ramp: [[60,30,20],[200,110,50],[255,230,160]], sat: 1.25, con: 1.05 },
  "Bubblegum Pop": { ramp: [[70,20,90],[255,90,170],[255,240,200]], sat: 1.4, con: 1.1 },
  "Midnight Ink": { ramp: [[10,12,30],[70,90,160],[230,240,255]], sat: 0.85, con: 1.2 },
  "Desert Heat": { ramp: [[80,30,10],[230,120,40],[255,240,190]], sat: 1.3, con: 1.08 },
  "Mono Print": { ramp: [[15,15,18],[120,120,128],[250,250,248]], sat: 0, con: 1.18 },
};

const LETTERING = ["Stacked Block", "Sticker Pop", "Block Shadow", "Italic Speed", "Hollow Outline", "Chrome", "Neon Glow", "Arched"];

const state = {
  img: null, layout: "Classic Grid 4", grade: "Poster Comic", lettering: "Stacked Block",
  title: "SUNSET HEIST", subtitle: "A NEON VICE STORY",
  borderW: 10, borderC: "#111111", levels: 5, ink: 55,
  halftone: false, grain: true, vignette: true, tsize: 110, tpos: 78,
  panels: [], // per-panel {dx,dy,zoom}
};

function panelsFor(layout, W, H) {
  if (layout === "Diagonal Split") {
    const s = W * 0.16;
    return [
      { poly: [[0,0],[W*0.62,0],[W*0.62-s,H],[0,H]] },
      { poly: [[W*0.62,0],[W,0],[W,H],[W*0.62-s,H]] },
    ];
  }
  return LAYOUTS[layout].map(([x,y,w,h]) => ({ x: x*W, y: y*H, w: w*W, h: h*H }));
}
function bbox(p) {
  if (p.poly) {
    const xs = p.poly.map(q=>q[0]), ys = p.poly.map(q=>q[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs)-Math.min(...xs), h: Math.max(...ys)-Math.min(...ys) };
  }
  return p;
}
function ensurePanels(n) {
  while (state.panels.length < n) state.panels.push({ dx: 0, dy: 0, zoom: 1 });
  state.panels.length = Math.max(state.panels.length, n);
}

// ---- image pipeline: posterize + gradient map + Sobel ink ----
function gradeImageData(id, grade, levels, inkAmt) {
  const { data, width: w, height: h } = id;
  const g = GRADES[grade];
  const lum = new Float32Array(w*h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]) / 255;
  }
  const step = 255 / (levels - 1);
  const ramp = g.ramp;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let r = data[i], gg = data[i+1], b = data[i+2];
    // contrast + saturation
    r = (r-128)*g.con+128; gg = (gg-128)*g.con+128; b = (b-128)*g.con+128;
    const l = 0.299*r+0.587*gg+0.114*b;
    r = l+(r-l)*g.sat; gg = l+(gg-l)*g.sat; b = l+(b-l)*g.sat;
    // posterize
    r = Math.round(r/step)*step; gg = Math.round(gg/step)*step; b = Math.round(b/step)*step;
    // gradient map (duotone blend 72%)
    if (ramp) {
      const t = Math.min(1, Math.max(0, lum[p]));
      const [a, m, hi] = ramp;
      const c = t < 0.5
        ? [a[0]+(m[0]-a[0])*(t*2), a[1]+(m[1]-a[1])*(t*2), a[2]+(m[2]-a[2])*(t*2)]
        : [m[0]+(hi[0]-m[0])*((t-0.5)*2), m[1]+(hi[1]-m[1])*((t-0.5)*2), m[2]+(hi[2]-m[2])*((t-0.5)*2)];
      r = r*0.28 + c[0]*0.72; gg = gg*0.28 + c[1]*0.72; b = b*0.28 + c[2]*0.72;
    }
    data[i] = r; data[i+1] = gg; data[i+2] = b;
  }
  // Sobel ink overlay
  if (inkAmt > 0) {
    const k = inkAmt / 100;
    for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
      const p = y*w+x;
      const gx = -lum[p-w-1]-2*lum[p-1]-lum[p+w-1]+lum[p-w+1]+2*lum[p+1]+lum[p+w+1];
      const gy = -lum[p-w-1]-2*lum[p-w]-lum[p-w+1]+lum[p+w-1]+2*lum[p+w]+lum[p+w+1];
      const mag = Math.min(1, Math.sqrt(gx*gx+gy*gy) * 2.2);
      if (mag > 0.22) {
        const i = p*4, f = 1 - (mag-0.22) * k * 1.4;
        data[i] *= f; data[i+1] *= f; data[i+2] *= f;
      }
    }
  }
  return id;
}

// ---- post effects: halftone dots, film grain, vignette ----
function postEffects(c, W, H) {
  if (state.halftone) {
    const cell = Math.max(6, Math.round(W/140));
    const src = c.getImageData(0, 0, W, H).data;
    c.save(); c.fillStyle = "rgba(10,8,18,0.55)";
    for (let y = cell/2; y < H; y += cell) for (let x = cell/2; x < W; x += cell) {
      const i = ((y|0)*W + (x|0)) * 4;
      const l = (0.299*src[i] + 0.587*src[i+1] + 0.114*src[i+2]) / 255;
      const r = (1-l) * cell * 0.62;
      if (r > 0.6) { c.beginPath(); c.arc(x, y, r, 0, Math.PI*2); c.fill(); }
    }
    c.restore();
  }
  if (state.grain) {
    const id = c.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random()-0.5) * 26;
      d[i] += n; d[i+1] += n; d[i+2] += n;
    }
    c.putImageData(id, 0, 0);
  }
  if (state.vignette) {
    const g = c.createRadialGradient(W/2, H/2, Math.min(W,H)*0.42, W/2, H/2, Math.max(W,H)*0.78);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(8,4,20,0.5)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
}

// ---- lettering ----
function drawLettering(c, W, H) {
  const title = (state.title || "").toUpperCase();
  const sub = (state.subtitle || "").toUpperCase();
  if (!title) return;
  const size = state.tsize * (W/1080);
  const y = H * state.tpos / 100;
  c.save();
  c.textAlign = "center"; c.textBaseline = "middle";
  const font = (s, italic=false) => `${italic ? "italic " : ""}900 ${s}px "${italic ? "Forge Italic" : "Forge Black"}", sans-serif`;
  const style = state.lettering;
  const drawSub = (yy, col) => {
    if (!sub) return;
    c.font = font(size*0.30); c.fillStyle = col;
    c.fillText(sub, W/2, yy);
  };
  if (style === "Stacked Block") {
    const words = title.split(/\s+/);
    const mid = Math.ceil(words.length/2);
    const l1 = words.slice(0, mid).join(" "), l2 = words.slice(mid).join(" ");
    c.font = font(size);
    c.lineWidth = size*0.16; c.strokeStyle = "#111"; c.lineJoin = "round";
    const lines = l2 ? [l1, l2] : [l1];
    lines.forEach((ln, i) => {
      const yy = y + (i - (lines.length-1)/2) * size*1.02;
      c.strokeText(ln, W/2, yy);
      const grad = c.createLinearGradient(0, yy-size/2, 0, yy+size/2);
      grad.addColorStop(0, "#fff7d6"); grad.addColorStop(0.55, "#ffd23f"); grad.addColorStop(1, "#ff8a3d");
      c.fillStyle = grad; c.fillText(ln, W/2, yy);
    });
    drawSub(y + lines.length*size*0.62, "#ffffff");
  } else if (style === "Sticker Pop") {
    c.font = font(size);
    c.lineWidth = size*0.30; c.strokeStyle = "#ffffff"; c.lineJoin = "round";
    c.strokeText(title, W/2, y);
    c.fillStyle = "#ff2e88"; c.fillText(title, W/2, y);
    drawSub(y + size*0.78, "#111111");
  } else if (style === "Block Shadow") {
    c.font = font(size);
    c.fillStyle = "#111111"; c.fillText(title, W/2 + size*0.09, y + size*0.09);
    c.fillStyle = "#3ae2ff"; c.fillText(title, W/2, y);
    drawSub(y + size*0.78, "#ffffff");
  } else if (style === "Italic Speed") {
    c.transform(1, 0, -0.18, 1, H*0.0, 0);
    c.font = font(size, true);
    c.lineWidth = size*0.12; c.strokeStyle = "#111"; c.lineJoin = "round";
    c.strokeText(title, W/2, y);
    c.fillStyle = "#ffffff"; c.fillText(title, W/2, y);
    drawSub(y + size*0.78, "#ffd23f");
  } else if (style === "Hollow Outline") {
    c.font = font(size);
    c.lineWidth = size*0.05; c.strokeStyle = "#ffffff";
    c.strokeText(title, W/2, y);
    drawSub(y + size*0.78, "#ffffff");
  } else if (style === "Chrome") {
    c.font = font(size);
    c.lineWidth = size*0.14; c.strokeStyle = "#101018"; c.lineJoin = "round";
    c.strokeText(title, W/2, y);
    const g = c.createLinearGradient(0, y-size*0.55, 0, y+size*0.55);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.38, "#9fd8ff"); g.addColorStop(0.5, "#2b3a67");
    g.addColorStop(0.62, "#e8f6ff"); g.addColorStop(1, "#7fb2e5");
    c.fillStyle = g; c.fillText(title, W/2, y);
    drawSub(y + size*0.78, "#ffd23f");
  } else if (style === "Neon Glow") {
    c.font = font(size);
    c.shadowColor = "#ff2e88"; c.shadowBlur = size*0.32;
    c.strokeStyle = "#ff2e88"; c.lineWidth = size*0.07;
    c.strokeText(title, W/2, y); c.strokeText(title, W/2, y);
    c.shadowBlur = size*0.16; c.fillStyle = "#ffe6f4"; c.fillText(title, W/2, y);
    c.shadowBlur = 0;
    drawSub(y + size*0.78, "#3ae2ff");
  } else if (style === "Arched") {
    // letters laid along an arc, each rotated to the tangent
    c.font = font(size*0.92);
    const chars = [...title];
    const widths = chars.map(ch => c.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const radius = Math.max(total*1.15, size*3.2);
    const cx = W/2, cy = y + radius;
    let ang = -total/2/radius;
    c.lineWidth = size*0.14; c.strokeStyle = "#111"; c.lineJoin = "round";
    chars.forEach((ch, i) => {
      const wdt = widths[i], mid = ang + (wdt/2)/radius;
      const px = cx + Math.sin(mid)*radius, py = cy - Math.cos(mid)*radius;
      c.save(); c.translate(px, py); c.rotate(mid);
      c.strokeText(ch, 0, 0);
      c.fillStyle = "#ffd23f"; c.fillText(ch, 0, 0);
      c.restore();
      ang += wdt/radius;
    });
    drawSub(y + size*0.72, "#ffffff");
  }
  c.restore();
}

// ---- main render ----
function render(target = canvas, W = 1080, H = 1080) {
  const c = target.getContext("2d", { willReadFrequently: true });
  target.width = W; target.height = H;
  c.fillStyle = state.borderC; c.fillRect(0, 0, W, H);
  const panels = panelsFor(state.layout, W, H);
  ensurePanels(panels.length);
  const bw = state.borderW * (W/1080);
  panels.forEach((p, i) => {
    const b = bbox(p);
    c.save();
    c.beginPath();
    if (p.poly) { p.poly.forEach(([x,y], j) => j ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); }
    else c.rect(b.x, b.y, b.w, b.h);
    c.clip();
    if (state.img) {
      const img = state.img, st = state.panels[i];
      const scale = Math.max(b.w/img.width, b.h/img.height) * st.zoom;
      const dw = img.width*scale, dh = img.height*scale;
      const dx = b.x + (b.w-dw)/2 + st.dx*W/1080, dy = b.y + (b.h-dh)/2 + st.dy*H/1080;
      c.drawImage(img, dx, dy, dw, dh);
      // grade only the panel region
      const rx = Math.max(0, Math.floor(b.x)), ry = Math.max(0, Math.floor(b.y));
      const rw = Math.min(W-rx, Math.ceil(b.w)), rh = Math.min(H-ry, Math.ceil(b.h));
      if (rw > 2 && rh > 2) {
        const id = c.getImageData(rx, ry, rw, rh);
        c.putImageData(gradeImageData(id, state.grade, state.levels, state.ink), rx, ry);
      }
    } else {
      c.fillStyle = "#2b1a4d"; c.fillRect(b.x, b.y, b.w, b.h);
      c.fillStyle = "#a99bd4"; c.font = "28px sans-serif"; c.textAlign = "center";
      c.fillText("Upload a photo or pick a sample", b.x+b.w/2, b.y+b.h/2);
    }
    c.restore();
    // border stroke
    if (bw > 0) {
      c.save(); c.strokeStyle = state.borderC; c.lineWidth = bw*2;
      c.beginPath();
      if (p.poly) { p.poly.forEach(([x,y], j) => j ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); }
      else c.rect(b.x, b.y, b.w, b.h);
      c.stroke(); c.restore();
    }
  });
  postEffects(c, W, H);
  drawLettering(c, W, H);
}

// ---- UI wiring ----
function chips(el, names, get, set) {
  el.innerHTML = "";
  names.forEach(n => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = n; b.className = get() === n ? "on" : "";
    b.onclick = () => { set(n); chips(el, names, get, set); render(); };
    el.appendChild(b);
  });
}
function loadImage(src, label) {
  const img = new Image();
  img.onload = () => { state.img = img; state.panels = []; render(); $("#status").textContent = label ? `Loaded: ${label}` : ""; };
  img.src = src;
}
function buildGallery() {
  const g = $("#gallery"); g.innerHTML = "";
  SAMPLES.forEach(([name, label]) => {
    const b = document.createElement("button"); b.type = "button"; b.title = label;
    const im = document.createElement("img"); im.src = `./samples/${name}.jpg`; im.alt = label;
    b.appendChild(im);
    b.onclick = () => { g.querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on"); loadImage(`./samples/${name}.jpg`, label); };
    g.appendChild(b);
  });
}
function bindRange(id, key, out) {
  const el = $(id);
  el.addEventListener("input", () => { state[key] = +el.value; $(out).textContent = el.value; render(); });
}
function init() {
  buildGallery();
  chips($("#layouts"), Object.keys(LAYOUTS), () => state.layout, v => state.layout = v);
  chips($("#grades"), Object.keys(GRADES), () => state.grade, v => state.grade = v);
  chips($("#lettering"), LETTERING, () => state.lettering, v => state.lettering = v);
  $("#file").addEventListener("change", (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => loadImage(r.result, f.name);
    r.readAsDataURL(f);
  });
  $("#title").addEventListener("input", (e) => { state.title = e.target.value; render(); });
  $("#subtitle").addEventListener("input", (e) => { state.subtitle = e.target.value; render(); });
  $("#borderC").addEventListener("input", (e) => { state.borderC = e.target.value; render(); });
  $("#halftone").addEventListener("change", (e) => { state.halftone = e.target.checked; render(); });
  $("#grain").addEventListener("change", (e) => { state.grain = e.target.checked; render(); });
  $("#vignette").addEventListener("change", (e) => { state.vignette = e.target.checked; render(); });
  bindRange("#borderW", "borderW", "#borderWv");
  bindRange("#levels", "levels", "#levelsv");
  bindRange("#ink", "ink", "#inkv");
  bindRange("#tsize", "tsize", "#tsizev");
  bindRange("#tpos", "tpos", "#tposv");
  $("#shuffle").onclick = () => {
    const pick = (a) => a[Math.floor(Math.random()*a.length)];
    state.layout = pick(Object.keys(LAYOUTS)); state.grade = pick(Object.keys(GRADES)); state.lettering = pick(LETTERING);
    chips($("#layouts"), Object.keys(LAYOUTS), () => state.layout, v => state.layout = v);
    chips($("#grades"), Object.keys(GRADES), () => state.grade, v => state.grade = v);
    chips($("#lettering"), LETTERING, () => state.lettering, v => state.lettering = v);
    render();
  };
  document.querySelectorAll(".exp").forEach(b => b.onclick = () => {
    const w = +b.dataset.w, h = +b.dataset.h;
    const off = document.createElement("canvas");
    render(off, w, h);
    const a = document.createElement("a");
    a.download = `cover-${w}x${h}.png`; a.href = off.toDataURL("image/png"); a.click();
    $("#status").textContent = `Exported PNG ${w}×${h}`;
    render();
  });
  // drag / zoom per panel
  let drag = null;
  const panelAt = (x, y) => {
    const panels = panelsFor(state.layout, 1080, 1080);
    for (let i = panels.length-1; i >= 0; i--) { const b = bbox(panels[i]); if (x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return i; }
    return 0;
  };
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX-r.left)*1080/r.width, (e.clientY-r.top)*1080/r.height]; };
  canvas.addEventListener("pointerdown", (e) => { const [x,y] = pos(e); drag = { i: panelAt(x,y), x, y }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return; const [x,y] = pos(e); const st = state.panels[drag.i];
    st.dx += (x-drag.x); st.dy += (y-drag.y); drag.x = x; drag.y = y; render();
  });
  canvas.addEventListener("pointerup", () => drag = null);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault(); const [x,y] = pos(e); const st = state.panels[panelAt(x,y)];
    st.zoom = Math.min(4, Math.max(1, st.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); render();
  }, { passive: false });
  canvas.addEventListener("dblclick", (e) => { const [x,y] = pos(e); state.panels[panelAt(x,y)] = { dx: 0, dy: 0, zoom: 1 }; render(); });

  // shot mode: ?shot=cover|editor&photo=<sample>&caption=<text>&layout=&grade=&lettering=&sub=
  const q = new URLSearchParams(location.search);
  if (q.get("shot")) {
    document.body.classList.add(q.get("shot") === "cover" ? "shot-cover" : "shot-editor");
    if (q.get("layout") && LAYOUTS[q.get("layout")]) state.layout = q.get("layout");
    if (q.get("grade") && GRADES[q.get("grade")]) state.grade = q.get("grade");
    if (q.get("lettering") && LETTERING.includes(q.get("lettering"))) state.lettering = q.get("lettering");
    if (q.get("caption")) { state.title = q.get("caption"); $("#title").value = state.title; }
    if (q.get("sub")) { state.subtitle = q.get("sub"); $("#subtitle").value = state.subtitle; }
    if (q.get("levels")) state.levels = +q.get("levels");
    if (q.get("ink")) state.ink = +q.get("ink");
    if (q.get("tsize")) state.tsize = +q.get("tsize");
    if (q.get("tpos")) state.tpos = +q.get("tpos");
    if (q.get("halftone")) { state.halftone = q.get("halftone") === "1"; $("#halftone").checked = state.halftone; }
    if (q.get("borderW")) state.borderW = +q.get("borderW");
    if (q.get("borderC")) state.borderC = "#" + q.get("borderC");
    const photo = q.get("photo") || "pier";
    loadImage(`./samples/${photo}.jpg`, photo);
  } else {
    loadImage("./samples/pier.jpg", "Pier Dusk");
  }
  render();
}
document.fonts.ready.then(init);
