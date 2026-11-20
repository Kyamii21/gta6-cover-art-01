// Screenshot runner for Neon Vice Cover Forge.
// Drives headless Chrome over the DevTools protocol: for each entry
// in shots.json it opens app/index.html with the shot query at the
// shot's viewport size, waits for the app to signal __shotReady,
// and saves a JPEG into screenshots/. No dependencies beyond
// Node's built-in WebSocket and fetch.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const appUrl = 'file://' + join(root, 'app', 'index.html');
const PORT = 9333;

// This VM's Chromium refuses to start without its WebGL domain
// policy: pass the image's policy file and its sha256 when present.
const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const policyArgs = existsSync(policyPath)
  ? [
      `--hatch-webgl-allowed-domains-file=${policyPath}`,
      `--hatch-webgl-allowed-domains-sha256=${createHash('sha256').update(readFileSync(policyPath)).digest('hex')}`,
    ]
  : [];

const chrome = spawn('/opt/meta-chromium/chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  ...policyArgs,
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/forge-chrome-profile',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browserWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let nextId = 1;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: ok, reject: bad } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) bad(new Error(JSON.stringify(msg.error)));
        else ok(msg.result);
      }
    };
    ws.onerror = reject;
    ws.onopen = () => resolve({
      send(method, params = {}, sessionId) {
        const id = nextId++;
        const payload = { id, method, params };
        if (sessionId) payload.sessionId = sessionId;
        return new Promise((ok, bad) => {
          pending.set(id, { resolve: ok, reject: bad });
          ws.send(JSON.stringify(payload));
        });
      },
      close() { ws.close(); },
    });
  });
}

async function main() {
  const cdp = await connect(await browserWsUrl());
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);

  mkdirSync(join(root, 'screenshots'), { recursive: true });

  for (const shot of shots) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false,
    }, sessionId);
    await cdp.send('Page.navigate', { url: appUrl + shot.query }, sessionId);

    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) {
      await sleep(250);
      const r = await cdp.send('Runtime.evaluate', {
        expression: 'window.__shotReady === true', returnByValue: true,
      }, sessionId);
      ready = r.result?.value === true;
    }
    if (!ready) throw new Error(`shot ${shot.name}: app never signalled ready`);
    await sleep(350);

    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 82, captureBeyondViewport: false,
    }, sessionId);
    const buf = Buffer.from(data, 'base64');
    writeFileSync(join(root, 'screenshots', shot.name), buf);
    console.log(`${shot.name}  ${shot.w}x${shot.h}  ${buf.length} bytes`);
  }

  cdp.close();
  chrome.kill('SIGTERM');
}

main().catch((err) => {
  console.error(err);
  chrome.kill('SIGKILL');
  process.exit(1);
});
