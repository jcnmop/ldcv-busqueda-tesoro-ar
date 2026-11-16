/**
 * ADAPTADOR DE BACKEND
 * Interfaz única que el juego usa para sincronizar. La implementación se elige con
 * VITE_BACKEND ("local" | "supabase"); si no es supabase y config.REGISTRO_SHEETS_URL tiene
 * valor, se usa "sheets" (local + registro privado en Google Sheets). El juego NUNCA depende del backend para
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
import { REGISTRO_SHEETS_URL } from '../../config.js';

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
  if (REGISTRO_SHEETS_URL) {
    const { crearBackendSheets } = await import('./sheets.js');
    instancia = crearBackendSheets({ url: REGISTRO_SHEETS_URL });
    return instancia;
  }
  instancia = crearBackendLocal();
  return instancia;
}
