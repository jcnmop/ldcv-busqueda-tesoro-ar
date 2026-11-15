/**
 * ESTACIÓN: Ojo de Ingeniero
 * Hereda la actividad "Ojo de Ingeniero contra Instrumentos" de la competencia anterior.
 * El equipo estima a ojo una magnitud REAL del lugar (altura de un edificio, luz de una
 * viga, ancho de una calle) y el puntaje depende del error porcentual.
 *
 * CONFIGURAR antes del evento: `MAGNITUDES` con valores medidos por el LDCV
 * (con el P40 o el BLK360, lo que da autoridad a la respuesta).
 */
import { etiqueta, cargarGLB } from '../../ar/modelos.js';
import { MOSTRAR_RESPUESTAS } from '../../config.js';

// TODO (organizador): reemplazar por magnitudes medidas en los puntos reales.
const MAGNITUDES = [
  { que: 'la altura total del edificio de Ingeniería Civil, del piso al remate', unidad: 'm', real: 14.2, min: 5, max: 30, paso: 0.1 },
  { que: 'la luz libre entre las dos columnas marcadas con cinta', unidad: 'm', real: 7.6, min: 2, max: 15, paso: 0.1 },
  { que: 'la altura de la columna frente a ustedes', unidad: 'm', real: 3.4, min: 1, max: 8, paso: 0.05 },
];

let limpiar = () => {};

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'ojo-ingeniero',
  nombre: 'Ojo de Ingeniero',
  marcadorId: 'ojo-ingeniero',
  pista: 'Frente a la fachada principal, en la baranda de la rampa.',
  tiempoLimiteMs: 90000,
  puntosMax: 100,

  crearObjeto(THREE) {
    const g = new THREE.Group();
    // Personaje animado (prueba): robot CC0 de los ejemplos de three.js. Saluda al aparecer.
    const robot = cargarGLB(THREE, `${import.meta.env.BASE_URL}modelos/robot.glb`, {
      altura: 0.8, animacion: 'Idle', entrada: 'Wave',
    });
    robot.position.x = 0.12;
    g.add(robot);
    g.userData.robot = robot;

    // Mira topográfica (estadal con franjas) a la izquierda del robot
    const mira = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const franja = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.03, 0.1),
        new THREE.MeshStandardMaterial({ color: i % 2 ? 0xd0453c : 0xf7f7f5 }),
      );
      franja.position.z = 0.05 + i * 0.1;
      mira.add(franja);
    }
    mira.position.x = -0.32;
    g.add(mira);

    const cartel = etiqueta(THREE, '¿Cuánto mide?', { ancho: 0.55 });
    cartel.position.set(0, 0, 1.05);
    g.add(cartel);
    return g;
  },

  /** Al tocar el robot: cambia de animación en cada toque (la pieza dorada abre el reto). */
  alTocar(objeto) {
    const robot = objeto.userData.robot;
    const lista = ['Jump', 'ThumbsUp', 'Dance', 'Yes', 'Wave', 'Punch'];
    const i = (objeto.userData.toques = (objeto.userData.toques ?? -1) + 1) % lista.length;
    robot?.userData.reproducir?.(lista[i], { unaVez: true });
  },

  montarMinijuego(contenedor, ctx) {
    const m = MAGNITUDES[Math.floor(Math.random() * MAGNITUDES.length)];
    contenedor.innerHTML = `
      <h2>Ojo de Ingeniero</h2>
      <p>Sin instrumentos, solo a ojo: estimen <strong>${m.que}</strong>.</p>
      <p style="font-size:2.4rem;font-weight:700;text-align:center"><span id="val">${((m.min + m.max) / 2).toFixed(m.paso < 0.1 ? 2 : 1)}</span> <span class="muted" style="font-size:1.2rem">${m.unidad}</span></p>
      <input id="est" type="range" min="${m.min}" max="${m.max}" step="${m.paso}" value="${(m.min + m.max) / 2}" />
      <p class="muted">Pueden discutirlo en equipo; cuenta el tiempo.</p>
      <button id="responder">Responder</button>
      <p id="feedback" class="muted"></p>
    `;
    const slider = contenedor.querySelector('#est');
    const val = contenedor.querySelector('#val');
    const btn = contenedor.querySelector('#responder');
    const fb = contenedor.querySelector('#feedback');
    const onInput = () => { val.textContent = (+slider.value).toFixed(m.paso < 0.1 ? 2 : 1); };
    const onResponder = () => {
      const estimado = +slider.value;
      const errorPct = Math.abs(estimado - m.real) / m.real * 100;
      btn.disabled = true;
      fb.innerHTML = MOSTRAR_RESPUESTAS === 'siempre'
        ? `Valor medido por el LDCV: <strong>${m.real} ${m.unidad}</strong>. Error: <strong>${errorPct.toFixed(1)} %</strong>.`
        : `Error de su estimación: <strong>${errorPct.toFixed(1)} %</strong>. El valor real se revela al final del recorrido.`;
      setTimeout(() => ctx.terminar({ completado: errorPct <= 30, aciertos: errorPct <= 10 ? 1 : 0, intentos: 1, detalle: { que: m.que, real: m.real, unidad: m.unidad, estimado, errorPct } }), 2200);
    };
    slider.addEventListener('input', onInput);
    btn.addEventListener('click', onResponder);
    limpiar = () => { slider.removeEventListener('input', onInput); btn.removeEventListener('click', onResponder); };
  },

  explicarSolucion(d) {
    if (d?.real == null) return [];
    return [
      `Había que estimar ${d.que}.`,
      `Valor medido por el LDCV: ${d.real} ${d.unidad ?? 'm'}. Ustedes estimaron ${Number(d.estimado).toFixed(2)} ${d.unidad ?? 'm'} (error ${d.errorPct.toFixed(1)} %).`,
      'Puntaje: 100 con error 0 %, baja linealmente hasta 0 con 30 % de error.',
    ];
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  /** 100 pts con 0 % de error; 0 pts a partir de 30 % de error. El tiempo no cuenta aquí. */
  calcularPuntaje(resultado) {
    const e = resultado.detalle?.errorPct;
    if (e == null) return 0;
    return Math.round(Math.max(0, estacion.puntosMax * (1 - e / 30)));
  },
};

export default estacion;
