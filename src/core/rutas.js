/**
 * RUTAS POR EQUIPO (antitrampa de secuencia)
 *
 * Problema: si todos los equipos visitan las estaciones en el mismo orden, se
 * forman filas y una foto del marcador compartida por WhatsApp sirve a todos.
 *
 * Solución: cada equipo recibe una permutación distinta y determinista de las
 * estaciones, derivada de su id. La app solo acepta la estación que le toca
 * AHORA al equipo; cualquier otra muestra "esta no es tu siguiente estación".
 *
 * Determinista = sin backend el celular siempre calcula la misma ruta, y el
 * organizador puede imprimir las rutas de antemano con tools/rutas.js.
 */

/** Hash simple y estable (FNV-1a de 32 bits). Suficiente para barajar. */
export function hash32(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio determinista (mulberry32). */
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

/**
 * Devuelve el orden de estaciones para un equipo.
 * @param {string}   equipoId
 * @param {string[]} idsEstaciones  ids de todas las estaciones activas
 * @param {string}   [claveEvento]  cambia todas las rutas sin tocar los equipos
 * @returns {string[]} permutación de idsEstaciones
 */
export function rutaDeEquipo(equipoId, idsEstaciones, claveEvento = '') {
  const orden = [...idsEstaciones].sort(); // base estable, independiente del registro
  const r = rng(hash32(`${claveEvento}|${equipoId}`));
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden;
}

/**
 * Indica si `estacionId` es la que le toca al equipo según su progreso.
 * @param {string[]} ruta
 * @param {string[]} completadas  ids ya completadas por el equipo (en orden)
 * @param {string}   estacionId
 */
export function esSiguiente(ruta, completadas, estacionId) {
  return ruta[completadas.length] === estacionId;
}

export function siguienteEstacion(ruta, completadas) {
  return ruta[completadas.length] ?? null;
}
