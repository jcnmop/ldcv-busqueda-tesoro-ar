import { h, formatearMs } from '../core/router.js';
import { puntosTotales, terminada } from '../core/estado.js';
import { piezaDeEstacion, piezasDelEquipo } from '../core/puente.js';
import { pantallaPista } from './pista.js';
import { pantallaFinal } from './final.js';
import { MOSTRAR_RESPUESTAS } from '../config.js';

export function pantallaResultado(raiz, { almacen, params, ir }) {
  const { estacion, puntos, tiempoUsado, resultado } = params;
  const estado = almacen.get();
  const ok = resultado?.completado;
  const pieza = piezaDeEstacion(estado, estacion.id);

  raiz.innerHTML = h`
    <h1>${ok ? '¡Estación completada!' : 'Reto no superado'}</h1>
    <div class="tarjeta">
      <h2>${estacion.nombre}</h2>
      <p style="font-size:2.4rem;font-weight:700;color:${ok ? 'var(--ok)' : 'var(--error)'}">+${puntos} pts</p>
      <p class="muted">Tiempo: ${formatearMs(tiempoUsado)} · Total del equipo: ${puntosTotales(estado)} pts</p>
    </div>
  ` + (pieza ? h`
    <div class="tarjeta">
      <h2>${ok ? 'Pieza ganada' : 'Pieza perdida'}: ${pieza.nombre}</h2>
      <p class="muted">${ok ? pieza.descripcion : 'Quedará un hueco en su puente. ¡Ánimo en la siguiente!'}</p>
      <div id="puente" style="min-height:200px"></div>
    </div>
  ` : '') + (MOSTRAR_RESPUESTAS === 'siempre' && estacion.explicarSolucion ? `
    <details class="tarjeta"><summary>Ver respuesta correcta</summary>
      ${(estacion.explicarSolucion(resultado?.detalle) ?? []).map((l) => h`<p class="muted">${l}</p>`).join('')}
    </details>` : '') + h`
    <button id="seguir">${terminada(estado) ? 'Ver el puente terminado' : 'Siguiente pista'}</button>
  `;
  raiz.querySelector('#seguir').addEventListener('click', () => ir(terminada(estado) ? pantallaFinal : pantallaPista));

  let destruir = null;
  let cancelado = false;
  const cont = raiz.querySelector('#puente');
  if (cont) {
    import('./puente3d.js')
      .then(({ montarPuente }) => montarPuente(cont, { estados: piezasDelEquipo(estado), resaltar: ok ? pieza.id : null, alto: 200 }))
      .then((d) => { if (cancelado) d(); else destruir = d; })
      .catch((e) => { console.warn('[puente]', e); cont.remove(); });
  }
  return () => { cancelado = true; destruir?.(); };
}
