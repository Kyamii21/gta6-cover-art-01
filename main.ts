// Neon Vice Cover Forge — entry program.
// Hands the finished app in: copies app/ and screenshots/ from this
// repository into the output directory, then writes dossier.json with
// buildDossier from the vendored make.fun library, exactly as the
// scorer will rebuild it. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });

for (const part of ['app', 'screenshots']) {
  cpSync(join(repoRoot, part), join(outDir, part), { recursive: true });
  console.log(`copied ${part}/ -> ${join(outDir, part)}`);
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`wrote dossier.json (${dossier.byteLength} bytes)`);
