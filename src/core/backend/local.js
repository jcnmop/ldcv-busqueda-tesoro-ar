/**
 * Backend LOCAL: guarda en localStorage del mismo dispositivo.
 * Sirve para desarrollo, para pruebas sin conexión y como respaldo.
 * Limitación obvia: la tabla de posiciones solo ve los equipos de ESTE celular.
 * Para un evento real con tabla en vivo se necesita el backend supabase.
 */
const CLAVE_TABLA = 'ldcv-tesoro-ar:tabla:v1';
const CLAVE_COMPLETADAS = 'ldcv-tesoro-ar:completadas:v1';

export function crearBackendLocal(storage = globalThis.localStorage) {
  const leer = (k) => {
    try { return JSON.parse(storage?.getItem(k) || '{}'); } catch { return {}; }
  };
  const escribir = (k, v) => {
    try { storage?.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ }
  };
  const oyentes = new Set();
  const avisar = () => listarTabla().then((t) => oyentes.forEach((cb) => cb(t)));

  async function guardarResumen(resumen) {
    const tabla = leer(CLAVE_TABLA);
    tabla[resumen.equipoId] = resumen;
    escribir(CLAVE_TABLA, tabla);
    avisar();
  }

  async function guardarCompletada(equipoId, completada) {
    const todas = leer(CLAVE_COMPLETADAS);
    todas[equipoId] = todas[equipoId] || [];
    if (!todas[equipoId].some((c) => c.estacionId === completada.estacionId)) {
      todas[equipoId].push(completada);
    }
    escribir(CLAVE_COMPLETADAS, todas);
  }

  async function listarTabla() {
    return ordenarTabla(Object.values(leer(CLAVE_TABLA)));
  }

  function suscribirTabla(cb) {
    oyentes.add(cb);
    // Otros tabs del mismo navegador (útil para probar el tablero junto al juego)
    const onStorage = (e) => { if (e.key === CLAVE_TABLA) avisar(); };
    globalThis.addEventListener?.('storage', onStorage);
    listarTabla().then(cb);
    return () => {
      oyentes.delete(cb);
      globalThis.removeEventListener?.('storage', onStorage);
    };
  }

  return { nombre: 'local', guardarResumen, guardarCompletada, listarTabla, suscribirTabla };
}

/**
 * Orden oficial de la tabla: más puntos primero; a igual puntaje, más estaciones;
 * a igual estaciones, menor duración (si terminó), si no, el que lleva más tiempo jugando.
 */
export function ordenarTabla(filas) {
  return [...filas].sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.estacionesCompletadas !== a.estacionesCompletadas) return b.estacionesCompletadas - a.estacionesCompletadas;
    const da = a.duracionMs ?? Infinity;
    const db = b.duracionMs ?? Infinity;
    return da - db;
  });
}
