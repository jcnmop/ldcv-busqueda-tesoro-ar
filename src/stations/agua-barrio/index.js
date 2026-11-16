/**
 * ESTACIÓN: Abastecimiento de agua de un barrio (Ambiental / Ingeniería sanitaria)
 * Objeto RA: barrio con casas de techo rojo, una bodega gris que OCULTA algunas casas y un
 * tanque elevado. Hay que girar el modelo (modo Girar) para contar todas las casas.
 * Tocar el barrio llena el tanque (animación).
 * Reto: 1) cuántas casas  2) consumo diario (m³)  3) ¿el tanque alcanza para un día?
 */
import { puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, evaluar, HAB_POR_CASA } from './logica.js';

const INTENTOS_MAX = 2;
let limpiar = () => {};
let retoActual = null; // se genera con el objeto 3D para que el barrio y el reto coincidan

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'agua-barrio',
  nombre: 'Agua para el barrio',
  marcadorId: 'agua-barrio',
  pista: 'Busquen el marcador junto al tanque de agua detrás del edificio de Ingeniería.',
  tiempoLimiteMs: 180000,
  puntosMax: 100,
  alturaBase: -0.1, // el barrio va a media altura del póster: lejos de los botones inferiores
  tiempoObservacion: 30,
  instruccionRA: 'Observen con atención todos los detalles del barrio.',
  referencia: 'Ingeniería sanitaria / ambiental: demanda de agua potable = población × dotación (L/hab/día) y almacenamiento para regular el consumo. En Costa Rica las dotaciones de diseño las fija la normativa del AyA.',

  crearObjeto(THREE) {
    const reto = generarReto();
    retoActual = reto;
    globalThis.__retoAgua = reto; // diagnóstico (pruebas)

    const g = new THREE.Group();
    // Terreno
    const terreno = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.02), new THREE.MeshStandardMaterial({ color: 0x5b8c3a }));
    terreno.position.z = 0.01;
    g.add(terreno);
    // Calle
    const calle = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.022), new THREE.MeshStandardMaterial({ color: 0x555b63 }));
    calle.position.set(0, -0.22, 0.012);
    g.add(calle);

    const matPared = new THREE.MeshStandardMaterial({ color: 0xf2e6cf });
    const matTecho = new THREE.MeshStandardMaterial({ color: 0xc0392b });
    const casa = (x, y) => {
      const c = new THREE.Group();
      const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.06), matPared);
      cuerpo.position.z = 0.05;
      const techo = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.05, 4), matTecho);
      techo.rotation.x = Math.PI / 2; techo.rotation.y = Math.PI / 4;
      techo.position.z = 0.105;
      c.add(cuerpo, techo);
      c.position.set(x, y, 0);
      g.add(c);
    };

    // Bodega gris al frente que tapa las casas ocultas (vista frontal = desde −Y)
    const bodega = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0x8e979f }));
    bodega.position.set(-0.12, -0.1, 0.15);
    g.add(bodega);
    // Casas ocultas: justo detrás de la bodega, más bajas que ella
    for (let i = 0; i < reto.ocultas; i++) casa(-0.29 + i * 0.11, 0.06);

    // Casas visibles: a los lados y al fondo, fuera de la sombra de la bodega
    const lugares = [];
    for (const y of [-0.12, 0.06, 0.2]) for (const x of [0.16, 0.27]) lugares.push([x, y]);
    for (const x of [-0.42, -0.29, -0.18, -0.07, 0.04]) lugares.push([x, 0.22]);
    lugares.push([-0.42, -0.1], [-0.42, 0.06]);
    for (let i = 0; i < reto.visibles; i++) casa(...lugares[i]);

    // Tanque elevado con nivel de agua animado
    const tanqueG = new THREE.Group();
    const matPata = new THREE.MeshStandardMaterial({ color: 0x9aa5b1 });
    for (const [dx, dy] of [[-0.04, -0.04], [0.04, -0.04], [-0.04, 0.04], [0.04, 0.04]]) {
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 6), matPata);
      pata.rotation.x = Math.PI / 2; pata.position.set(dx, dy, 0.15);
      tanqueG.add(pata);
    }
    const cuba = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xdfe6ec, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    cuba.rotation.x = Math.PI / 2; cuba.position.z = 0.38;
    const agua = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1, 20), new THREE.MeshStandardMaterial({ color: 0x1e88e5 }));
    agua.rotation.x = Math.PI / 2;
    tanqueG.add(cuba, agua);
    tanqueG.position.set(0.42, 0.0, 0);
    g.add(tanqueG);

    let nivel = 0.5, objetivo = 0.5, t = 0;
    g.userData.actualizar = (dt) => {
      t += dt;
      nivel += (objetivo - nivel) * Math.min(1, dt * 2);
      const alto = 0.15 * nivel + 0.004 * Math.sin(t * 3);
      agua.scale.y = Math.max(alto, 0.002);
      agua.position.z = 0.30 + alto / 2;
    };
    g.userData.llenar = () => { objetivo = objetivo > 0.7 ? 0.25 : 0.95; };
    return g;
  },

  /** Tocar el barrio: el tanque se llena o se vacía. */
  alTocar(objeto) { objeto.userData.llenar?.(); },

  montarMinijuego(contenedor, ctx) {
    const demo = !retoActual;
    const reto = retoActual ?? generarReto();
    retoActual = null; // un reto por escaneo
    let intentos = 0;
    let opcion = null;
    let alcanza = null;

    contenedor.innerHTML = `
      <h2>Agua para el barrio</h2>
      ${demo ? `<p class="muted">(Modo demo: el barrio tenía <strong>${reto.casas}</strong> casas.)</p>` : ''}
      <p>Cada casa tiene <strong>${HAB_POR_CASA} habitantes</strong> y la dotación es
      <strong>${reto.dotacion} L por habitante por día</strong>. El tanque elevado tiene <strong>${reto.tanque} m³</strong>.</p>
      <div class="tarjeta" style="gap:8px">
        <label><strong>1.</strong> ¿Cuántas casas (techo rojo) hay en el barrio?</label>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="secundario" id="menos" style="width:56px">−</button>
          <input id="casas" type="number" inputmode="numeric" min="0" max="40" value="0" style="text-align:center;font-size:1.4rem" />
          <button class="secundario" id="mas" style="width:56px">+</button>
        </div>
      </div>
      <div class="tarjeta" style="gap:8px">
        <label><strong>2.</strong> Consumo diario del barrio (población × dotación):</label>
        <div id="opciones" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${reto.opciones.map((o) => `<button class="secundario" data-op="${o.id}" style="padding:12px 6px">${o.valor.toLocaleString('es-CR')} m³</button>`).join('')}
        </div>
      </div>
      <div class="tarjeta" style="gap:8px">
        <label><strong>3.</strong> ¿El tanque de ${reto.tanque} m³ alcanza para un día de consumo?</label>
        <div id="decision" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="secundario" data-alcanza="si">Sí alcanza</button>
          <button class="secundario" data-alcanza="no">No alcanza</button>
        </div>
      </div>
      <button id="verificar" disabled>Verificar</button>
      <p id="feedback" class="muted"></p>
    `;
    const $ = (s) => contenedor.querySelector(s);
    const inCasas = $('#casas'), btn = $('#verificar'), fb = $('#feedback');
    const marcar = (cont, attr, val) => cont.querySelectorAll(`[${attr}]`).forEach((b) => {
      const sel = b.getAttribute(attr) === val;
      b.style.background = sel ? 'var(--ambar)' : ''; b.style.color = sel ? 'var(--azul)' : '';
    });
    const listo = () => { btn.disabled = !(opcion && alcanza !== null && Number(inCasas.value) > 0); };

    const onMenos = () => { inCasas.value = Math.max(0, Number(inCasas.value) - 1); listo(); };
    const onMas = () => { inCasas.value = Number(inCasas.value) + 1; listo(); };
    const onOpcion = (ev) => { const b = ev.target.closest('[data-op]'); if (!b) return; opcion = b.dataset.op; marcar($('#opciones'), 'data-op', opcion); listo(); };
    const onDecision = (ev) => { const b = ev.target.closest('[data-alcanza]'); if (!b) return; alcanza = b.dataset.alcanza === 'si'; marcar($('#decision'), 'data-alcanza', b.dataset.alcanza); listo(); };
    const onVerificar = () => {
      intentos++;
      const r = evaluar(reto, { casas: inCasas.value, opcionId: opcion, alcanza });
      const detalle = { ...reto, opciones: undefined, respuestaCasas: Number(inCasas.value),
        respuestaConsumo: reto.opciones.find((o) => o.id === opcion), respuestaAlcanza: alcanza, ...r };
      const aciertos = [r.conteoOk, r.consumoOk, r.decisionOk].filter(Boolean).length;
      if (r.correcto) {
        fb.innerHTML = `<span style="color:var(--ok)">¡Correcto! ${reto.casas} casas × ${HAB_POR_CASA} hab × ${reto.dotacion} L = ${reto.consumo} m³/día; el tanque de ${reto.tanque} m³ ${reto.alcanza ? 'sí' : 'no'} alcanza.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: true, aciertos, intentos, detalle }), 1300);
        return;
      }
      const mal = [!r.conteoOk && 'el conteo de casas', !r.consumoOk && 'el consumo', !r.decisionOk && 'la decisión del tanque'].filter(Boolean);
      if (intentos >= INTENTOS_MAX) {
        fb.innerHTML = `<span style="color:var(--error)">Sin intentos. Revisar: ${mal.join(', ')}.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: false, aciertos, intentos, detalle }), 2000);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">Revisen ${mal.join(', ')}.</span> Queda 1 intento.`;
      ctx.mostrarAyuda(r.conteoOk
        ? 'Pista: población = casas × 4; consumo = población × dotación, y 1 m³ = 1000 L.'
        : 'Pista: ¿giraron el barrio? Algunas casas estaban escondidas detrás de la bodega gris.');
    };

    $('#menos').addEventListener('click', onMenos);
    $('#mas').addEventListener('click', onMas);
    inCasas.addEventListener('input', listo);
    $('#opciones').addEventListener('click', onOpcion);
    $('#decision').addEventListener('click', onDecision);
    btn.addEventListener('click', onVerificar);
    limpiar = () => {
      $('#menos')?.removeEventListener('click', onMenos);
      $('#mas')?.removeEventListener('click', onMas);
      btn.removeEventListener('click', onVerificar);
    };
  },

  explicarSolucion(d) {
    if (d?.casas == null) return [];
    const pob = d.casas * d.habPorCasa;
    return [
      `El barrio tenía ${d.casas} casas: ${d.visibles} a la vista y ${d.ocultas} escondidas detrás de la bodega (había que girar el modelo). Ustedes contaron ${d.respuestaCasas} ${d.conteoOk ? '✓' : '✗'}.`,
      `Población = ${d.casas} × ${d.habPorCasa} = ${pob} habitantes.`,
      `Consumo = ${pob} hab × ${d.dotacion} L/hab/día = ${(pob * d.dotacion).toLocaleString('es-CR')} L = ${d.consumo} m³/día ${d.consumoOk ? '✓' : '✗' + (d.respuestaConsumo?.error ? ' (' + d.respuestaConsumo.error + ')' : '')}.`,
      `Tanque de ${d.tanque} m³ ${d.alcanza ? '≥' : '<'} ${d.consumo} m³ → ${d.alcanza ? 'sí' : 'no'} alcanza para un día ${d.decisionOk ? '✓' : '✗'}.`,
    ];
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  /** Completo: 100 ajustado por tiempo, −20 por segundo intento. Parcial: 25 por cada parte acertada. */
  calcularPuntaje(resultado, tiempoUsadoMs) {
    if (resultado.completado) {
      const base = puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
      return Math.max(0, base - (resultado.intentos - 1) * 20);
    }
    return 25 * (resultado.aciertos ?? 0);
  },
};

export default estacion;
