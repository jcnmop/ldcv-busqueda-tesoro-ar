import { h, formatearMs } from '../core/router.js';
import { estacionActual, puntosTotales, terminada } from '../core/estado.js';
import { pantallaEscaneo } from './escaneo.js';
import { pantallaFinal } from './final.js';

export function barraProgreso(estado) {
  const n = estado.ruta.length;
  const hechas = estado.completadas.length;
  return `<div class="progreso">${Array.from({ length: n }, (_, i) =>
    `<span class="${i < hechas ? 'hecha' : i === hechas ? 'actual' : ''}"></span>`).join('')}</div>`;
}

export function pantallaPista(raiz, { almacen, porId, ir }) {
  const estado = almacen.get();
  if (terminada(estado)) return ir(pantallaFinal);

  const id = estacionActual(estado);
  const est = porId[id];
  const numero = estado.completadas.length + 1;

  raiz.innerHTML = h`
    <p class="muted">Equipo <strong>${estado.equipoNombre}</strong> · ${puntosTotales(estado)} pts</p>
    ${''}
    <h1>Estación ${numero} de ${estado.ruta.length}</h1>
    <div class="tarjeta">
      <h2>${est?.nombre ?? 'Estación'}</h2>
      <p>${est?.pista ?? 'Estación no encontrada en el registro.'}</p>
      <p class="muted">⏱ Tiempo para el reto: <strong>${est ? formatearMs(est.tiempoLimiteMs) : '—'} min</strong>
      · empieza a correr al atrapar la pieza dorada.</p>
    </div>
    <p class="muted">Cuando lleguen al punto, toquen el botón y apunten la cámara al marcador.</p>
    <button id="escanear" ${est ? '' : 'disabled'}>Escanear marcador</button>
    <button id="reiniciar" class="secundario">Reiniciar equipo</button>
  `;
  raiz.insertAdjacentHTML('afterbegin', barraProgreso(estado));

  raiz.querySelector('#escanear').addEventListener('click', () => ir(pantallaEscaneo));
  raiz.querySelector('#reiniciar').addEventListener('click', () => {
    if (confirm('¿Reiniciar? Se pierde todo el progreso de este equipo en este celular.')) {
      almacen.reiniciar();
      location.reload();
    }
  });
}
