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
    const { viga, elementos } = reto;

    // CORTE TRANSVERSAL: eje vertical = cota (m). La viga es una franja horizontal;
    // cada instalación es un rectángulo a su altura real. Clash = traslape vertical con la viga.
    const W = 360, H = 300, IZQ = 46, ARR = 16, ABA = 34;
    const zBajo = Math.floor((Math.min(...elementos.map((e) => e.zMin)) - 0.1) * 10) / 10;
    const zAlto = Math.ceil((viga.zMax + 0.1) * 10) / 10;
    const Yz = (z) => ARR + (zAlto - z) * ((H - ARR - ABA) / (zAlto - zBajo));
    const col = (W - IZQ) / elementos.length;
    const Xc = (i) => IZQ + col * (i + 0.5);

    contenedor.innerHTML = `
      <h2>Detective de clashes</h2>
      <p><strong>Corte transversal</strong> del cielo técnico. Un <strong>clash</strong> ocurre cuando una
      instalación ocupa parte del mismo espacio que la <strong>viga</strong>. Todas pasan cerca:
      lean las cotas con cuidado y <strong>toquen la única que choca</strong>.</p>
      <svg id="corte" viewBox="0 0 ${W} ${H}" width="100%" style="background:#0e2748;border-radius:12px;touch-action:manipulation"></svg>
      <div id="leyenda" class="muted" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.85rem"></div>
      <p id="feedback" class="muted"></p>
    `;
    const svg = contenedor.querySelector('#corte');
    const leyenda = contenedor.querySelector('#leyenda');
    const fb = contenedor.querySelector('#feedback');

    const pintar = (marcado = null) => {
      // Eje de cotas cada 10 cm
      let eje = '';
      for (let z = zBajo; z <= zAlto + 1e-9; z = Math.round((z + 0.1) * 10) / 10) {
        const y = Yz(z);
        const fuerte = Math.abs(z * 2 - Math.round(z * 2)) < 1e-6; // cada 0.5 m
        eje += `<line x1="${IZQ}" y1="${y}" x2="${W}" y2="${y}" stroke="#ffffff" stroke-opacity="${fuerte ? 0.18 : 0.07}" />`
          + `<text x="${IZQ - 6}" y="${y + 3}" fill="#9aa5b1" font-size="10" text-anchor="end">${z.toFixed(1)}</text>`;
      }
      const yVigaArr = Yz(viga.zMax), yVigaAba = Yz(viga.zMin);
      svg.innerHTML = `
        <defs><pattern id="rayado" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#cfd3d8"/><line x1="0" y1="0" x2="0" y2="8" stroke="#9aa5b1" stroke-width="3"/></pattern></defs>
        ${eje}
        <rect x="${IZQ}" y="${yVigaArr}" width="${W - IZQ}" height="${yVigaAba - yVigaArr}" fill="url(#rayado)" opacity="0.85" />
        <line x1="${IZQ}" y1="${yVigaAba}" x2="${W}" y2="${yVigaAba}" stroke="#f2a900" stroke-dasharray="5 4" stroke-width="1.5" />
        <text x="${W - 6}" y="${yVigaAba - 5}" fill="#0b1f3a" font-size="10" font-weight="700" text-anchor="end">fondo de viga ${viga.zMin.toFixed(2)} m</text>
        <text x="4" y="${ARR - 4}" fill="#9aa5b1" font-size="10">cota (m)</text>
        <text x="${W - 6}" y="${yVigaArr + 14}" fill="#0b1f3a" font-size="11" font-weight="700" text-anchor="end">VIGA ${viga.zMin.toFixed(2)}–${viga.zMax.toFixed(2)} m</text>
      ` + elementos.map((e, i) => {
        const w = Math.min(col * 0.6, Math.max(14, e.ancho * 90));
        const y1 = Yz(e.zMax), y2 = Yz(e.zMin);
        const stroke = marcado === e.id ? (marcado === reto.culpableId ? '#2e9e5b' : '#d0453c') : 'transparent';
        return `<g data-id="${e.id}" style="cursor:pointer">
          <text x="${Xc(i)}" y="${H - 8}" fill="${e.color}" font-size="10" text-anchor="middle">${e.zMin.toFixed(2)}–${e.zMax.toFixed(2)}</text>
          <rect x="${Xc(i) - w / 2}" y="${y1}" width="${w}" height="${y2 - y1}" fill="${e.color}" stroke="${stroke}" stroke-width="4" rx="${e.tipo === 'ducto' || e.tipo === 'bandeja' ? 2 : w / 2}" />
          <text x="${Xc(i)}" y="${y2 + 13}" fill="#f7f7f5" font-size="11" font-weight="700" text-anchor="middle">${i + 1}</text>
          <rect x="${Xc(i) - col / 2 + 2}" y="${ARR}" width="${col - 4}" height="${H - ARR}" fill="transparent" />
        </g>`;
      }).join('');
      leyenda.innerHTML = elementos.map((e, i) => `<span><span style="display:inline-block;width:10px;height:10px;background:${e.color};border-radius:2px;margin-right:6px"></span>${i + 1}. ${e.nombre}</span>`).join('');
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
