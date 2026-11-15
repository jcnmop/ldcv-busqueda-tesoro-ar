#!/usr/bin/env node
/**
 * Genera el QR de inicio (SVG y PNG, listos para imprimir en el cartel de la mesa del LDCV).
 *
 *   npm run qr -- https://usuario.github.io/ldcv-busqueda-tesoro-ar/
 *
 * Salida: public/qr-inicio.svg y public/qr-inicio.png
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const url = process.argv[2];
if (!url) { console.error('Uso: npm run qr -- <URL de la app>'); process.exit(1); }

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const opciones = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#0b1f3a', light: '#ffffff' } };

const svgQR = await QRCode.toString(url, { ...opciones, type: 'svg', width: 600 });
// Agregar leyenda debajo
const svg = svgQR
  .replace(/<svg([^>]*)viewBox="0 0 (\d+) (\d+)"/, (m, a, w, h) => `<svg${a}viewBox="0 0 ${w} ${+h + 6}"`)
  .replace('</svg>', `<text x="50%" y="${100}%" dy="-1.2" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="3" fill="#0b1f3a">ESCANEE PARA EMPEZAR</text></svg>`);
writeFileSync(resolve(dir, 'qr-inicio.svg'), svg);
await QRCode.toFile(resolve(dir, 'qr-inicio.png'), url, { ...opciones, width: 1200 });
console.log(`QR generado para ${url}\n→ public/qr-inicio.svg y public/qr-inicio.png`);
