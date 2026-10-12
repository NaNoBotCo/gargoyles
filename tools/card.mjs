// node tools/card.mjs — renders docs/card.html at 1200x630 to docs/card.jpg
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import http from "http";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
const require = createRequire("/Users/annikapeacock/Developer/claude code projects/anidoodle-motdang/package.json");
const { chromium } = require("playwright-core");
const here = path.dirname(fileURLToPath(import.meta.url)), docs = path.join(here, "..", "docs");
const server = http.createServer((req, res) => {
  const f = path.join(docs, decodeURIComponent(req.url.split("?")[0]));
  if (!f.startsWith(docs) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8" }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/Users/annikapeacock/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`http://127.0.0.1:${server.address().port}/card.html`);
await page.waitForSelector("body[data-done]");
const png = path.join(here, "..", "research", "card.png");
await page.screenshot({ path: png });
await browser.close(); server.close();
execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", png, "--out", path.join(docs, "card.jpg")], { stdio: "ignore" });
console.log("docs/card.jpg", fs.statSync(path.join(docs, "card.jpg")).size, "bytes");
