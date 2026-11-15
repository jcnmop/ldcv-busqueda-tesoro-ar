/**
 * REGISTRO DE ESTACIONES
 * Único lugar donde se listan las estaciones activas. El orden aquí NO importa:
 * cada equipo recibe su propio orden (ver src/core/rutas.js).
 *
 * Para activar una estación nueva: importarla y agregarla al arreglo.
 * Para desactivar una (p. ej. su marcador se dañó el día del evento): comentarla.
 */
import { validarEstacion } from './contrato.js';
import vigaEquilibrio from './viga-equilibrio/index.js';
import secuenciaConstructiva from './secuencia-constructiva/index.js';
import aguaBarrio from './agua-barrio/index.js';
import ojoIngeniero from './ojo-ingeniero/index.js';
import presaHidrostatica from './presa-hidrostatica/index.js';
import concreto from './concreto/index.js';

const ESTACIONES = [
  vigaEquilibrio,
  secuenciaConstructiva,
  aguaBarrio,
  ojoIngeniero,
  presaHidrostatica,
  concreto,
];

// Validación al cargar: falla ruidosamente en desarrollo si algo no cumple el contrato.
for (const e of ESTACIONES) {
  const errores = validarEstacion(e);
  if (errores.length) {
    throw new Error(`Estación "${e?.id ?? '?'}" inválida:\n - ${errores.join('\n - ')}`);
  }
}
const ids = ESTACIONES.map((e) => e.id);
if (new Set(ids).size !== ids.length) throw new Error('Hay estaciones con id repetido');
const marcadores = ESTACIONES.map((e) => e.marcadorId);
if (new Set(marcadores).size !== marcadores.length) throw new Error('Hay estaciones con marcadorId repetido');

export const estaciones = ESTACIONES;
export const porId = Object.fromEntries(ESTACIONES.map((e) => [e.id, e]));
export const porMarcador = Object.fromEntries(ESTACIONES.map((e) => [e.marcadorId, e]));
