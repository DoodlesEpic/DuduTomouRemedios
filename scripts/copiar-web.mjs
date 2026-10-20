// Copia os arquivos do web app para dist/, que é o que o Tauri empacota no aplicativo.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const ARQUIVOS = [
  "index.html",
  "styles.css",
  "main.js",
  "img",
  "manifest.json",
  "sw.js",
  "icon-192.png",
  "icon-512.png",
];

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const arq of ARQUIVOS) cpSync(arq, `dist/${arq}`, { recursive: true });
console.log(`dist/ pronto (${ARQUIVOS.length} itens)`);
