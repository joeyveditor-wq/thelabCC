import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";
const outDir = path.join(process.cwd(), "temporary screenshots");
fs.mkdirSync(outDir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(outDir, `screenshot-${n}${label ? "-" + label : ""}.png`))) n++;
const outPath = path.join(outDir, `screenshot-${n}${label ? "-" + label : ""}.png`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: outPath });
await browser.close();
console.log("Saved", outPath);
