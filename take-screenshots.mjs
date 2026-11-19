// Takes the four entry screenshots with headless Chrome over CDP.
// Each shot loads the app from file:// in a ?shot= preset mode, waits for
// window.__shotReady, then captures the viewport as JPEG within gate limits.

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const chromePath = "/opt/meta-chromium/chrome";
const port = 9333;
const shots = [
  { name: "1-cover.jpg", query: "?shot=cover-landscape", width: 1280, height: 720 },
  { name: "2-editor.jpg", query: "?shot=editor", width: 1280, height: 800 },
  { name: "3-cover-square.jpg", query: "?shot=cover-square", width: 1080, height: 1080 },
  { name: "4-cover-portrait.jpg", query: "?shot=cover-portrait", width: 1024, height: 1280 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed: " + url);
  return res.json();
}

async function waitForDebugger() {
  for (let i = 0; i < 60; i++) {
    try {
      const targets = await fetchJson("http://127.0.0.1:" + port + "/json/list");
      const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error("Chrome debugger never came up");
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
  }
  send(method, params) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params: params || {} });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(payload);
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function captureShot(cdp, shot) {
  const fileUrl = "file://" + join(here, "app", "index.html") + shot.query;
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send("Page.navigate", { url: fileUrl });
  // Wait until the app reports the shot scene painted.
  let ready = false;
  for (let i = 0; i < 80; i++) {
    await sleep(400);
    const result = await cdp.send("Runtime.evaluate", {
      expression: "window.__shotReady === true", returnByValue: true,
    });
    if (result && result.result && result.result.value === true) { ready = true; break; }
  }
  if (!ready) throw new Error("shot never ready: " + shot.name);
  await sleep(600);
  // Lower quality until the JPEG fits the 256 KiB gate.
  for (const quality of [85, 75, 65, 55, 45]) {
    const capture = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality, fromSurface: true });
    const bytes = Buffer.from(capture.data, "base64");
    if (bytes.length <= 262144 || quality === 45) {
      const outPath = join(here, "screenshots", shot.name);
      writeFileSync(outPath, bytes);
      console.log(shot.name + " " + shot.width + "x" + shot.height + " quality=" + quality + " bytes=" + bytes.length);
      return;
    }
  }
}

async function main() {
  mkdirSync(join(here, "screenshots"), { recursive: true });
  // This VM's Chromium requires a Hatch WebGL domain policy file at startup.
  const policyPath = "/tmp/neon-poster-webgl-policy.txt";
  const policyText = "hatch-webgl-allowed-domains-v1\n";
  writeFileSync(policyPath, policyText);
  const policySha = createHash("sha256").update(policyText).digest("hex");
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--allow-file-access-from-files",
    "--hatch-webgl-allowed-domains-file=" + policyPath,
    "--hatch-webgl-allowed-domains-sha256=" + policySha,
    "--remote-debugging-port=" + port,
    "--remote-debugging-address=127.0.0.1",
    "--window-size=1280,900",
    "about:blank",
  ], { stdio: "ignore" });
  try {
    const wsUrl = await waitForDebugger();
    const cdp = new CdpClient(wsUrl);
    await cdp.connect();
    await cdp.send("Page.enable", {});
    await cdp.send("Runtime.enable", {});
    for (const shot of shots) {
      await captureShot(cdp, shot);
    }
    cdp.close();
    for (const shot of shots) {
      const size = statSync(join(here, "screenshots", shot.name)).size;
      console.log("final " + shot.name + " bytes=" + size);
    }
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error("screenshot run failed:", error.message);
  process.exit(1);
});
