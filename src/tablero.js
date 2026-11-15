/**
 * TABLA DE POSICIONES EN VIVO. Abrir /tablero.html en la pantalla del evento.
 * Con backend local solo muestra los equipos de este navegador (útil para probar).
 */
import { obtenerBackend } from './core/backend/index.js';
import { h, formatearMs } from './core/router.js';

const app = document.getElementById('app');

function render(tabla, nombreBackend) {
  app.innerHTML = h`
    <h1>Búsqueda del Tesoro AR · Tabla de posiciones</h1>
    <p class="muted">LDCV · Ingeniería Civil UCR · fuente: ${nombreBackend} · ${new Date().toLocaleTimeString('es-CR')}</p>
  ` + (tabla.length === 0
    ? '<p class="tarjeta">Aún no hay equipos registrados.</p>'
    : `<table>
        <thead><tr><th>#</th><th>Equipo</th><th>Estaciones</th><th>Tiempo</th><th style="text-align:right">Puntos</th></tr></thead>
        <tbody>${tabla.map((f, i) => h`
          <tr class="${i === 0 ? 'top1' : ''}">
            <td class="pos">${i + 1}</td>
            <td>${f.equipoNombre}</td>
            <td><span class="pill ${f.finPartidaMs ? 'fin' : ''}">${f.estacionesCompletadas}/${f.totalEstaciones}${f.finPartidaMs ? ' · fin' : ''}</span></td>
            <td class="muted">${formatearMs(f.duracionMs ?? (Date.now() - f.inicioPartidaMs))}</td>
            <td class="pts">${f.puntos}</td>
          </tr>`).join('')}
        </tbody>
      </table>`);
}

obtenerBackend().then((b) => {
  b.suscribirTabla((tabla) => render(tabla, b.nombre));
});
