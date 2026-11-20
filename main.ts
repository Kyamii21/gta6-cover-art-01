// Entrypoint for handing this cover-art studio over to the grader.
// The job here is deliberately small: gather the finished web app and
// its screenshots into the output folder the platform expects, then
// describe that bundle in a dossier file so the entry can be checked
// and scored. Everything else (the studio itself) lives under app/.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });

cpSync(join(here, "app"), join(outputDir, "app"), { recursive: true });

const shotsOut = join(outputDir, "screenshots");
mkdirSync(shotsOut, { recursive: true });
const shotsIn = join(here, "screenshots");
if (existsSync(shotsIn)) {
  cpSync(shotsIn, shotsOut, { recursive: true });
}

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, "dossier.json"), dossier);
