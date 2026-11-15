/**
 * ESTACIÓN: Cubicación de concreto (Construcción)
 * Objeto RA: losa sobre 4 columnas, a escala. CINTA MÉTRICA VIRTUAL: tocar un punto del modelo
 * y luego otro; cada toque se ajusta a la esquina más cercana de la pieza tocada y se dibuja
 * la medida en metros reales. Así se miden largo y ancho de la losa y altura de las columnas.
 * Reto: volumen total de concreto y viajes de mixer (6 m³).
 */
import { puntajePorTiempo } from '../../core/puntaje.js';
import { generarReto, evaluar, esquinaMasCercana, MIXER_M3, N_COLUMNAS } from './logica.js';
import { etiqueta } from '../../ar/modelos.js';

const INTENTOS_MAX = 2;
const ESCALA = 0.06; // unidades de marcador por metro real (losa de 10 m = 0.6 del ancho del póster)
let limpiar = () => {};
let retoActual = null;
let mediciones = [];

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'concreto',
  nombre: 'Cubicación de concreto',
  marcadorId: 'concreto',
  pista: 'Busquen el marcador en la bodega de materiales, junto a la mezcladora. Ahí tendrán una cinta métrica virtual: midan el largo y el ancho de la losa y la altura de una columna.',
  tiempoLimiteMs: 210000,
  puntosMax: 100,
  alturaBase: -0.2,
  inclinacionInicial: 0.55, // vista algo desde arriba para ver la losa
  alTocarRapido: true,      // medir requiere toques seguidos
  instruccionRA: '📏 Cinta: toquen dos esquinas para medir.',
  referencia: 'Construcción: cuantificación (cubicación) de materiales para presupuesto y pedido de concreto premezclado. El volumen se calcula con las dimensiones de planos y se verifica en sitio; los viajes de mixer se redondean siempre hacia arriba.',

  crearObjeto(THREE) {
    const reto = generarReto();
    retoActual = reto;
    mediciones = [];
    globalThis.__retoConcreto = reto; // diagnóstico (pruebas)
    const { largo, ancho, espesor, lado, altura } = reto;
    const S = ESCALA;

    const g = new THREE.Group();
    const matConcreto = new THREE.MeshStandardMaterial({ color: 0xbfc5cc, roughness: 0.9 });
    const matColumna = new THREE.MeshStandardMaterial({ color: 0xa9b1ba, roughness: 0.9 });

    // Losa (centrada en x, y; sobre las columnas)
    const losa = new THREE.Mesh(new THREE.BoxGeometry(largo * S, ancho * S, Math.max(espesor * S, 0.012)), matConcreto);
    losa.position.z = altura * S + (Math.max(espesor * S, 0.012)) / 2;
    losa.userData.medidas = { hx: (largo * S) / 2, hy: (ancho * S) / 2, hz: Math.max(espesor * S, 0.012) / 2 };
    g.add(losa);
    // 4 columnas en las esquinas (retiradas medio lado hacia adentro)
    const col = Math.max(lado * S, 0.02);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(col, col, altura * S), matColumna);
      c.position.set(sx * ((largo * S) / 2 - col / 2), sy * ((ancho * S) / 2 - col / 2), (altura * S) / 2);
      c.userData.medidas = { hx: col / 2, hy: col / 2, hz: (altura * S) / 2 };
      g.add(c);
    }
    // Piso de referencia
    const piso = new THREE.Mesh(new THREE.BoxGeometry(largo * S + 0.08, ancho * S + 0.08, 0.006), new THREE.MeshStandardMaterial({ color: 0x6b7a5a }));
    piso.position.z = -0.003;
    g.add(piso);

    // Capa de la cinta métrica
    const cinta = new THREE.Group();
    g.add(cinta);
    g.userData.cinta = cinta;
    g.userData.pendiente = null; // primer punto de la medición en curso
    globalThis.__concreto = { objeto: g, losa };
    return g;
  },

  /** Cinta métrica: cada toque ajusta a una esquina; dos toques = una medida. */
  alTocar(objeto, { THREE, golpe }) {
    if (!golpe?.object?.userData?.medidas) return 'Toquen directamente la losa o una columna para medir.';
    const pieza = golpe.object;
    const { hx, hy, hz } = pieza.userData.medidas;
    const local = pieza.worldToLocal(golpe.point.clone());
    const e = esquinaMasCercana(local, hx, hy, hz);
    const punto = pieza.localToWorld(new THREE.Vector3(e.x, e.y, e.z));
    const enObjeto = objeto.worldToLocal(punto.clone()); // en coordenadas del modelo
    const cinta = objeto.userData.cinta;

    const bolita = (p, color) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), new THREE.MeshBasicMaterial({ color }));
      m.position.copy(p);
      cinta.add(m);
    };

    if (!objeto.userData.pendiente) {
      // Primer punto: si ya había 3 medidas dibujadas, limpiar para no saturar
      if (cinta.children.length > 3 * 4) cinta.clear();
      objeto.userData.pendiente = enObjeto;
      bolita(enObjeto, 0xf2a900);
      return 'Punto 1 marcado (esquina). Toquen la otra esquina.';
    }
    const a = objeto.userData.pendiente;
    objeto.userData.pendiente = null;
    bolita(enObjeto, 0xf2a900);
    const geo = new THREE.BufferGeometry().setFromPoints([a, enObjeto]);
    cinta.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf2a900 })));
    const metros = Math.round((a.distanceTo(enObjeto) / ESCALA) * 100) / 100;
    const rotulo = etiqueta(THREE, `${metros.toFixed(2)} m`, { ancho: 0.22, color: '#0b1f3a', fondo: 'rgba(242,169,0,0.95)' });
    rotulo.position.copy(a).add(enObjeto).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 0.04));
    cinta.add(rotulo);
    if (metros > 0) mediciones.push(metros);
    globalThis.__ultimaMedida = metros;
    return `📏 Medida: ${metros.toFixed(2)} m. Sus medidas: ${mediciones.map((m) => m.toFixed(2)).join(' · ')}`;
  },

  montarMinijuego(contenedor, ctx) {
    const demo = !retoActual;
    const reto = retoActual ?? generarReto();
    retoActual = null;
    let intentos = 0;
    let opcion = null;

    contenedor.innerHTML = `
      <h2>Cubicación de concreto</h2>
      ${demo ? `<p class="muted">(Modo demo — medidas del modelo: losa ${reto.largo} × ${reto.ancho} m, columnas de ${reto.altura} m de alto.)</p>` : ''}
      <div class="tarjeta" style="gap:6px">
        <p><strong>Sus medidas en RA:</strong> ${mediciones.length ? mediciones.map((m) => m.toFixed(2) + ' m').join(' · ') : '<span class="muted">(no midieron nada)</span>'}</p>
        <p><strong>De los planos:</strong> espesor de losa <strong>${Math.round(reto.espesor * 100)} cm</strong> ·
        ${N_COLUMNAS} columnas de <strong>${Math.round(reto.lado * 100)} × ${Math.round(reto.lado * 100)} cm</strong></p>
      </div>
      <div class="tarjeta" style="gap:8px">
        <label><strong>1.</strong> Volumen total de concreto (losa + columnas):</label>
        <div id="opciones" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${reto.opciones.map((o) => `<button class="secundario" data-op="${o.id}" style="padding:12px 6px">${o.valor.toLocaleString('es-CR')} m³</button>`).join('')}
        </div>
      </div>
      <div class="tarjeta" style="gap:8px">
        <label><strong>2.</strong> ¿Cuántos viajes de mixer de ${MIXER_M3} m³ hay que pedir?</label>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="secundario" id="menos" style="width:56px">−</button>
          <input id="viajes" type="number" inputmode="numeric" min="0" max="20" value="0" style="text-align:center;font-size:1.4rem" />
          <button class="secundario" id="mas" style="width:56px">+</button>
        </div>
      </div>
      <button id="verificar" disabled>Verificar</button>
      <p id="feedback" class="muted"></p>
    `;
    const $ = (s) => contenedor.querySelector(s);
    const inV = $('#viajes'), btn = $('#verificar'), fb = $('#feedback');
    const listo = () => { btn.disabled = !(opcion && Number(inV.value) > 0); };
    const onOpcion = (ev) => {
      const b = ev.target.closest('[data-op]'); if (!b) return;
      opcion = b.dataset.op;
      $('#opciones').querySelectorAll('[data-op]').forEach((x) => { const s = x.dataset.op === opcion; x.style.background = s ? 'var(--ambar)' : ''; x.style.color = s ? 'var(--azul)' : ''; });
      listo();
    };
    const onMenos = () => { inV.value = Math.max(0, Number(inV.value) - 1); listo(); };
    const onMas = () => { inV.value = Number(inV.value) + 1; listo(); };
    const onVerificar = () => {
      intentos++;
      const r = evaluar(reto, { opcionId: opcion, viajes: inV.value });
      const detalle = { largo: reto.largo, ancho: reto.ancho, espesor: reto.espesor, lado: reto.lado, altura: reto.altura,
        losa: reto.losa, columnas: reto.columnas, total: reto.total, mixer: reto.mixer, viajes: reto.viajes,
        mediciones: [...mediciones], respuestaVolumen: reto.opciones.find((o) => o.id === opcion), respuestaViajes: Number(inV.value), ...r };
      const aciertos = (r.volumenOk ? 1 : 0) + (r.viajesOk ? 1 : 0);
      if (r.correcto) {
        fb.innerHTML = `<span style="color:var(--ok)">¡Correcto! ${reto.total} m³ → ${reto.viajes} viaje(s) de mixer.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: true, aciertos, intentos, detalle }), 1300);
        return;
      }
      const mal = [!r.volumenOk && 'el volumen', !r.viajesOk && 'los viajes'].filter(Boolean);
      if (intentos >= INTENTOS_MAX) {
        fb.innerHTML = `<span style="color:var(--error)">Sin intentos. Revisar: ${mal.join(' y ')}.</span>`;
        btn.disabled = true;
        setTimeout(() => ctx.terminar({ completado: false, aciertos, intentos, detalle }), 2000);
        return;
      }
      fb.innerHTML = `<span style="color:var(--error)">Revisen ${mal.join(' y ')}.</span> Queda 1 intento.`;
      ctx.mostrarAyuda('Pista: V = largo × ancho × espesor + 4 × lado² × altura. Los viajes se redondean hacia arriba.');
    };
    $('#opciones').addEventListener('click', onOpcion);
    $('#menos').addEventListener('click', onMenos);
    $('#mas').addEventListener('click', onMas);
    inV.addEventListener('input', listo);
    btn.addEventListener('click', onVerificar);
    limpiar = () => { btn.removeEventListener('click', onVerificar); };
  },

  explicarSolucion(d) {
    if (d?.total == null) return [];
    return [
      `Medidas: losa ${d.largo} × ${d.ancho} m, columnas de ${d.altura} m. De planos: espesor ${d.espesor} m, columnas ${d.lado} × ${d.lado} m.${d.mediciones?.length ? ` Ustedes midieron: ${d.mediciones.map((m) => m.toFixed(2)).join(', ')} m.` : ''}`,
      `Losa: ${d.largo} × ${d.ancho} × ${d.espesor} = ${d.losa} m³. Columnas: 4 × ${d.lado}² × ${d.altura} = ${d.columnas} m³.`,
      `Total = ${d.total} m³ ${d.volumenOk ? '✓' : '✗' + (d.respuestaVolumen?.error ? ' (' + d.respuestaVolumen.error + ')' : '')}.`,
      `Viajes = ${d.total} ÷ ${d.mixer} = ${(d.total / d.mixer).toFixed(2)} → ${d.viajes} (siempre hacia arriba). Ustedes: ${d.respuestaViajes} ${d.viajesOk ? '✓' : '✗'}.`,
    ];
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  /** Completo: 100 ajustado por tiempo (−20 por segundo intento). Parcial: 40 por parte acertada. */
  calcularPuntaje(resultado, tiempoUsadoMs) {
    if (resultado.completado) {
      const base = puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
      return Math.max(0, base - (resultado.intentos - 1) * 20);
    }
    return 40 * (resultado.aciertos ?? 0);
  },
};

export default estacion;
