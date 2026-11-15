import { h, formatearMs } from '../core/router.js';
import { puntosTotales, resumen } from '../core/estado.js';

export function pantallaFinal(raiz, { almacen, porId, obtenerBackend }) {
  const estado = almacen.get();
  const r = resumen(estado);

  raiz.innerHTML = h`
    <h1>¡Recorrido completo!</h1>
    <div class="tarjeta">
      <h2>${estado.equipoNombre}</h2>
      <p style="font-size:2.4rem;font-weight:700;color:var(--ambar)">${puntosTotales(estado)} pts</p>
      <p class="muted">Duración total: ${formatearMs(r.duracionMs)}</p>
      <p id="posicion" class="muted">Calculando posición…</p>
    </div>
    <div class="tarjeta" id="detalle"></div>
    <p class="muted">Presenten esta pantalla en la mesa del LDCV para validar su resultado.</p>
    <p class="muted" id="sync"></p>
  `;

  const detalle = raiz.querySelector('#detalle');
  detalle.innerHTML = '<h2>Por estación</h2>' + estado.completadas.map((c) => h`
    <p>${porId[c.estacionId]?.nombre ?? c.estacionId}: <strong>${c.puntos} pts</strong>
    <span class="muted">(${formatearMs(c.finMs - c.inicioMs)})</span></p>`).join('');

  const sync = raiz.querySelector('#sync');
  const actualizarSync = (e) => { sync.textContent = e.sincronizado ? 'Resultado enviado al servidor ✓' : 'Enviando resultado… (se reintenta solo)'; };
  actualizarSync(estado);
  const des = almacen.suscribir(actualizarSync);

  obtenerBackend().then((b) => b.listarTabla()).then((tabla) => {
    const pos = tabla.findIndex((f) => f.equipoId === estado.equipoId) + 1;
    raiz.querySelector('#posicion').textContent = pos > 0 ? `Posición provisional: ${pos} de ${tabla.length}` : 'Posición: pendiente de sincronizar';
  }).catch(() => {});

  return des;
}
