// node tools/film.mjs <spec>... --out film.mp4 [--secs 4] [--fps 24] [--t 0] [--size 360] [--still <frame>]
// Films the specs side by side by calling sheet.html's drawAt(t) each frame, then checks for
// dead air: ffmpeg's freezedetect lists any stretch of a second or more where nothing changed.
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import http from "http";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
const require = createRequire("/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json");
const { chromium } = require("playwright-core");
const here = path.dirname(fileURLToPath(import.meta.url)), docs = path.join(here, "..", "docs");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = opt("--out", "film.mp4"), secs = +opt("--secs", "4"), fps = +opt("--fps", "24"), t0 = +opt("--t", "0"), size = opt("--size", "360"), still = opt("--still", null);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const f = path.join(docs, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(docs) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const exe = "/Users/annikapeacock/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 1240, height: 800 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/sheet.html?t=${t0}&size=${size}&s=${encodeURIComponent(args.join("|"))}`);
await page.waitForSelector("body[data-done]", { timeout: 20000 });
const el = await page.$("#g");
const dir = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), ".frames-"));
const n = still != null ? 1 : Math.round(secs * fps);
for (let i = 0; i < n; i++) {
  const f = still != null ? +still : i;
  await page.evaluate(t => window.drawAt(t), t0 + f * 1000 / fps);
  await el.screenshot({ path: still != null ? out : path.join(dir, String(i).padStart(5, "0") + ".png") });
}
await browser.close(); server.close();
if (still == null) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "%05d.png"), "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "22", out]);
  let frozen = "";
  try { execFileSync("ffmpeg", ["-i", out, "-vf", "freezedetect=n=0.0008:d=1", "-map", "0:v", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] }); }
  catch (e) { frozen = String(e.stderr || ""); }
  const log = execFileSync("sh", ["-c", `ffmpeg -i "${out}" -vf freezedetect=n=0.0008:d=1 -map 0:v -f null - 2>&1 | grep freeze_ || true`]).toString();
  console.log(out, log.trim() ? "DEAD AIR:\n" + log.trim() : "moves every second");
  void frozen;
}
fs.rmSync(dir, { recursive: true, force: true });
if (errs.length) { console.error(errs.join("\n")); process.exitCode = 1; }
