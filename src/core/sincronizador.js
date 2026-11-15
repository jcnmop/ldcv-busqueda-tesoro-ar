/**
 * SINCRONIZADOR
 * Envía el estado al backend cuando hay conexión. Si falla, reintenta con espera
 * creciente. El juego nunca espera por esto.
 */
import { resumen, marcarSincronizado } from './estado.js';

export function crearSincronizador(almacen, obtenerBackend) {
  let intento = 0;
  let temporizador = null;
  let enCurso = false;

  async function sincronizar() {
    if (enCurso) return;
    const estado = almacen.get();
    if (!estado.equipoId || estado.sincronizado) return;
    enCurso = true;
    try {
      const backend = await obtenerBackend();
      await backend.guardarResumen(resumen(estado));
      // Enviar completadas (idempotente en ambos backends)
      for (const c of estado.completadas) await backend.guardarCompletada(estado.equipoId, c);
      // Solo marcar si el estado no cambió mientras enviábamos
      if (almacen.get() === estado) almacen.set(marcarSincronizado(estado));
      intento = 0;
    } catch (err) {
      intento++;
      const espera = Math.min(30000, 1000 * 2 ** intento);
      console.warn(`[sync] fallo (${err?.message}); reintento en ${espera / 1000}s`);
      clearTimeout(temporizador);
      temporizador = setTimeout(sincronizar, espera);
    } finally {
      enCurso = false;
    }
  }

  // Disparadores: cambio de estado, volver a tener red, volver a la app.
  almacen.suscribir(() => sincronizar());
  globalThis.addEventListener?.('online', sincronizar);
  document?.addEventListener?.('visibilitychange', () => {
    if (document.visibilityState === 'visible') sincronizar();
  });

  return { sincronizar };
}
