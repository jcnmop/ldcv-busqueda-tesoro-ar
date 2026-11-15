/**
 * REGISTRO DE ESTACIONES
 * Único lugar donde se listan las estaciones activas. El orden aquí NO importa:
 * cada equipo recibe su propio orden (ver src/core/rutas.js).
 *
 * Para activar una estación nueva: importarla y agregarla al arreglo.
 */
import { validarEstacion } from './contrato.js';
import plantilla from './_plantilla/index.js';

const ESTACIONES = [
  plantilla, // TODO: quitar cuando existan estaciones reales
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

export const estaciones = ESTACIONES;
export const porId = Object.fromEntries(ESTACIONES.map((e) => [e.id, e]));
export const porMarcador = Object.fromEntries(ESTACIONES.map((e) => [e.marcadorId, e]));
