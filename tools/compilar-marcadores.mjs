#!/usr/bin/env node
/**
 * Compila los PNG de public/marcadores/ a archivos .mind (formato de MindAR)
 * de forma automatizada, sin usar el compilador web manual.
 *
 *   npm run marcadores:compilar            # todos los PNG sin .mind o desactualizados
 *   npm run marcadores:compilar -- --todos # recompila todo
 *
 * Cómo funciona: el compilador de MindAR corre solo en navegador (usa TensorFlow.js),
 * así que este script (1) obtiene el paquete mind-ar con `npm pack` la primera vez,
 * (2) levanta un servidor estático local y (3) abre Chrome sin ventana con Playwright
 * para ejecutar el compilador y guardar el resultado.
 *
 * Requisitos: Node ≥ 20, Google Chrome instalado (o `npx playwright install chromium`).
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirMarcadores = resolve(raiz, 'public/marcadores');
const dirVendor = resolve(raiz, 'tools/.mindar');
const VERSION = '1.2.5';
const forzar = process.argv.includes('--todos');

// 1. Asegurar el compilador de MindAR (una sola vez; tools/.mindar está en .gitignore)
if (!existsSync(resolve(dirVendor, 'dist/mindar-image.prod.js'))) {
  console.log(`Descargando mind-ar@${VERSION} con npm pack…`);
  mkdirSync(dirVendor, { recursive: true });
  execSync(`npm pack mind-ar@${VERSION} --ignore-scripts --pack-destination "${dirVendor}"`, { stdio: 'ignore' });
  execSync(`tar -xzf "${resolve(dirVendor, `mind-ar-${VERSION}.tgz`)}" -C "${dirVendor}" --strip-components=1 package/dist`, { stdio: 'inherit' });
}

// 2. Lista de trabajo
const pngs = readdirSync(dirMarcadores).filter((f) => f.endsWith('.png'));
const pendientes = pngs.filter((f) => {
  const mind = resolve(dirMarcadores, f.replace(/\.png$/, '.mind'));
  return forzar || !existsSync(mind) || statSync(mind).mtimeMs < statSync(resolve(dirMarcadores, f)).mtimeMs;
});
if (!pendientes.length) {
  console.log('Todos los .mind están al día. Use --todos para recompilar.');
  process.exit(0);
}
console.log(`Por compilar: ${pendientes.join(', ')}`);

// 3. Servidor estático mínimo (sirve vendor + marcadores + la página del compilador)
const MIME = { '.js': 'text/javascript', '.png': 'image/png', '.html': 'text/html', '.wasm': 'application/wasm' };
const PAGINA = `<!DOCTYPE html><html><body><script type="module">
  import { Compiler } from '/vendor/dist/mindar-image.prod.js';
  window.compilar = async (url) => {
    const img = await new Promise((ok, err) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = err; i.src = url; });
    const c = new Compiler();
    await c.compileImageTargets([img], (p) => { window.progreso = p; });
    const buf = await c.exportData();
    return Array.from(new Uint8Array(buf));
  };
  window.listo = true;
</script></body></html>`;

const servidor = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let archivo = null;
  if (url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGINA); }
  if (url.startsWith('/vendor/')) archivo = resolve(dirVendor, '.' + url.slice('/vendor'.length));
  else if (url.startsWith('/marcadores/')) archivo = resolve(dirMarcadores, '.' + url.slice('/marcadores'.length));
  if (!archivo || !existsSync(archivo)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(archivo)] || 'application/octet-stream' });
  res.end(readFileSync(archivo));
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${servidor.address().port}`;

// 4. Chrome sin ventana
let playwright;
try { playwright = await import('playwright'); } catch {
  console.error('Falta playwright. Instale con: npm i -D playwright');
  process.exit(1);
}
let navegador;
try {
  navegador = await playwright.chromium.launch({ channel: 'chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
} catch {
  navegador = await playwright.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
}
const pagina = await navegador.newPage();
pagina.on('console', (m) => { if (m.type() === 'error') console.error('  [chrome]', m.text()); });
await pagina.goto(base + '/');
await pagina.waitForFunction(() => window.listo === true, null, { timeout: 60000 });

for (const png of pendientes) {
  const t0 = Date.now();
  process.stdout.write(`Compilando ${png}… `);
  const bytes = await pagina.evaluate((u) => window.compilar(u), `${base}/marcadores/${png}`);
  const destino = resolve(dirMarcadores, png.replace(/\.png$/, '.mind'));
  writeFileSync(destino, Buffer.from(bytes));
  console.log(`✓ ${(bytes.length / 1024).toFixed(0)} KB en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

await navegador.close();
servidor.close();
console.log('\nListo. Los .mind se versionan en git (son los que carga la app).');
