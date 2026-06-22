#!/usr/bin/env node
/**
 * smoke.mjs — Runtime smoke del frontend. Build + serve + carga headless.
 * Caza el fallo que un build limpio NO ve: el crash de runtime que deja la
 * pantalla en blanco (ej. el TDZ que nos rompió la demo). Verifica que #root
 * renderice contenido y que no haya errores de consola en el arranque.
 *
 * Uso:   npm run smoke
 * Requiere Playwright una sola vez:
 *        npm i -D playwright && npx playwright install chromium
 */
import { execSync, spawn } from "node:child_process";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("⚠ Playwright no instalado — smoke de runtime omitido (no bloqueante).");
  console.error("  Instalá una vez:  npm i -D playwright && npx playwright install chromium");
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("• vite build…");
execSync("npx vite build", { stdio: "inherit" });

console.log("• vite preview…");
const srv = spawn("npx", ["vite", "preview", "--port", "4173", "--strictPort"], { stdio: "ignore" });

let code = 1;
try {
  await sleep(2500);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("http://localhost:4173", { waitUntil: "networkidle", timeout: 15000 });
  await sleep(800);
  const rootKids = await page.evaluate(() => document.getElementById("root")?.childElementCount ?? 0);
  await browser.close();

  if (rootKids > 0 && errors.length === 0) {
    console.log("✓ SMOKE PASS — la app renderiza y arranca sin errores de consola.");
    code = 0;
  } else {
    console.error(`✗ SMOKE FAIL — root children=${rootKids}, errores de consola=${errors.length}`);
    errors.slice(0, 6).forEach((e) => console.error("  · " + e));
    code = 1;
  }
} catch (e) {
  console.error("✗ SMOKE FAIL —", e.message);
} finally {
  srv.kill();
}
process.exit(code);
