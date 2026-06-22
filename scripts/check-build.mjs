#!/usr/bin/env node
/**
 * check-build.mjs — Hook PostToolUse: tras editar código del frontend, confirma
 * que Vite compila. Determinístico, barato (~cientos de ms). NO atrapa crashes de
 * runtime (para eso está scripts/smoke.mjs) pero sí errores de compilación/sintaxis.
 */
import { execSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let fp = "";
  try { fp = (JSON.parse(raw).tool_input || {}).file_path || ""; } catch { process.exit(0); }
  const relevant = /\.(jsx|tsx|js|ts|css)$/.test(fp) || /index\.html$|vite\.config/.test(fp);
  if (!relevant) process.exit(0);
  try {
    execSync("npx vite build", { stdio: "inherit" });
  } catch {
    process.stderr.write("vite build falló tras la edición. Corregí el error de compilación antes de seguir.\n");
    process.exit(2);
  }
  process.exit(0);
});
