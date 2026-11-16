/**
 * Backend GOOGLE SHEETS: registro PRIVADO de partidas para el organizador.
 *
 * Guarda todo en el backend local (la app y el tablero del propio celular siguen igual) y
 * además ENVÍA cada equipo y cada estación jugada a un Google Apps Script que los escribe en
 * una hoja de cálculo (ver docs/REGISTRO.md y docs/registro-google-sheets.gs).
 * Los estudiantes no ven esa hoja: solo el organizador.
 *
 * Detalle técnico: Apps Script no responde CORS, así que se envía con mode 'no-cors' y
 * Content-Type text/plain (sin preflight). No se puede leer la respuesta: si fetch no lanza
 * error de red, se da por enviado. El receptor hace upsert, así que reenviar no duplica.
 */
import { crearBackendLocal } from './local.js';

export function crearBackendSheets({ url, fetchFn = globalThis.fetch?.bind(globalThis), storage } = {}) {
  if (!url) throw new Error('Falta la URL del receptor de Google Sheets');
  const local = crearBackendLocal(storage);
  const nombres = {}; // equipoId → nombre (para que cada fila de estación lleve el nombre)

  async function enviar(datos) {
    await fetchFn(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(datos),
    });
  }

  return {
    nombre: 'sheets',
    async guardarResumen(resumen) {
      nombres[resumen.equipoId] = resumen.equipoNombre;
      await local.guardarResumen(resumen);
      await enviar({ tipo: 'equipo', ...resumen });
    },
    async guardarCompletada(equipoId, c) {
      await local.guardarCompletada(equipoId, c);
      await enviar({ tipo: 'estacion', equipoId, equipoNombre: nombres[equipoId] ?? '', ...c });
    },
    listarTabla: () => local.listarTabla(),
    suscribirTabla: (cb) => local.suscribirTabla(cb),
  };
}
