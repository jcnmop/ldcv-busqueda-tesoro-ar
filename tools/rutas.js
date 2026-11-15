#!/usr/bin/env node
/**
 * Imprime la ruta que recibiría cada equipo, para que el organizador la conozca de
 * antemano (y pueda verificar en la mesa si un equipo "se saltó" una estación).
 *
 *   npm run rutas -- "Los Voladizos" "Las Zapatas" "Momento Flector"
 *   CLAVE_EVENTO=mi-clave npm run rutas -- equipo1 equipo2
 *
 * IMPORTANTE: el id real del equipo lleva un sufijo que depende del instante del
 * registro, así que la ruta exacta solo se conoce cuando el equipo se registra.
 * Este script muestra la DISTRIBUCIÓN de rutas (cuántos equipos empiezan en cada
 * estación) para N equipos simulados, que es lo útil para planificar filas.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { rutaDeEquipo } = await import(resolve(raiz, 'src/core/rutas.js'));
const { estaciones } = await import(resolve(raiz, 'src/stations/registro.js'));
const { slug } = await import(resolve(raiz, 'src/core/estado.js'));

const clave = process.env.CLAVE_EVENTO || 'desarrollo';
const ids = estaciones.map((e) => e.id);
const nombres = process.argv.slice(2);

console.log(`Estaciones activas (${ids.length}): ${ids.join(', ')}`);
console.log(`Clave del evento: ${clave}\n`);

if (nombres.length) {
  for (const n of nombres) {
    // Simular 5 sufijos posibles para mostrar que la ruta varía con el instante de registro
    const muestras = ['000', '7k2', 'a1b', 'zz9', '3m4'].map((s) => rutaDeEquipo(`${slug(n)}-${s}`, ids, clave).join(' → '));
    console.log(`${n}:`);
    muestras.forEach((m) => console.log(`   ${m}`));
  }
} else {
  const N = 40;
  const inicio = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let i = 0; i < N; i++) inicio[rutaDeEquipo(`equipo-${i}-x${i % 7}`, ids, clave)[0]]++;
  console.log(`Distribución de la PRIMERA estación para ${N} equipos simulados:`);
  for (const id of ids) console.log(`   ${id.padEnd(28)} ${'█'.repeat(inicio[id])} ${inicio[id]}`);
  console.log('\nPase nombres de equipo como argumentos para ver rutas de ejemplo.');
}
