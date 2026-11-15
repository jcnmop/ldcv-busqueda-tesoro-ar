/**
 * Backend SUPABASE. Misma interfaz que local.js.
 *
 * Usa la API REST de Supabase directamente con fetch (sin SDK) para no agregar
 * dependencias. La suscripción en vivo se hace por sondeo cada 5 s, suficiente
 * para una tabla proyectada en el evento.
 *
 * Esquema SQL requerido: ver docs/SUPABASE.md (incluye políticas RLS).
 */
import { ordenarTabla } from './local.js';

export async function crearBackendSupabase({ url, anonKey }) {
  if (!url || !anonKey) throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  const base = `${url.replace(/\/$/, '')}/rest/v1`;
  const cab = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  };

  async function pedir(ruta, opciones = {}) {
    const r = await fetch(`${base}/${ruta}`, { ...opciones, headers: { ...cab, ...(opciones.headers || {}) } });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  }

  async function guardarResumen(resumen) {
    await pedir('equipos?on_conflict=equipo_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        equipo_id: resumen.equipoId,
        nombre: resumen.equipoNombre,
        puntos: resumen.puntos,
        estaciones_completadas: resumen.estacionesCompletadas,
        total_estaciones: resumen.totalEstaciones,
        inicio_ms: resumen.inicioPartidaMs,
        fin_ms: resumen.finPartidaMs,
        duracion_ms: resumen.duracionMs,
        actualizado_ms: resumen.actualizadoMs,
      }),
    });
  }

  async function guardarCompletada(equipoId, c) {
    await pedir('completadas?on_conflict=equipo_id,estacion_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({
        equipo_id: equipoId,
        estacion_id: c.estacionId,
        puntos: c.puntos,
        inicio_ms: c.inicioMs,
        fin_ms: c.finMs,
        completado: c.completado,
        detalle: c.detalle ?? null,
      }),
    });
  }

  async function listarTabla() {
    const filas = await pedir('equipos?select=*');
    return ordenarTabla(filas.map((f) => ({
      equipoId: f.equipo_id,
      equipoNombre: f.nombre,
      puntos: f.puntos,
      estacionesCompletadas: f.estaciones_completadas,
      totalEstaciones: f.total_estaciones,
      inicioPartidaMs: f.inicio_ms,
      finPartidaMs: f.fin_ms,
      duracionMs: f.duracion_ms,
      actualizadoMs: f.actualizado_ms,
    })));
  }

  function suscribirTabla(cb, cadaMs = 5000) {
    let activo = true;
    const tick = async () => {
      if (!activo) return;
      try { cb(await listarTabla()); } catch (e) { console.warn('[supabase] tabla:', e.message); }
      if (activo) setTimeout(tick, cadaMs);
    };
    tick();
    return () => { activo = false; };
  }

  // Prueba de conexión temprana para caer a local si las credenciales están mal.
  await pedir('equipos?select=equipo_id&limit=1');

  return { nombre: 'supabase', guardarResumen, guardarCompletada, listarTabla, suscribirTabla };
}
