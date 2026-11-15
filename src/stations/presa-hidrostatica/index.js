/**
 * ESTACIÓN: Presa y empuje hidrostático
 * Objeto RA: presa de gravedad con embalse y flechas de presión que crecen con la profundidad.
 * Tocar la presa sube y baja el nivel del agua (las flechas cambian con él).
 * Reto: ubicar la fuerza resultante (h/3 desde el fondo) y elegir su magnitud (γh²/2).
 */
import { puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, evaluar, GAMMA } from './logica.js';

const INTENTOS_MAX = 2;
let limpiar = () => {};

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'presa-hidrostatica',
  nombre: 'Presa y empuje hidrostático',
  marcadorId: 'presa-hidrostatica',
  pista: 'Busquen el marcador junto al canal del Laboratorio de Hidráulica.',
  tiempoLimiteMs: 150000,
  puntosMax: 100,
  referencia: 'Hidráulica, hidrostática: presión p = γ·h y empuje sobre superficies planas verticales, F = γ·h²/2 por metro de ancho, aplicado a h/3 desde el fondo.',

  crearObjeto(THREE) {
    const g = new THREE.Group();
    const H = 0.62; // altura de la presa (diseño Z arriba, base en z = 0)

    // Presa de gravedad: sección trapecial (paramento aguas arriba vertical en x = 0)
    const seccion = new THREE.Shape();
    seccion.moveTo(0, 0); seccion.lineTo(0.42, 0); seccion.lineTo(0.12, H); seccion.lineTo(0, H); seccion.closePath();
    const presa = new THREE.Mesh(
      new THREE.ExtrudeGeometry(seccion, { depth: 0.5, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ color: 0xbfc5cc, roughness: 0.85 }),
    );
    // Shape en plano XY → llevar Y de la sección a Z (arriba) y extruir a lo largo de Y
    presa.rotation.x = Math.PI / 2;
    presa.position.set(0, 0.25, 0);
    g.add(presa);

    // Embalse (agua) a la izquierda: su altura se anima
    const agua = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.5, 1),
      new THREE.MeshStandardMaterial({ color: 0x1e88e5, transparent: true, opacity: 0.55, roughness: 0.2 }),
    );
    g.add(agua);

    // Flechas de presión sobre el paramento: más largas cuanto más profundo
    const flechas = [];
    const matFlecha = new THREE.MeshBasicMaterial({ color: 0xd0453c });
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Group();
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), matFlecha);
      cuerpo.rotation.z = Math.PI / 2;
      const punta = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 10), matFlecha);
      punta.rotation.z = -Math.PI / 2;
      f.add(cuerpo, punta);
      f.userData = { cuerpo, punta, i };
      flechas.push(f);
      g.add(f);
    }

    let nivel = 0.85;            // fracción de H
    let objetivoNivel = 0.85;
    const actualizar = () => {
      const h = H * nivel;
      agua.scale.z = h;
      agua.position.set(-0.285, 0, h / 2);
      flechas.forEach((f, i) => {
        const z = h * (1 - (i + 0.5) / flechas.length);  // de arriba hacia abajo
        const largo = 0.05 + 0.32 * ((h - z) / H);       // proporcional a la profundidad
        f.visible = z < h;
        f.position.set(-0.005 - largo / 2 - 0.025, 0, z);
        f.userData.cuerpo.scale.y = largo;
        f.userData.punta.position.x = largo / 2 + 0.02;
      });
    };
    actualizar();
    let t = 0;
    g.userData.actualizar = (dt) => {
      t += dt;
      nivel += (objetivoNivel - nivel) * Math.min(1, dt * 3);
      agua.material.opacity = 0.5 + 0.06 * Math.sin(t * 3); // leve "brillo" del agua
      actualizar();
    };
    g.userData.cambiarNivel = () => { objetivoNivel = objetivoNivel > 0.6 ? 0.35 : 0.9; };
    // Ajuste de tamaño y centrado respecto al póster (la sección va de x = −0.56 a 0.42)
    const contenedor = new THREE.Group();
    g.scale.setScalar(0.72);
    g.position.x = 0.05;
    contenedor.add(g);
    contenedor.userData.cambiarNivel = g.userData.cambiarNivel; // la reacción al toque se pide al contenedor
    return contenedor;
  },

  /** Tocar la presa: sube o baja el embalse y se ve cómo cambia el empuje. */
  alTocar(objeto) { objeto.userData.cambiarNivel?.(); },

  montarMinijuego(contenedor, ctx) {
    const reto = generarReto();
    const { h } = reto;
    let intentos = 0;
    let opcionElegida = null;

    const W = 340, Hs = 260, BASE = 230, TOPE = 30;
    const escala = (BASE - TOPE) / 12;           // px por metro (12 m máx.)
    const Yp = (z) => BASE - z * escala;          // z = altura desde el fondo
    const xPresa = 190;

    contenedor.innerHTML = `
      <h2>Presa y empuje hidrostático</h2>
      <p>El embalse tiene <strong>h = ${h} m de agua</strong> contra la presa. El agua empuja más
      cuanto más profundo: el empuje se dibuja como un <strong>triángulo de presiones</strong> (rojo).
      Usen γ ≈ ${GAMMA} kN/m³ y trabajen por metro de ancho.</p>
      <p><strong>1.</strong> Muevan la flecha amarilla <strong>F</strong> a la altura donde actúa la fuerza total
      (el centro del triángulo).<br>
      <strong>2.</strong> Elijan cuánto vale F: es el <strong>área del triángulo</strong> = base × altura ÷ 2.</p>
      <svg id="presa" viewBox="0 0 ${W} ${Hs}" width="100%" style="background:#0e2748;border-radius:12px"></svg>
      <label class="muted">Altura de la resultante desde el fondo: <strong id="ytxt"></strong> m</label>
      <input id="y" type="range" min="0" max="${h}" step="0.05" value="${(h / 2).toFixed(2)}" />
      <div id="opciones" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div>
      <button id="verificar" disabled>Verificar</button>
      <p id="feedback" class="muted"></p>
    `;
    const svg = contenedor.querySelector('#presa');
    const slider = contenedor.querySelector('#y');
    const ytxt = contenedor.querySelector('#ytxt');
    const ops = contenedor.querySelector('#opciones');
    const btn = contenedor.querySelector('#verificar');
    const fb = contenedor.querySelector('#feedback');

    ops.innerHTML = reto.opciones.map((o) => `
      <button class="secundario" data-op="${o.id}" style="padding:12px 8px">${o.valor} kN/m</button>`).join('');

    const dibujar = (mostrarCorrecta = false) => {
      const y = parseFloat(slider.value);
      ytxt.textContent = y.toFixed(2);
      const sup = Yp(h);
      // Triángulo de presiones: ancho máximo proporcional a γh en el fondo
      const anchoMax = 30 + h * 6;
      svg.innerHTML = `
        <rect x="10" y="${sup}" width="${xPresa - 10}" height="${BASE - sup}" fill="#1e88e5" opacity="0.45" />
        <line x1="10" y1="${sup}" x2="${xPresa}" y2="${sup}" stroke="#90caf9" stroke-width="2" />
        <text x="14" y="${sup - 6}" fill="#90caf9" font-size="11">▽ nivel del agua</text>
        <polygon points="${xPresa},${TOPE - 10} ${xPresa + 34},${TOPE - 10} ${xPresa + 120},${BASE} ${xPresa},${BASE}" fill="#9aa5b1" />
        <polygon points="${xPresa},${sup} ${xPresa},${BASE} ${xPresa - anchoMax},${BASE}" fill="#d0453c" opacity="0.28" />
        <text x="${xPresa - anchoMax}" y="${BASE + 14}" fill="#ef9a9a" font-size="10">base = γ·h = ${GAMMA}×${h} = ${GAMMA * h} kPa</text>
        <line x1="6" y1="${BASE}" x2="${W - 6}" y2="${BASE}" stroke="#f7f7f5" stroke-width="2" />
        <line x1="${xPresa + 140}" y1="${sup}" x2="${xPresa + 140}" y2="${BASE}" stroke="#f7f7f5" stroke-width="1" />
        <text x="${xPresa + 136}" y="${(sup + BASE) / 2}" fill="#f7f7f5" font-size="11" text-anchor="end">h = ${h} m</text>
        <g>
          <line x1="${xPresa - 90}" y1="${Yp(y)}" x2="${xPresa - 8}" y2="${Yp(y)}" stroke="#f2a900" stroke-width="5" />
          <polygon points="${xPresa - 2},${Yp(y)} ${xPresa - 16},${Yp(y) - 8} ${xPresa - 16},${Yp(y) + 8}" fill="#f2a900" />
          <text x="${xPresa - 92}" y="${Yp(y) - 8}" fill="#f2a900" font-size="12" font-weight="700">F</text>
        </g>
        ${mostrarCorrecta ? `<line x1="${xPresa - 90}" y1="${Yp(reto.yR)}" x2="${xPresa}" y2="${Yp(reto.yR)}" stroke="#2e9e5b" stroke-width="3" stroke-dasharray="6 4" />
          <text x="${xPresa - 88}" y="${Yp(reto.yR) + 16}" fill="#2e9e5b" font-size="11">h/3 = ${reto.yR.toFixed(2)} m</text>` : ''}
      `;
    };

    const onInput = () => dibujar();
    const onOpcion = (ev) => {
      const b = ev.target.closest('[data-op]');
      if (!b) return;
      opcionElegida = b.dataset.op;
      ops.querySelectorAll('[data-op]').forEach((x) => {
        const sel = x.dataset.op === opcionElegida;
        x.style.background = sel ? 'var(--ambar)' : '';
        x.style.color = sel ? 'var(--azul)' : '';
      });
      btn.disabled = false;
    };
    const onVerificar = () => {
      intentos++;
      const y = parseFloat(slider.value);
      const r = evaluar(reto, y, opcionElegida);
      const detalle = { h, F: reto.F, yR: reto.yR, yPropuesta: y, opcion: reto.opciones.find((o) => o.id === opcionElegida), alturaOk: r.alturaOk, fuerzaOk: r.fuerzaOk };
      if (r.correcto) {
        dibujar(true);
        fb.innerHTML = `<span style="color:var(--ok)">¡Correcto! F = ${GAMMA * h} × ${h} ÷ 2 = ${reto.F} kN/m, a h/3 = ${reto.yR.toFixed(2)} m del fondo.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: true, aciertos: 2, intentos, detalle }), 1200);
        return;
      }
      const partes = [r.alturaOk ? 'la altura está bien' : 'la altura no es correcta', r.fuerzaOk ? 'la magnitud está bien' : 'la magnitud no es correcta'];
      if (intentos >= INTENTOS_MAX) {
        dibujar(true);
        fb.innerHTML = `<span style="color:var(--error)">Sin intentos: ${partes.join(' y ')}.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: false, aciertos: (r.alturaOk ? 1 : 0) + (r.fuerzaOk ? 1 : 0), intentos, detalle }), 2200);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">Revisen: ${partes.join(' y ')}.</span> Queda 1 intento.`;
      ctx.mostrarAyuda(`Pista: el centro de un triángulo está a 1/3 de su base (aquí, desde el fondo). Área = ${GAMMA * h} × ${h} ÷ 2.`);
    };

    slider.addEventListener('input', onInput);
    ops.addEventListener('click', onOpcion);
    btn.addEventListener('click', onVerificar);
    dibujar();
    limpiar = () => {
      slider.removeEventListener('input', onInput);
      ops.removeEventListener('click', onOpcion);
      btn.removeEventListener('click', onVerificar);
    };
  },

  explicarSolucion(d) {
    if (d?.h == null) return [];
    return [
      `Embalse de h = ${d.h} m. La presión crece con la profundidad: en el fondo vale γ·h = ${GAMMA}×${d.h} = ${GAMMA * d.h} kPa (γ ≈ ${GAMMA} kN/m³).`,
      `F es el área del triángulo de presiones: ${GAMMA * d.h} × ${d.h} ÷ 2 = ${d.F} kN por metro de ancho.`,
      `Actúa en el centro del triángulo: h/3 = ${d.yR.toFixed(2)} m desde el fondo.`,
      `Ustedes: altura ${Number(d.yPropuesta).toFixed(2)} m ${d.alturaOk ? '✓' : '✗'}, magnitud ${d.opcion ? d.opcion.valor + ' kN/m' : '—'} ${d.fuerzaOk ? '✓' : '✗ (' + (d.opcion?.formula ?? '') + ')'}.`,
    ];
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  /** Completo: 100 con descuento por tiempo y −20 por segundo intento. Parcial: 30 por cada parte acertada. */
  calcularPuntaje(resultado, tiempoUsadoMs) {
    if (resultado.completado) {
      const base = puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
      return Math.max(0, base - (resultado.intentos - 1) * 20);
    }
    return 30 * (resultado.aciertos ?? 0);
  },
};

export default estacion;
