#!/usr/bin/env node
/**
 * PRUEBA DE PUNTA A PUNTA (no corre con `npm test`; es más pesada).
 *
 *   npm run e2e
 *
 * Qué verifica, en Chrome sin ventana y con una CÁMARA FALSA que muestra el marcador:
 *   1. Registro de equipo → pantalla de pista.
 *   2. Escaneo: MindAR reconoce el marcador real (.mind compilado) → botón Jugar.
 *   3. Minijuego de cada estación se resuelve → puntaje → siguiente pista.
 *   4. Pantalla final y tablero con el equipo.
 *
 * Requisitos: `npm run build` previo (lo hace el script), ffmpeg, Google Chrome,
 * playwright (devDependency) y tools/.mindar (lo crea compilar-marcadores.mjs).
 * Las librerías de CDN se sirven desde copias locales para que la prueba no dependa
 * de internet (ver obtenerVendor()).
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = resolve(raiz, 'tools/.e2e');
mkdirSync(tmp, { recursive: true });

const { estaciones } = await import(resolve(raiz, 'src/stations/registro.js'));
const { crearEquipo, estadoInicial, CLAVE_STORAGE } = await import(resolve(raiz, 'src/core/estado.js'));
const vigaLogica = await import(resolve(raiz, 'src/stations/viga-equilibrio/logica.js'));
const secLogica = await import(resolve(raiz, 'src/stations/secuencia-constructiva/logica.js'));

const ok = (cond, msg) => { if (!cond) { console.error('✗', msg); process.exit(1); } console.log('✓', msg); };

// ---------- 0. Build y vendor ----------
console.log('Construyendo dist/…');
execSync('npx vite build --logLevel error', { cwd: raiz, stdio: 'inherit' });

function obtenerVendor() {
  const vendor = resolve(raiz, 'tools/.vendor');
  if (!existsSync(resolve(vendor, 'three/build/three.module.js'))) {
    mkdirSync(resolve(vendor, 'three'), { recursive: true });
    execSync(`npm pack three@0.160.0 --ignore-scripts --pack-destination "${vendor}"`, { stdio: 'ignore' });
    execSync(`tar -xzf "${resolve(vendor, 'three-0.160.0.tgz')}" -C "${resolve(vendor, 'three')}" --strip-components=1 package/build package/examples/jsm`, { stdio: 'inherit' });
  }
  const mindar = resolve(raiz, 'tools/.mindar/dist');
  if (!existsSync(mindar)) { console.error('Falta tools/.mindar. Corra primero: npm run marcadores:compilar'); process.exit(1); }
  return { three: resolve(vendor, 'three'), mindar };
}
const vendor = obtenerVendor();

// ---------- 1. Servidor estático de dist/ ----------
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.mind': 'application/octet-stream', '.svg': 'image/svg+xml' };
const dist = resolve(raiz, 'dist');
const servidor = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';
  const archivo = resolve(dist, '.' + url);
  if (!existsSync(archivo)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(archivo)] || 'application/octet-stream' });
  res.end(readFileSync(archivo));
});
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${servidor.address().port}`;

// ---------- 2. Equipo de prueba con ruta conocida ----------
const claveEvento = 'desarrollo';
const estadoSemilla = crearEquipo(estadoInicial(), 'Prueba E2E', estaciones.map((e) => e.id), claveEvento, 1700000000000);
const porId = Object.fromEntries(estaciones.map((e) => [e.id, e]));
console.log('Ruta del equipo de prueba:', estadoSemilla.ruta.join(' → '));

// ---------- 3. Video de cámara falsa por marcador ----------
function videoDeMarcador(marcadorId) {
  const salida = resolve(tmp, `${marcadorId}.y4m`);
  if (!existsSync(salida)) {
    const png = resolve(raiz, 'public/marcadores', `${marcadorId}.png`);
    // Marcador a ~60 % del alto del cuadro, ligeramente rotado, sobre fondo gris: simula una foto real.
    execSync(`ffmpeg -y -loglevel error -loop 1 -i "${png}" -t 4 -r 15 -vf "scale=300:300,rotate=0.06:fillcolor=gray,pad=640:480:(ow-iw)/2:(oh-ih)/2:gray,format=yuv420p" "${salida}"`);
  }
  return salida;
}

const { chromium } = await import('playwright');
async function abrirNavegador(video) {
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${video}`, '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  let nav;
  try { nav = await chromium.launch({ channel: 'chrome', args }); } catch { nav = await chromium.launch({ args }); }
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['camera'] });
  // Redirigir CDN → copias locales
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)/, (route) => {
    const rel = route.request().url().match(/three@[^/]+\/(.*)$/)[1].replace(/^examples\/jsm\//, 'examples/jsm/');
    route.fulfill({ path: resolve(vendor.three, rel), contentType: 'text/javascript' });
  });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/mind-ar@[^/]+\/dist\/(.*)/, (route) => {
    const rel = route.request().url().match(/dist\/(.*)$/)[1];
    route.fulfill({ path: resolve(vendor.mindar, rel), contentType: 'text/javascript' });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('  [pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('  [console]', m.text()); });
  return { nav, ctx, page };
}

// ---------- 4a. Pantalla de registro (sin cámara) ----------
{
  const { nav, page } = await abrirNavegador(videoDeMarcador(estadoSemilla.ruta[0]));
  await page.goto(base + '/');
  await page.fill('#nombre', 'Los Voladizos');
  await page.click('#empezar');
  await page.waitForSelector('#escanear');
  ok((await page.textContent('h1')).includes('Estación 1'), 'Registro → pantalla de pista');
  const guardado = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), CLAVE_STORAGE);
  ok(guardado.equipoId.startsWith('los-voladizos-'), 'Estado persistido en localStorage');
  await nav.close();
}

// ---------- 4b. Recorrido completo, una estación por lanzamiento (la cámara falsa es fija) ----------
let estadoActual = estadoSemilla;
for (let i = 0; i < estadoSemilla.ruta.length; i++) {
  const id = estadoSemilla.ruta[i];
  const est = porId[id];
  const { nav, page } = await abrirNavegador(videoDeMarcador(est.marcadorId));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLAVE_STORAGE, JSON.stringify(estadoActual)]);
  await page.goto(base + '/');
  await page.waitForSelector('#escanear');
  await page.click('#escanear');

  const t0 = Date.now();
  await page.waitForSelector('#jugar:not([hidden])', { timeout: 90000 });
  ok(true, `${est.nombre}: MindAR reconoció el marcador en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // Esperar a que los modelos .glb (si hay) terminen de cargar
  await page.waitForFunction(() => {
    const e = globalThis.__escenaRA; if (!e) return false;
    let pendiente = false;
    e.ancla.group.traverse((o) => { if (o.userData?.listo && !o.userData.__ok) { pendiente = true; o.userData.listo.then(() => { o.userData.__ok = true; }); } });
    return !pendiente;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(1200); // dejar que el objeto se asiente y corra la animación de entrada
  await page.screenshot({ path: resolve(tmp, `ar-${id}.png`) });

  const animaciones = await page.evaluate(() => {
    const n = []; globalThis.__escenaRA.ancla.group.traverse((o) => { if (o.userData?.animaciones?.length) n.push(...o.userData.animaciones); }); return n;
  });
  if (id === 'ojo-ingeniero') ok(animaciones.includes('Wave') && animaciones.includes('Jump'), `Robot animado cargado (${animaciones.length} animaciones)`);

  // TOCAR EL OBJETO 3D: proyectar el centro de su caja envolvente a coordenadas de pantalla
  const punto = await page.evaluate(() => {
    const { THREE, camera, renderer, ancla } = globalThis.__escenaRA;
    const centro = new THREE.Box3().setFromObject(ancla.group).getCenter(new THREE.Vector3());
    const v = centro.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  });
  console.log('  punto de toque:', punto.map(Math.round).join(','), await page.evaluate(([x, y]) => {
    const { THREE, camera, renderer, ancla, estaVisible } = globalThis.__escenaRA;
    const r = renderer.domElement.getBoundingClientRect();
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
    const el = document.elementFromPoint(x, y);
    return JSON.stringify({ hits: rc.intersectObject(ancla.group, true).length, visible: estaVisible(), el: el?.tagName + '.' + el?.className, canvas: [r.left, r.top, r.width, r.height].map(Math.round) });
  }, punto));
  await page.screenshot({ path: resolve(tmp, `toque-${id}.png`) });
  await page.mouse.click(punto[0], punto[1]);
  await page.waitForSelector('#minijuego:not([hidden])', { timeout: 6000 });
  ok(true, `${est.nombre}: tocar el objeto 3D abre el reto`);
  await page.screenshot({ path: resolve(tmp, `minijuego-${id}.png`) });
  await page.waitForSelector('#minijuego:not([hidden])');

  if (id === 'viga-equilibrio') {
    const texto = await page.textContent('#minijuego');
    const L = +texto.match(/viga de\s*([\d.]+)\s*m/)[1];
    const P1 = +texto.match(/P₁\s*=\s*([\d.]+)/)[1];
    const x1 = +texto.match(/a\s*([\d.]+)\s*m\s*de A/)[1];
    const P2 = +texto.match(/P₂\s*=\s*([\d.]+)/)[1];
    const objetivo = vigaLogica.posicionObjetivo({ L, P1, x1, P2 });
    // Primer intento deliberadamente malo para probar la retroalimentación
    await page.evaluate(() => { const s = document.querySelector('#x2'); s.value = s.min; s.dispatchEvent(new Event('input')); });
    await page.click('#verificar');
    ok((await page.textContent('#feedback')).includes('inclina'), 'Viga: retroalimentación de inclinación');
    await page.evaluate((v) => { const s = document.querySelector('#x2'); s.value = v; s.dispatchEvent(new Event('input')); }, objetivo.toFixed(2));
    await page.click('#verificar');
  } else if (id === 'secuencia-constructiva') {
    const items = await page.$$eval('#lista li span:last-child', (els) => els.map((e) => e.textContent));
    const banco = secLogica.BANCOS.find((b) => b.pasos.length === items.length && b.pasos.every((p) => items.includes(p)));
    ok(!!banco, 'Secuencia: banco identificado');
    // Ordenar por selección: para cada posición, tocar el ítem correcto y luego la posición
    for (let pos = 0; pos < banco.pasos.length; pos++) {
      const actual = await page.$$eval('#lista li span:last-child', (els) => els.map((e) => e.textContent));
      const desde = actual.indexOf(banco.pasos[pos]);
      if (desde === pos) continue;
      await page.click(`#lista li[data-i="${desde}"]`);
      await page.click(`#lista li[data-i="${pos}"]`);
    }
    await page.click('#verificar');
  } else if (id === 'clash-bim') {
    // Leer el rango de la viga y los topes de cada elemento del propio SVG, como lo haría un jugador atento
    const vigaTxt = await page.textContent('#planta text');
    const vigaZMin = +vigaTxt.match(/VIGA\s*([\d.]+)/)[1];
    const elementos = await page.$$eval('#planta g[data-id]', (gs) => gs.map((g) => ({ id: g.dataset.id, txt: g.querySelector('text').textContent })));
    const culpable = elementos.find((e) => +e.txt.split('–')[1] > vigaZMin);
    ok(!!culpable, 'Clash: culpable identificado por cotas');
    // Primer toque deliberadamente malo para probar la retroalimentación
    const malo = elementos.find((e) => e.id !== culpable.id);
    await page.click(`#planta g[data-id="${malo.id}"] rect:nth-of-type(2)`);
    ok((await page.textContent('#feedback')).includes('por debajo'), 'Clash: retroalimentación del intento fallido');
    await page.click(`#planta g[data-id="${culpable.id}"] rect:nth-of-type(2)`);
  } else if (id === 'ojo-ingeniero') {
    await page.click('#responder');
  } else {
    await page.click('#resolver'); // plantilla u otras estaciones triviales
  }

  await page.waitForSelector('#seguir', { timeout: 10000 });
  const h1 = await page.textContent('h1');
  // Ojo de Ingeniero depende de la estimación a ciegas de la prueba: puede no superarse
  ok(h1.includes('completada') || (id === 'ojo-ingeniero' && h1.includes('no superado')), `${est.nombre}: minijuego resuelto → pantalla de resultado`);
  const pts = +(await page.textContent('.tarjeta p')).match(/\+(\d+)/)[1];
  // Ojo de Ingeniero puntúa por error de estimación: la prueba responde a ciegas y puede sacar 0 legítimamente
  ok(id === 'ojo-ingeniero' ? pts >= 0 : pts > 0, `${est.nombre}: +${pts} pts`);
  await page.waitForSelector('#puente canvas', { timeout: 15000 });
  ok(true, `${est.nombre}: pieza del puente mostrada`);
  if (i === 1) { await page.waitForTimeout(1200); await page.screenshot({ path: resolve(tmp, 'resultado-puente.png') }); }
  await page.click('#seguir');
  await page.waitForTimeout(300);
  estadoActual = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), CLAVE_STORAGE);
  await nav.close();
}

// ---------- 4c. Final y tablero ----------
{
  const { nav, page } = await abrirNavegador(videoDeMarcador(estadoSemilla.ruta[0]));
  // Cada lanzamiento tiene su propio localStorage: forzar que sincronice aquí para poblar el tablero local
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLAVE_STORAGE, JSON.stringify({ ...estadoActual, sincronizado: false })]);
  await page.goto(base + '/');
  await page.waitForSelector('#detalle');
  ok(/completo|terminado/.test(await page.textContent('h1')), 'Pantalla final');
  await page.waitForSelector('#puente canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);
  ok(true, 'Puente 3D dibujado en la pantalla final');
  await page.screenshot({ path: resolve(tmp, 'final-puente.png'), fullPage: true });
  await page.waitForFunction(() => /enviado/.test(document.querySelector('#sync')?.textContent || ''), null, { timeout: 5000 });
  ok(true, 'Sincronizado con backend local');
  await page.goto(base + '/tablero.html');
  await page.waitForSelector('table');
  ok((await page.textContent('table')).includes('Prueba E2E'), 'Tablero muestra al equipo');
  await page.screenshot({ path: resolve(tmp, 'tablero.png') });
  await nav.close();
}

servidor.close();
console.log('\nTODO OK. Captura del tablero en tools/.e2e/tablero.png');
