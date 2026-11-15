#!/usr/bin/env node
/**
 * Genera las IMÁGENES de marcador (SVG) para cada estación del registro, listas
 * para imprimir y para compilar a .mind (ver tools/compilar-marcadores.mjs).
 *
 *   npm run marcadores
 *
 * Diseño pensado para image tracking: muchas esquinas y bordes de alto contraste,
 * distribución irregular (sin patrones repetidos), borde grueso y el nombre de la
 * estación en texto grande. Cada marcador es distinto y determinista (depende del id).
 *
 * Salida: public/marcadores/<marcadorId>.svg  (+ .png si hay Python con Pillow o
 * ImageMagick disponibles; el PNG es el que se compila a .mind)
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const salida = resolve(raiz, 'public/marcadores');
mkdirSync(salida, { recursive: true });

// Reusar el hash y el RNG del núcleo para que los marcadores sean deterministas
const { hash32 } = await import(resolve(raiz, 'src/core/rutas.js'));
function rng(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Las estaciones usan `import.meta.env` y DOM solo dentro de funciones, así que
// importarlas en Node es seguro. Definimos un env mínimo por si acaso.
globalThis.document ??= undefined;
const { estaciones } = await import(resolve(raiz, 'src/stations/registro.js'));

const W = 1000, H = 1000, M = 60; // tamaño y margen
const PALETA = ['#0b1f3a', '#f2a900', '#d0453c', '#2e9e5b', '#1e88e5', '#111111'];

function marcadorSVG(est) {
  const r = rng(hash32(`marcador|${est.marcadorId}`));
  const el = (n, attrs) => `<${n} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`;
  const formas = [];

  // Fondo blanco + marco grueso oscuro (ayuda al recorte al imprimir y al contraste)
  formas.push(el('rect', { x: 0, y: 0, width: W, height: H, fill: '#ffffff' }));
  formas.push(el('rect', { x: M / 2, y: M / 2, width: W - M, height: H - M, fill: 'none', stroke: '#0b1f3a', 'stroke-width': 24 }));

  // Rejilla irregular de formas: triángulos, rectángulos rotados, círculos, "L"
  const celdas = 6;
  const paso = (W - 2 * M - 60) / celdas;
  for (let i = 0; i < celdas; i++) {
    for (let j = 0; j < celdas; j++) {
      if (j >= 4 && i >= 1 && i <= 4) continue; // dejar espacio para el texto abajo
      if (r() < 0.18) continue; // huecos irregulares
      const cx = M + 30 + paso * (i + 0.5) + (r() - 0.5) * paso * 0.4;
      const cy = M + 30 + paso * (j + 0.5) + (r() - 0.5) * paso * 0.4;
      const s = paso * (0.35 + r() * 0.45);
      const color = PALETA[Math.floor(r() * PALETA.length)];
      const rot = Math.floor(r() * 360);
      const tipo = r();
      if (tipo < 0.3) {
        formas.push(el('rect', { x: cx - s / 2, y: cy - s / 2, width: s, height: s * (0.4 + r() * 0.8), fill: color, transform: `rotate(${rot} ${cx} ${cy})` }));
      } else if (tipo < 0.55) {
        const p = [[cx, cy - s / 2], [cx + s / 2, cy + s / 2], [cx - s / 2, cy + s / 2]].map((q) => q.join(',')).join(' ');
        formas.push(el('polygon', { points: p, fill: color, transform: `rotate(${rot} ${cx} ${cy})` }));
      } else if (tipo < 0.75) {
        formas.push(el('circle', { cx, cy, r: s / 2.4, fill: color }));
        if (r() < 0.5) formas.push(el('circle', { cx, cy, r: s / 6, fill: '#ffffff' }));
      } else {
        // forma en L
        const g = s / 3;
        formas.push(el('path', { d: `M${cx - s / 2},${cy - s / 2} h${g} v${s - g} h${s - g} v${g} h${-s} z`, fill: color, transform: `rotate(${rot} ${cx} ${cy})` }));
      }
    }
  }

  // Bloque de texto: nombre de la estación + LDCV
  const nombre = est.nombre.toUpperCase();
  const tam = nombre.length > 18 ? 54 : 68;
  formas.push(el('rect', { x: M + 30, y: H - M - 250, width: W - 2 * M - 60, height: 190, fill: '#0b1f3a' }));
  formas.push(`<text x="${W / 2}" y="${H - M - 150}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${tam}" fill="#ffffff">${nombre}</text>`);
  formas.push(`<text x="${W / 2}" y="${H - M - 85}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#f2a900">BÚSQUEDA DEL TESORO AR · LDCV-UCR</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${formas.join('\n')}\n</svg>\n`;
}

function svgAPng(svgPath, pngPath) {
  // Intento 1: rsvg-convert, Intento 2: ImageMagick, Intento 3: Python + cairosvg
  const intentos = [
    `rsvg-convert -w ${W} -h ${H} "${svgPath}" -o "${pngPath}"`,
    `convert -density 96 "${svgPath}" "${pngPath}"`,
    `python3 -c "import cairosvg; cairosvg.svg2png(url='${svgPath}', write_to='${pngPath}', output_width=${W}, output_height=${H})"`,
  ];
  for (const cmd of intentos) {
    try { execSync(cmd, { stdio: 'ignore' }); if (existsSync(pngPath)) return true; } catch { /* siguiente */ }
  }
  return false;
}

let pngs = 0;
for (const est of estaciones) {
  const svgPath = resolve(salida, `${est.marcadorId}.svg`);
  writeFileSync(svgPath, marcadorSVG(est));
  const pngPath = resolve(salida, `${est.marcadorId}.png`);
  if (svgAPng(svgPath, pngPath)) pngs++;
  console.log(`✓ ${est.marcadorId}.svg${existsSync(pngPath) ? ' + .png' : ''}`);
}
if (pngs < estaciones.length) {
  console.log('\nAviso: no se pudo convertir a PNG en esta máquina. Abra el .svg en el navegador o en');
  console.log('Inkscape y expórtelo a PNG de 1000×1000 antes de compilar el .mind.');
}
console.log(`\nSiguiente paso: node tools/compilar-marcadores.mjs  (genera los .mind)`);
