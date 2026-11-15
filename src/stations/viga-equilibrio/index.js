/**
 * ESTACIÓN: Viga en equilibrio
 * Objeto RA: viga simplemente apoyada con una carga, procedural (sin .glb).
 * Minijuego: deslizar una segunda carga hasta igualar las reacciones. 3 intentos.
 */
import { puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, evaluar, reacciones } from './logica.js';

const INTENTOS_MAX = 3;
let limpiar = () => {};

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'viga-equilibrio',
  nombre: 'Viga en equilibrio',
  marcadorId: 'viga-equilibrio',
  pista: 'Busquen el marcador junto a la entrada principal del edificio de Ingeniería Civil, en la columna de la izquierda.',
  tiempoLimiteMs: 150000,
  puntosMax: 100,

  crearObjeto(THREE) {
    const g = new THREE.Group();
    const acero = new THREE.MeshStandardMaterial({ color: 0x8a97a8, metalness: 0.6, roughness: 0.4 });
    const ambar = new THREE.MeshStandardMaterial({ color: 0xf2a900 });
    const rojo = new THREE.MeshStandardMaterial({ color: 0xd0453c });

    // Viga (perfil I simplificado) a lo largo de X, apoyada en z ≈ 0.18
    const viga = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.06), acero);
    viga.position.z = 0.21;
    g.add(viga);
    // Apoyos: triángulos (cono de 4 lados)
    for (const x of [-0.45, 0.45]) {
      const apoyo = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), ambar);
      apoyo.rotation.x = Math.PI / 2;
      apoyo.position.set(x, 0, 0.09);
      g.add(apoyo);
    }
    // Carga: flecha roja que sube y baja
    const flecha = new THREE.Group();
    flecha.add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), rojo));
    const punta = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), rojo);
    punta.position.y = -0.12;
    punta.rotation.x = Math.PI;
    flecha.add(punta);
    flecha.rotation.x = Math.PI / 2;
    flecha.position.set(-0.15, 0, 0.42);
    g.add(flecha);
    g.userData.flecha = flecha;
    return g;
  },

  montarMinijuego(contenedor, ctx) {
    const reto = generarReto();
    let intentos = 0;

    contenedor.innerHTML = `
      <h2>Viga en equilibrio</h2>
      <p>Una viga de <strong>${reto.L} m</strong> apoyada en A y B soporta una carga fija
      <strong>P₁ = ${reto.P1} kN</strong> a <strong>${reto.x1} m</strong> de A.
      Coloquen la carga <strong>P₂ = ${reto.P2} kN</strong> donde haga que las reacciones
      en A y B sean <strong>iguales</strong>.</p>
      <svg id="dibujo" viewBox="0 0 400 150" width="100%" style="background:#0e2748;border-radius:12px"></svg>
      <label class="muted">Posición de P₂ desde A: <strong id="x2txt"></strong> m</label>
      <input id="x2" type="range" min="0" max="${reto.L}" step="0.05" value="${(reto.L / 2).toFixed(2)}" />
      <p class="muted">R<sub>A</sub> = <span id="ra"></span> kN &nbsp;·&nbsp; R<sub>B</sub> = <span id="rb"></span> kN</p>
      <button id="verificar">Verificar</button>
      <p id="feedback" class="muted"></p>
    `;

    const svg = contenedor.querySelector('#dibujo');
    const slider = contenedor.querySelector('#x2');
    const x2txt = contenedor.querySelector('#x2txt');
    const ra = contenedor.querySelector('#ra');
    const rb = contenedor.querySelector('#rb');
    const btn = contenedor.querySelector('#verificar');
    const fb = contenedor.querySelector('#feedback');

    const escala = 320 / reto.L;
    const X = (m) => 40 + m * escala;

    const dibujar = (x2, inclinacion = 0) => {
      const { RA, RB } = reacciones({ ...reto, x2 });
      ra.textContent = RA.toFixed(1);
      rb.textContent = RB.toFixed(1);
      x2txt.textContent = Number(x2).toFixed(2);
      const ang = inclinacion * 6; // grados
      svg.innerHTML = `
        <g transform="rotate(${ang} 200 80)">
          <rect x="${X(0)}" y="76" width="${320}" height="8" fill="#9aa5b1" />
          <line x1="${X(reto.x1)}" y1="30" x2="${X(reto.x1)}" y2="74" stroke="#d0453c" stroke-width="4" marker-end="url(#p)" />
          <text x="${X(reto.x1)}" y="22" fill="#d0453c" font-size="13" text-anchor="middle">P₁=${reto.P1}</text>
          <line x1="${X(x2)}" y1="30" x2="${X(x2)}" y2="74" stroke="#f2a900" stroke-width="4" marker-end="url(#p2)" />
          <text x="${X(x2)}" y="100" fill="#f2a900" font-size="13" text-anchor="middle">P₂=${reto.P2}</text>
        </g>
        <defs>
          <marker id="p" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto"><path d="M0,0 L6,0 L3,6 z" fill="#d0453c"/></marker>
          <marker id="p2" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto"><path d="M0,0 L6,0 L3,6 z" fill="#f2a900"/></marker>
        </defs>
        <polygon points="${X(0) - 12},110 ${X(0) + 12},110 ${X(0)},86" fill="#f2a900" />
        <polygon points="${X(reto.L) - 12},110 ${X(reto.L) + 12},110 ${X(reto.L)},86" fill="#f2a900" />
        <text x="${X(0)}" y="128" fill="#f7f7f5" font-size="14" text-anchor="middle">A</text>
        <text x="${X(reto.L)}" y="128" fill="#f7f7f5" font-size="14" text-anchor="middle">B</text>
        <text x="200" y="145" fill="#9aa5b1" font-size="12" text-anchor="middle">L = ${reto.L} m</text>
      `;
    };

    const onInput = () => dibujar(parseFloat(slider.value));
    const onVerificar = () => {
      intentos++;
      const x2 = parseFloat(slider.value);
      const r = evaluar(reto, x2);
      if (r.correcto) {
        dibujar(x2, 0);
        fb.innerHTML = `<span style="color:var(--ok)">¡Equilibrada! R<sub>A</sub> = R<sub>B</sub> = ${r.RA.toFixed(1)} kN.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: true, aciertos: 1, intentos, detalle: { reto, x2 } }), 900);
        return;
      }
      dibujar(x2, r.inclinaHacia === 'A' ? -1 : 1);
      const restantes = INTENTOS_MAX - intentos;
      if (restantes <= 0) {
        fb.innerHTML = `<span style="color:var(--error)">Sin intentos. La posición correcta era ${reto.objetivo.toFixed(2)} m.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: false, aciertos: 0, intentos, detalle: { reto, x2 } }), 1800);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">Se inclina hacia ${r.inclinaHacia}.</span> Quedan ${restantes} intento${restantes === 1 ? '' : 's'}.`;
      if (intentos === 2) ctx.mostrarAyuda('Pista: la resultante de las dos cargas debe quedar en el centro de la viga.');
    };

    slider.addEventListener('input', onInput);
    btn.addEventListener('click', onVerificar);
    dibujar(parseFloat(slider.value));
    limpiar = () => {
      slider.removeEventListener('input', onInput);
      btn.removeEventListener('click', onVerificar);
    };
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  calcularPuntaje(resultado, tiempoUsadoMs) {
    if (!resultado.completado) return 0;
    const base = puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
    const penal = (resultado.intentos - 1) * 10; // −10 por cada intento fallido
    return Math.max(0, base - penal);
  },
};

export default estacion;
