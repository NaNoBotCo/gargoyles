// node tools/sheet.mjs <spec>... --png out.png [--t 4200] [--size 360]
// Renders docs/sheet.html in headless Chrome and saves one PNG of all the specs side by side.
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire("/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json");
const { chromium } = require("playwright-core");
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const png = opt("--png", "sheet.png"), t = opt("--t", "4200"), size = opt("--size", "360"), cols = +opt("--cols", "4");
const specs = args.length ? args : [];
const exe = "/Users/annikapeacock/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
import http from "http";
import fs from "fs";
const docs = path.join(here, "..", "docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const f = path.join(docs, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(docs) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch({ executablePath: exe });
const W = Math.max(1220, cols * (+size + 16) + 16);
const page = await browser.newPage({ viewport: { width: W, height: 800 }, deviceScaleFactor: 1 });
const errs = [];
page.on("pageerror", e => errs.push(String(e)));
page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
const url = "http://127.0.0.1:" + port + "/sheet.html?t=" + t + "&size=" + size + (specs.length ? "&s=" + encodeURIComponent(specs.join("|")) : "");
await page.goto(url);
await page.waitForSelector("body[data-done]", { timeout: 20000 }).catch(() => errs.push("sheet did not finish"));
await page.screenshot({ path: png, fullPage: true });
await browser.close();
server.close();
if (errs.length) { console.error(errs.join("\n")); process.exitCode = 1; }
console.log(png);
