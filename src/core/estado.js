/**
 * ESTADO DEL EQUIPO
 * Fuente de verdad en el celular. Se persiste en localStorage para sobrevivir
 * recargas, pérdida de señal y cierre del navegador. El backend solo recibe copias.
 *
 * Diseño: funciones puras sobre un objeto `estado` + un pequeño almacén con
 * suscripción. Así el núcleo se prueba sin navegador (ver tests/estado.test.js).
 */
import { rutaDeEquipo, siguienteEstacion, esSiguiente } from './rutas.js';

export const CLAVE_STORAGE = 'ldcv-tesoro-ar:estado:v1';

/**
 * @typedef {Object} Completada
 * @property {string} estacionId
 * @property {number} puntos
 * @property {number} inicioMs    cuando empezó el minijuego
 * @property {number} finMs       cuando terminó
 * @property {boolean} completado
 * @property {Object} [detalle]
 *
 * @typedef {Object} Estado
 * @property {string|null} equipoId        slug único del equipo (ej: "los-voladizos-3f2a")
 * @property {string|null} equipoNombre    nombre visible
 * @property {string[]}    ruta            ids de estaciones en el orden del equipo
 * @property {Completada[]} completadas
 * @property {number|null}  inicioPartidaMs
 * @property {number|null}  finPartidaMs
 * @property {boolean}      sincronizado   true si el backend tiene la última versión
 */

/** @returns {Estado} */
export function estadoInicial() {
  return {
    equipoId: null,
    equipoNombre: null,
    ruta: [],
    completadas: [],
    inicioPartidaMs: null,
    finPartidaMs: null,
    sincronizado: true,
  };
}

/** Convierte "Los Voladizos" -> "los-voladizos" */
export function slug(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Sufijo corto para evitar colisiones entre equipos con el mismo nombre. */
function sufijo(ahora = Date.now()) {
  return (ahora % 46656).toString(36).padStart(3, '0'); // 3 chars base36
}

/**
 * Crea el equipo y calcula su ruta.
 * @param {Estado} estado
 * @param {string} nombre
 * @param {string[]} idsEstaciones
 * @param {string} claveEvento
 * @param {number} [ahora]
 * @returns {Estado}
 */
export function crearEquipo(estado, nombre, idsEstaciones, claveEvento, ahora = Date.now()) {
  const limpio = nombre.trim();
  if (limpio.length < 2) throw new Error('El nombre del equipo debe tener al menos 2 caracteres');
  if (!idsEstaciones.length) throw new Error('No hay estaciones registradas');
  const equipoId = `${slug(limpio)}-${sufijo(ahora)}`;
  return {
    ...estadoInicial(),
    equipoId,
    equipoNombre: limpio,
    ruta: rutaDeEquipo(equipoId, idsEstaciones, claveEvento),
    inicioPartidaMs: ahora,
    sincronizado: false,
  };
}

export function estacionActual(estado) {
  return siguienteEstacion(estado.ruta, estado.completadas.map((c) => c.estacionId));
}

export function puedeJugar(estado, estacionId) {
  return esSiguiente(estado.ruta, estado.completadas.map((c) => c.estacionId), estacionId);
}

export function terminada(estado) {
  return estado.ruta.length > 0 && estado.completadas.length >= estado.ruta.length;
}

export function puntosTotales(estado) {
  return estado.completadas.reduce((s, c) => s + c.puntos, 0);
}

/**
 * Registra una estación completada. Rechaza estaciones fuera de orden.
 * @param {Estado} estado
 * @param {Completada} registro
 * @returns {Estado}
 */
export function completar(estado, registro) {
  if (!puedeJugar(estado, registro.estacionId)) {
    throw new Error(`La estación "${registro.estacionId}" no es la siguiente del equipo`);
  }
  if (registro.finMs < registro.inicioMs) throw new Error('finMs no puede ser menor que inicioMs');
  const completadas = [...estado.completadas, registro];
  const fin = completadas.length >= estado.ruta.length ? registro.finMs : null;
  return { ...estado, completadas, finPartidaMs: fin, sincronizado: false };
}

export function marcarSincronizado(estado) {
  return { ...estado, sincronizado: true };
}

/**
 * Snapshot plano para la tabla de posiciones y el backend.
 */
export function resumen(estado) {
  return {
    equipoId: estado.equipoId,
    equipoNombre: estado.equipoNombre,
    puntos: puntosTotales(estado),
    estacionesCompletadas: estado.completadas.length,
    totalEstaciones: estado.ruta.length,
    inicioPartidaMs: estado.inicioPartidaMs,
    finPartidaMs: estado.finPartidaMs,
    duracionMs: estado.finPartidaMs != null && estado.inicioPartidaMs != null
      ? estado.finPartidaMs - estado.inicioPartidaMs
      : null,
    actualizadoMs: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Almacén con persistencia (solo en navegador). Las funciones de arriba son puras.
// ---------------------------------------------------------------------------

export function crearAlmacen(storage = globalThis.localStorage) {
  let estado = cargar();
  const oyentes = new Set();

  function cargar() {
    try {
      const crudo = storage?.getItem(CLAVE_STORAGE);
      if (!crudo) return estadoInicial();
      const e = JSON.parse(crudo);
      return { ...estadoInicial(), ...e };
    } catch {
      return estadoInicial();
    }
  }

  function guardar() {
    try {
      storage?.setItem(CLAVE_STORAGE, JSON.stringify(estado));
    } catch {
      /* almacenamiento lleno o bloqueado: seguimos en memoria */
    }
  }

  return {
    get: () => estado,
    set(nuevo) {
      estado = nuevo;
      guardar();
      oyentes.forEach((fn) => fn(estado));
    },
    actualizar(fn) {
      this.set(fn(estado));
    },
    reiniciar() {
      this.set(estadoInicial());
    },
    suscribir(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
  };
}
