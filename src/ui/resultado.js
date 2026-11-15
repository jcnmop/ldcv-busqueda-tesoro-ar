import { h, formatearMs } from '../core/router.js';
import { puntosTotales, terminada } from '../core/estado.js';
import { pantallaPista } from './pista.js';
import { pantallaFinal } from './final.js';

export function pantallaResultado(raiz, { almacen, params, ir }) {
  const { estacion, puntos, tiempoUsado, resultado } = params;
  const estado = almacen.get();
  const ok = resultado?.completado;

  raiz.innerHTML = h`
    <h1>${ok ? '¡Estación completada!' : 'Tiempo agotado'}</h1>
    <div class="tarjeta">
      <h2>${estacion.nombre}</h2>
      <p style="font-size:2.4rem;font-weight:700;color:${ok ? 'var(--ok)' : 'var(--error)'}">+${puntos} pts</p>
      <p class="muted">Tiempo: ${formatearMs(tiempoUsado)} · Total del equipo: ${puntosTotales(estado)} pts</p>
    </div>
    <button id="seguir">${terminada(estado) ? 'Ver resultado final' : 'Siguiente pista'}</button>
  `;
  raiz.querySelector('#seguir').addEventListener('click', () => ir(terminada(estado) ? pantallaFinal : pantallaPista));
}
