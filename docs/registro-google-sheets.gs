/**
 * RECEPTOR DE PARTIDAS · Búsqueda del Tesoro AR (LDCV-UCR)
 * Google Apps Script vinculado a una hoja de cálculo. Recibe lo que envía la app y lo
 * guarda en dos pestañas (se crean solas):
 *   - "Equipos":    una fila por equipo (se actualiza a medida que avanza)
 *   - "Estaciones": una fila por estación jugada por cada equipo (con el detalle de respuestas)
 *
 * Instalación: ver docs/REGISTRO.md (Extensiones → Apps Script → pegar → Implementar como
 * aplicación web con acceso "Cualquier usuario").
 */

const HOJAS = {
  Equipos: ['equipo_id', 'equipo', 'puntos', 'estaciones_completadas', 'total_estaciones',
    'inicio', 'fin', 'duracion_min', 'actualizado'],
  Estaciones: ['equipo_id', 'estacion', 'equipo', 'completado', 'puntos', 'inicio', 'fin', 'segundos', 'detalle'],
};

function hoja_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(nombre);
  if (!h) {
    h = ss.insertSheet(nombre);
    h.appendRow(HOJAS[nombre]);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight('bold');
  }
  return h;
}

/** Inserta o actualiza la fila cuyas primeras `nClave` columnas coinciden. */
function upsert_(h, fila, nClave) {
  const datos = h.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    let igual = true;
    for (let k = 0; k < nClave; k++) if (String(datos[i][k]) !== String(fila[k])) { igual = false; break; }
    if (igual) { h.getRange(i + 1, 1, 1, fila.length).setValues([fila]); return; }
  }
  h.appendRow(fila);
}

const fecha_ = (ms) => (ms ? new Date(Number(ms)) : '');

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.tipo === 'equipo') {
      upsert_(hoja_('Equipos'), [
        d.equipoId, d.equipoNombre, d.puntos, d.estacionesCompletadas, d.totalEstaciones,
        fecha_(d.inicioPartidaMs), fecha_(d.finPartidaMs),
        d.duracionMs ? Math.round(d.duracionMs / 600) / 100 : '', new Date(),
      ], 1);
    } else if (d.tipo === 'estacion') {
      upsert_(hoja_('Estaciones'), [
        d.equipoId, d.estacionId, d.equipoNombre || '', d.completado ? 'sí' : 'no', d.puntos,
        fecha_(d.inicioMs), fecha_(d.finMs), Math.round((d.finMs - d.inicioMs) / 1000),
        JSON.stringify(d.detalle || {}),
      ], 2);
    }
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

/** Para comprobar en el navegador que la implementación responde. */
function doGet() {
  return ContentService.createTextOutput('Receptor de la Búsqueda del Tesoro AR (LDCV) activo.');
}
