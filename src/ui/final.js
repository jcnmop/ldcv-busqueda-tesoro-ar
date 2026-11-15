import { h, formatearMs } from '../core/router.js';
import { puntosTotales, resumen } from '../core/estado.js';
import { piezasDelEquipo, puenteCompleto } from '../core/puente.js';
import { MOSTRAR_RESPUESTAS } from '../config.js';
import { pantallaPuenteRA } from './puente-ra.js';
import { pantallaPuenteLibre } from './puente-libre.js';

/** Bloque HTML con las respuestas correctas de cada estación jugada. */
export function htmlRespuestas(estado, porId) {
  return estado.completadas.map((c) => {
    const est = porId[c.estacionId];
    let lineas = [];
    try { lineas = est?.explicarSolucion?.(c.detalle) ?? []; } catch { lineas = []; }
    if (!lineas.length) lineas = ['(Esta estación no tiene explicación disponible.)'];
    return h`<div style="margin-bottom:12px"><strong>${est?.nombre ?? c.estacionId}</strong> ${c.completado ? '✓' : '✗'}</div>`
      + lineas.map((l) => h`<p class="muted" style="margin:0 0 4px 0">${l}</p>`).join('')
      + (est?.referencia ? h`<p class="muted" style="margin:6px 0 0 0;font-size:.85rem">📚 ${est.referencia}</p>` : '');
  }).join('<hr style="border:0;border-top:1px solid var(--azul);margin:12px 0">');
}

export function pantallaFinal(raiz, { almacen, porId, obtenerBackend, ir }) {
  const estado = almacen.get();
  const r = resumen(estado);
  const piezas = piezasDelEquipo(estado);
  const obtenidas = piezas.filter((p) => p.estado === 'obtenida').length;
  const completo = puenteCompleto(estado);

  raiz.innerHTML = h`
    <h1>${completo ? '¡Puente terminado!' : '¡Recorrido completo!'}</h1>
    <div class="tarjeta">
      <h2>${estado.equipoNombre}</h2>
      <p style="font-size:2.4rem;font-weight:700;color:var(--ambar)">${puntosTotales(estado)} pts</p>
      <p class="muted">Duración total: ${formatearMs(r.duracionMs)}</p>
      <p id="posicion" class="muted">Calculando posición…</p>
    </div>
    <div class="tarjeta">
      <h2>Su puente: ${obtenidas} de ${piezas.length} piezas</h2>
      <div id="puente" style="min-height:240px"></div>
      <p class="muted">${completo ? 'Construyeron el puente completo. ¡Excelente trabajo de equipo!' : 'Las piezas en rojo son retos no superados.'}</p>
      <button id="ver-libre">Ver mi puente en RA (en mi espacio)</button>
      <button id="ver-ra" class="secundario">Ver mi puente sobre el póster META</button>
    </div>
    <div class="tarjeta" id="bloque-respuestas" hidden>
      <h2>Respuestas correctas</h2>
      <div id="respuestas"></div>
    </div>
    <button id="btn-respuestas" class="secundario" ${MOSTRAR_RESPUESTAS === 'nunca' ? 'hidden' : ''}>Ver respuestas correctas</button>
    <div class="tarjeta" id="detalle"></div>
    <p class="muted">Presenten esta pantalla en la mesa del LDCV para validar su resultado.</p>
    <p class="muted" id="sync"></p>
    <button id="nuevo" class="secundario">Nuevo equipo (borrar esta partida)</button>
  `;

  raiz.querySelector('#ver-ra').addEventListener('click', () => ir(pantallaPuenteRA, { volver: pantallaFinal }));
  raiz.querySelector('#ver-libre').addEventListener('click', () => ir(pantallaPuenteLibre, { volver: pantallaFinal }));
  const btnResp = raiz.querySelector('#btn-respuestas');
  const bloqueResp = raiz.querySelector('#bloque-respuestas');
  btnResp.addEventListener('click', () => {
    if (bloqueResp.hidden) raiz.querySelector('#respuestas').innerHTML = htmlRespuestas(estado, porId);
    bloqueResp.hidden = !bloqueResp.hidden;
    btnResp.textContent = bloqueResp.hidden ? 'Ver respuestas correctas' : 'Ocultar respuestas';
    if (!bloqueResp.hidden) bloqueResp.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  raiz.querySelector('#nuevo').addEventListener('click', () => {
    if (confirm('¿Empezar con un equipo nuevo? Se borra la partida de este celular (el resultado ya enviado al servidor se conserva).')) {
      almacen.reiniciar();
      location.reload();
    }
  });

  const detalle = raiz.querySelector('#detalle');
  detalle.innerHTML = '<h2>Por estación</h2>' + estado.completadas.map((c, i) => h`
    <p>${porId[c.estacionId]?.nombre ?? c.estacionId}: <strong>${c.puntos} pts</strong>
    <span class="muted">(${formatearMs(c.finMs - c.inicioMs)}) · ${piezas[i]?.pieza.nombre ?? ''} ${c.completado ? '✓' : '✗'}</span></p>`).join('');

  const sync = raiz.querySelector('#sync');
  const actualizarSync = (e) => { sync.textContent = e.sincronizado ? 'Resultado enviado al servidor ✓' : 'Enviando resultado… (se reintenta solo)'; };
  actualizarSync(estado);
  const des = almacen.suscribir(actualizarSync);

  obtenerBackend().then((b) => b.listarTabla()).then((tabla) => {
    const pos = tabla.findIndex((f) => f.equipoId === estado.equipoId) + 1;
    raiz.querySelector('#posicion').textContent = pos > 0 ? `Posición provisional: ${pos} de ${tabla.length}` : 'Posición: pendiente de sincronizar';
  }).catch(() => {});

  let destruir = null;
  let cancelado = false;
  import('./puente3d.js')
    .then(({ montarPuente }) => montarPuente(raiz.querySelector('#puente'), { estados: piezas, alto: 240 }))
    .then((d) => { if (cancelado) d(); else destruir = d; })
    .catch((e) => console.warn('[puente]', e));

  return () => { cancelado = true; des(); destruir?.(); };
}
