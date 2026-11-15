/**
 * ESTACIÓN: Detective de clashes
 * Objeto RA: viga con varias instalaciones cruzándola; una la atraviesa (esfera roja).
 * Minijuego: en una planta con cotas, tocar el elemento que colisiona con la viga.
 * 2 intentos. Enseña a leer cotas (zMin/zMax) en lugar de confiar solo en la planta.
 */
import { puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, evaluar } from './logica.js';

const INTENTOS_MAX = 2;

/** Datos para explicar la respuesta después (solo lo necesario, sin funciones). */
function resumenClash(reto, tocadoId) {
  const c = reto.elementos.find((e) => e.id === reto.culpableId);
  const t = reto.elementos.find((e) => e.id === tocadoId);
  return {
    culpable: reto.culpableId,
    culpableNombre: c.nombre, culpableZMin: c.zMin, culpableZMax: c.zMax,
    vigaZMin: reto.viga.zMin, vigaZMax: reto.viga.zMax,
    tocadoNombre: t?.nombre ?? null,
  };
}
let limpiar = () => {};

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'clash-bim',
  nombre: 'Detective de clashes',
  marcadorId: 'clash-bim',
  pista: 'El marcador está dentro del LDCV, junto al escáner Leica P40.',
  tiempoLimiteMs: 120000,
  puntosMax: 100,

  crearObjeto(THREE) {
    const g = new THREE.Group();
    const concreto = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.9 });
    const viga = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.12), concreto);
    viga.position.z = 0.36;
    g.add(viga);
    const colores = [0x9aa5b1, 0x1e88e5, 0xf2a900, 0x8d6e63];
    colores.forEach((c, i) => {
      const r = i === 1 ? 0.03 : 0.025;
      const tubo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.7, 12), new THREE.MeshStandardMaterial({ color: c }));
      const x = -0.36 + i * 0.24;
      // el segundo "sube" y atraviesa la viga
      tubo.position.set(x, 0, i === 1 ? 0.34 : 0.22);
      g.add(tubo);
      if (i === 1) {
        const clash = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), new THREE.MeshBasicMaterial({ color: 0xd0453c, transparent: true, opacity: 0.8 }));
        clash.position.set(x, 0, 0.36);
        g.add(clash);
      }
    });
    // columnas en los extremos
    for (const x of [-0.5, 0.5]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.36), concreto);
      col.position.set(x, 0, 0.18);
      g.add(col);
    }
    return g;
  },

  montarMinijuego(contenedor, ctx) {
    const reto = generarReto();
    let intentos = 0;
    const { area, viga, elementos } = reto;
    const W = 360, H = 240, esc = W / area.ancho;
    const X = (m) => m * esc, Y = (m) => H - m * (H / area.alto);

    contenedor.innerHTML = `
      <h2>Detective de clashes</h2>
      <p>Planta del cielo técnico. La <strong>viga</strong> va de cota
      <strong>${viga.zMin.toFixed(2)}</strong> a <strong>${viga.zMax.toFixed(2)} m</strong>.
      Todas las instalaciones la cruzan en planta, pero <strong>solo una</strong> la atraviesa
      en altura. Toquen la que colisiona.</p>
      <svg id="planta" viewBox="0 0 ${W} ${H}" width="100%" style="background:#0e2748;border-radius:12px;touch-action:manipulation"></svg>
      <div id="leyenda" class="muted" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.85rem"></div>
      <p id="feedback" class="muted"></p>
    `;
    const svg = contenedor.querySelector('#planta');
    const leyenda = contenedor.querySelector('#leyenda');
    const fb = contenedor.querySelector('#feedback');

    const pintar = (marcado = null) => {
      svg.innerHTML = `
        <rect x="0" y="${Y(viga.y1) - 10}" width="${W}" height="20" fill="#f7f7f5" opacity="0.9" />
        <text x="${W - 6}" y="${Y(viga.y1) + 24}" fill="#f7f7f5" font-size="11" text-anchor="end">VIGA ${viga.zMin.toFixed(2)}–${viga.zMax.toFixed(2)} m</text>
      ` + elementos.map((e) => {
        const w = Math.max(8, e.ancho * esc);
        const stroke = marcado === e.id ? (marcado === reto.culpableId ? '#2e9e5b' : '#d0453c') : 'transparent';
        return `<g data-id="${e.id}" style="cursor:pointer">
          <rect x="${X(e.x1) - w / 2}" y="${Y(e.y2)}" width="${w}" height="${Y(e.y1) - Y(e.y2)}" fill="${e.color}" stroke="${stroke}" stroke-width="4" rx="2" />
          <rect x="${X(e.x1) - 22}" y="${Y(e.y2)}" width="44" height="${Y(e.y1) - Y(e.y2)}" fill="transparent" />
          <text x="${X(e.x1)}" y="${Y(e.y2) - 4}" fill="${e.color}" font-size="10" text-anchor="middle">${e.zMin.toFixed(2)}–${e.zMax.toFixed(2)}</text>
        </g>`;
      }).join('');
      leyenda.innerHTML = elementos.map((e) => `<span><span style="display:inline-block;width:10px;height:10px;background:${e.color};border-radius:2px;margin-right:6px"></span>${e.nombre}</span>`).join('');
    };

    const onToque = (ev) => {
      const g = ev.target.closest('g[data-id]');
      if (!g) return;
      intentos++;
      const id = g.dataset.id;
      const r = evaluar(reto, id);
      pintar(id);
      const el = elementos.find((e) => e.id === id);
      if (r.correcto) {
        fb.innerHTML = `<span style="color:var(--ok)">¡Correcto! ${el.nombre} (tope ${el.zMax.toFixed(2)} m) invade la viga.</span>`;
        svg.removeEventListener('click', onToque);
        setTimeout(() => ctx.terminar({ completado: true, aciertos: 1, intentos, detalle: resumenClash(reto, id) }), 1000);
        return;
      }
      if (intentos >= INTENTOS_MAX) {
        const c = elementos.find((e) => e.id === reto.culpableId);
        fb.innerHTML = `<span style="color:var(--error)">No. Era ${c.nombre}: su tope ${c.zMax.toFixed(2)} m está dentro del rango de la viga.</span>`;
        svg.removeEventListener('click', onToque);
        setTimeout(() => ctx.terminar({ completado: false, aciertos: 0, intentos, detalle: resumenClash(reto, id) }), 2200);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">${el.nombre} pasa por debajo (tope ${el.zMax.toFixed(2)} m &lt; ${viga.zMin.toFixed(2)} m).</span> Queda 1 intento.`;
      ctx.mostrarAyuda('Comparen el tope de cada elemento con el fondo de la viga.');
    };

    svg.addEventListener('click', onToque);
    pintar();
    limpiar = () => svg.removeEventListener('click', onToque);
  },

  explicarSolucion(d) {
    if (!d?.culpableNombre) return [];
    return [
      `La viga ocupa de ${d.vigaZMin.toFixed(2)} a ${d.vigaZMax.toFixed(2)} m.`,
      `Choca: ${d.culpableNombre} (de ${d.culpableZMin.toFixed(2)} a ${d.culpableZMax.toFixed(2)} m): su tope supera el fondo de la viga.`,
      'Regla: hay interferencia si los rangos de cota se traslapan (tope del elemento > fondo de la viga).',
      d.tocadoNombre && d.tocadoNombre !== d.culpableNombre ? `Ustedes eligieron por último: ${d.tocadoNombre}.` : '',
    ].filter(Boolean);
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  calcularPuntaje(resultado, tiempoUsadoMs) {
    if (!resultado.completado) return 0;
    const base = puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
    return Math.max(0, base - (resultado.intentos - 1) * 25);
  },
};

export default estacion;
