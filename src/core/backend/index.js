/**
 * ADAPTADOR DE BACKEND
 * Interfaz única que el juego usa para sincronizar. La implementación se elige con
 * VITE_BACKEND ("local" | "supabase"). El juego NUNCA depende del backend para
 * funcionar: si falla, se reintenta más tarde (cola en src/core/sincronizador.js).
 *
 * Interfaz:
 *   guardarResumen(resumen)             -> Promise<void>   upsert del equipo
 *   guardarCompletada(equipoId, c)      -> Promise<void>   inserta una estación completada
 *   listarTabla()                       -> Promise<Resumen[]>  para la tabla de posiciones
 *   suscribirTabla(cb)                  -> () => void       cb(Resumen[]) al cambiar (opcional)
 *   nombre                              -> string
 */
import { crearBackendLocal } from './local.js';

let instancia = null;

export async function obtenerBackend() {
  if (instancia) return instancia;
  const tipo = import.meta.env?.VITE_BACKEND || 'local';

  if (tipo === 'supabase') {
    try {
      const { crearBackendSupabase } = await import('./supabase.js');
      instancia = await crearBackendSupabase({
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      });
      return instancia;
    } catch (err) {
      console.warn('[backend] Supabase no disponible, usando local:', err?.message);
    }
  }
  instancia = crearBackendLocal();
  return instancia;
}
