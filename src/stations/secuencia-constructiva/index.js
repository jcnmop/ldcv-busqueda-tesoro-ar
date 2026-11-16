/**
 * ESTACIÓN: Secuencia constructiva
 * Objeto RA: corte 3D del proceso que le tocó al equipo (cimentación, losa, pavimento o
 * escaneo láser) con sus componentes reales; tocarlo hace un DESPIECE animado.
 * El equipo tiene un tiempo de observación antes de que aparezca la pieza dorada.
 * Minijuego: ordenar los pasos (toque = seleccionar y mover). 2 verificaciones.
 */
import { puntajePorAciertos, puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, evaluar } from './logica.js';
import { crearEscenaProceso } from './escenas.js';

const VERIFICACIONES_MAX = 2;
let limpiar = () => {};
let retoActual = null; // el modelo 3D y el reto deben ser del mismo proceso

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'secuencia-constructiva',
  nombre: 'Secuencia constructiva',
  marcadorId: 'secuencia-constructiva',
  pista: 'El marcador está en la pizarra exterior del LDCV, al lado de la puerta.',
  tiempoLimiteMs: 150000,
  puntosMax: 100,
  referencia: 'Procesos constructivos y planificación de obra: precedencias entre actividades. En el LDCV, flujo de captura (Leica P40/BLK360) → registro → georreferenciación CRTM05 → modelo BIM.',

  tiempoObservacion: 20,
  inclinacionInicial: 0.45,
  alturaBase: -0.25,
  instruccionRA: 'Observen el corte: cada elemento y capa es una pista del orden constructivo.',

  crearObjeto(THREE) {
    const reto = generarReto();
    retoActual = reto;
    globalThis.__retoSecuencia = reto; // diagnóstico (pruebas)
    return crearEscenaProceso(THREE, reto.id);
  },

  /** Tocar el modelo: despiece / reensamble animado. */
  alTocar(objeto) {
    const separado = objeto.userData.alternarDespiece?.();
    return separado ? 'Despiece: cada componente separado. Toquen de nuevo para reensamblar.' : 'Reensamblado.';
  },

  montarMinijuego(contenedor, ctx) {
    const reto = retoActual ?? generarReto(); // sin RA (modo demo) se genera aquí
    retoActual = null;
    let orden = [...reto.desordenados];
    let verificaciones = 0;
    let seleccionado = -1;

    contenedor.innerHTML = `
      <h2>Secuencia constructiva</h2>
      <p><strong>${reto.titulo}</strong>. Toquen un paso y luego la posición a la que debe ir,
      hasta dejar la secuencia en el orden correcto.</p>
      <ol id="lista" style="padding-left:0;list-style:none;display:flex;flex-direction:column;gap:8px;margin:0"></ol>
      <button id="verificar">Verificar orden</button>
      <p id="feedback" class="muted"></p>
    `;
    const lista = contenedor.querySelector('#lista');
    const btn = contenedor.querySelector('#verificar');
    const fb = contenedor.querySelector('#feedback');

    const pintar = (marcas = null) => {
      lista.innerHTML = orden.map((p, i) => {
        const ok = marcas ? (marcas[i] ? 'border-color:var(--ok)' : 'border-color:var(--error)') : '';
        const sel = i === seleccionado ? 'outline:3px solid var(--ambar)' : '';
        return `<li data-i="${i}" style="background:var(--azul-claro);border:2px solid transparent;border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center;cursor:pointer;${ok};${sel}">
          <span style="color:var(--ambar);font-weight:700;min-width:1.5ch">${i + 1}</span><span>${p}</span></li>`;
      }).join('');
    };

    const onToque = (e) => {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      const i = Number(li.dataset.i);
      if (seleccionado === -1) { seleccionado = i; }
      else if (seleccionado === i) { seleccionado = -1; }
      else {
        const [item] = orden.splice(seleccionado, 1);
        orden.splice(i, 0, item);
        seleccionado = -1;
      }
      pintar();
    };

    const onVerificar = () => {
      verificaciones++;
      const r = evaluar(reto, orden);
      const marcas = orden.map((p, i) => p === reto.correcto[i]);
      pintar(marcas);
      if (r.correcto) {
        fb.innerHTML = '<span style="color:var(--ok)">¡Secuencia correcta!</span>';
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: true, aciertos: r.aciertos, intentos: verificaciones, detalle: { titulo: reto.titulo, total: r.total, correcto: reto.correcto, propuesta: [...orden] } }), 900);
        return;
      }
      if (verificaciones >= VERIFICACIONES_MAX) {
        fb.innerHTML = `<span style="color:var(--error)">${r.aciertos} de ${r.total} en su lugar.</span> Se acabaron las verificaciones.`;
        btn.disabled = true;
        lista.removeEventListener('click', onToque);
        setTimeout(() => ctx.terminar({ completado: r.aciertos >= Math.ceil(r.total / 2), aciertos: r.aciertos, intentos: verificaciones, detalle: { titulo: reto.titulo, total: r.total, correcto: reto.correcto, propuesta: [...orden] } }), 1800);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">${r.aciertos} de ${r.total} en su lugar.</span> Verde = correcto. Queda 1 verificación.`;
    };

    lista.addEventListener('click', onToque);
    btn.addEventListener('click', onVerificar);
    pintar();
    limpiar = () => {
      lista.removeEventListener('click', onToque);
      btn.removeEventListener('click', onVerificar);
    };
  },

  explicarSolucion(d) {
    if (!d?.correcto) return [];
    return [
      `${d.titulo}. Orden correcto:`,
      ...d.correcto.map((p, i) => `${i + 1}. ${p}${d.propuesta && d.propuesta[i] !== p ? '   ✗ (ustedes: ' + d.propuesta[i] + ')' : ''}`),
    ];
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  calcularPuntaje(resultado, tiempoUsadoMs) {
    const total = resultado.detalle?.total ?? resultado.aciertos;
    if (resultado.aciertos === total) {
      const base = puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
      return Math.max(0, base - (resultado.intentos - 1) * 15);
    }
    // Parcial: proporcional a los aciertos, con tope del 60 %
    return Math.min(60, puntajePorAciertos(estacion.puntosMax, resultado.aciertos, total, resultado.intentos, 0));
  },
};

export default estacion;
