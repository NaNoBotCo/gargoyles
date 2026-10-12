// node tools/check.mjs [--path th/] [--w 1280] [--h 900] [--png out.png] [--full]
// Opens the built page in headless Chrome over a local server, scrolls through it so every
// toy draws, taps a few things, and reports page errors. Saves a screenshot.
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import http from "http";
import { fileURLToPath } from "url";
const require = createRequire("/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json");
const { chromium } = require("playwright-core");
const here = path.dirname(fileURLToPath(import.meta.url)), docs = path.join(here, "..", "docs");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const sub = opt("--path", ""), W = +opt("--w", "1280"), H = +opt("--h", "900"), png = opt("--png", "research/sheets/page.png"), full = args.includes("--full");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain" };
const server = http.createServer((req, res) => {
  let f = path.join(docs, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!f.startsWith(docs) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const exe = "/Users/annikapeacock/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: W < 700, hasTouch: W < 700 });
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
page.on("requestfailed", r => { if (!r.url().includes("open-meteo")) errs.push("failed: " + r.url()); });
await page.goto(`http://127.0.0.1:${server.address().port}/${sub}`, { waitUntil: "load" });
await page.waitForTimeout(800);
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < total; y += H * 0.7) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(450); }
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
if (!args.includes("--notap")) {
/* taps: hero, sorter, carve drag, hunt, map */
const tap = async (sel, fx, fy) => { const el = await page.$(sel); if (!el) return errs.push("missing " + sel); const b = await el.boundingBox(); if (!b) return; await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy); };
await tap("#hero", 0.3, 0.45); await page.waitForTimeout(200);
await page.click('[data-sort="spout"]').catch(e => errs.push("sort: " + e));
const cv = await page.$("#cv-carve"); if (cv) { await cv.scrollIntoViewIfNeeded(); const b = await cv.boundingBox(); await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3); await page.mouse.down(); for (let i = 0; i < 30; i++) await page.mouse.move(b.x + b.width * (0.3 + (i % 6) * 0.08), b.y + b.height * (0.25 + Math.floor(i / 6) * 0.1)); await page.mouse.up(); }
const hv = await page.$("#cv-hunt"); if (hv) { await hv.scrollIntoViewIfNeeded(); await tap("#cv-hunt", 0.5, 0.3); }
const mv = await page.$("#cv-map"); if (mv) { await mv.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await tap("#cv-map", 0.5, 0.3); }
}
await page.waitForTimeout(400);
const outs = await page.evaluate(() => ["sort-out", "throw-out", "rouen-out", "kirti-out", "hiti-out", "carve-out", "hunt-out", "map-rain", "hero-now"].map(id => id + ": " + ((document.getElementById(id) || {}).textContent || "(missing)")));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
await page.screenshot({ path: png, fullPage: full });
await browser.close(); server.close();
console.log(outs.join("\n")); console.log("horizontal overflow px:", overflow);
console.log(errs.length ? errs.join("\n") : "no page errors");
