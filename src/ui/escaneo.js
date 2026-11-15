import { h } from '../core/router.js';
import { estacionActual, completar } from '../core/estado.js';
import { piezaDeEstacion } from '../core/puente.js';
import { pantallaPista } from './pista.js';
import { pantallaResultado } from './resultado.js';

/**
 * Pantalla de escaneo: enciende la cámara, espera el marcador de la estación actual,
 * muestra el objeto 3D y el botón "Jugar", y corre el minijuego.
 */
export function pantallaEscaneo(raiz, ctx) {
  const { almacen, porId, ir } = ctx;
  const estado = almacen.get();
  const est = porId[estacionActual(estado)];
  if (!est) return ir(pantallaPista);

  const arContainer = document.getElementById('ar-container');
  const mjContainer = document.getElementById('minijuego');

  raiz.innerHTML = h`
    <h1>${est.nombre}</h1>
    <p class="muted">Iniciando cámara…</p>
  `;

  arContainer.hidden = false;
  arContainer.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'overlay-ar';
  overlay.innerHTML = h`
    <p id="ar-msg">Apunte la cámara al marcador de la estación.</p>
    <button id="jugar" hidden>Jugar</button>
    <button id="volver" class="secundario">Volver</button>
  `;
  arContainer.appendChild(overlay);
  const msg = overlay.querySelector('#ar-msg');
  const btnJugar = overlay.querySelector('#jugar');
  const btnVolver = overlay.querySelector('#volver');

  let escena = null;
  let cancelado = false;
  let temporizadorAyuda = null;
  let temporizadorLimite = null;
  let tocado = false;

  const limpiar = () => {
    cancelado = true;
    clearTimeout(temporizadorAyuda);
    clearTimeout(temporizadorLimite);
    escena?.detener();
    escena = null;
    try { est.desmontar(); } catch (e) { console.warn('desmontar:', e); }
    arContainer.hidden = true;
    arContainer.innerHTML = '';
    mjContainer.hidden = true;
    mjContainer.innerHTML = '';
  };

  btnVolver.addEventListener('click', () => { limpiar(); ir(pantallaPista); });

  // Pista si no reconoce nada en 12 s (probablemente no es la estación correcta)
  temporizadorAyuda = setTimeout(() => {
    if (btnJugar.hidden) {
      msg.innerHTML = h`No se reconoce el marcador. Revise que estén en el lugar correcto: <em>${est.pista}</em>.
      Acérquese a 30–60 cm, con el marcador bien iluminado.`;
    }
  }, 12000);

  // MODO DEMO (?demo en la URL): sin cámara ni marcador, para probar minijuegos en una
  // computadora o verificar estaciones antes del evento. No usar el día de la competencia.
  const modoDemo = new URLSearchParams(location.search).has('demo');
  if (modoDemo) {
    clearTimeout(temporizadorAyuda);
    arContainer.style.background = '#1e3a5f';
    msg.innerHTML = h`<strong>Modo demo</strong>: se omite la cámara. Estación: ${est.nombre}.`;
    btnJugar.hidden = false;
  }

  if (!modoDemo) (async () => {
    try {
      const { crearEscena, THREE } = await import('../ar/escena.js');
      const { rebote } = await import('../ar/modelos.js');
      const { piezaMini } = await import('./puente3d.js');
      const objeto = est.crearObjeto(THREE);

      // Pieza del puente que corresponde a esta estación: flota frente al objeto y hay que atraparla
      const pieza = piezaDeEstacion(estado, est.id);
      const coleccionable = piezaMini(THREE, pieza?.id);
      const conjunto = new THREE.Group();
      conjunto.add(objeto, coleccionable);

      escena = await crearEscena(arContainer, {
        marcadorSrc: `${import.meta.env.BASE_URL}marcadores/${est.marcadorId}.mind`,
        objeto: conjunto,
        orientacion: est.orientacion ?? 'pared',
        onEncontrado() {
          if (tocado) return;
          msg.innerHTML = '<strong>¡Lo encontraron!</strong> Elijan Girar o Mover y usen un dedo; con dos, acerquen. '
            + '<strong>Atrapen la pieza dorada</strong> para empezar el reto.';
          btnJugar.hidden = false; // alternativa accesible
          navigator.vibrate?.(30);
        },
        onPerdido() { /* el botón sigue disponible: ya probaron que están ahí */ },
      });

      // Órbita de la pieza: siempre por delante del póster (diseño: -Y = hacia el jugador)
      let t = 0;
      let atrapada = false;
      escena.enCadaCuadro((dt) => {
        if (atrapada) return;
        t += dt;
        coleccionable.position.set(0.3 * Math.sin(t * 0.9), -0.28 - 0.08 * Math.cos(t * 0.9), 0.62 + 0.06 * Math.sin(t * 2.3));
      });

      const { montarControlesRA } = await import('./controles-ra.js');
      montarControlesRA(overlay, escena);

      let ultimoToque = 0;
      escena.alTocar((tipo) => {
        globalThis.__ultimoToque = tipo; // diagnóstico (pruebas)
        if (tocado) return;
        if (tipo === 'coleccionable') {
          tocado = true;
          atrapada = true;
          navigator.vibrate?.([30, 50, 60]);
          msg.innerHTML = pieza
            ? h`<strong>¡Atraparon: ${pieza.nombre}!</strong> Superen el reto para colocarla en su puente.`
            : '<strong>¡Atrapada!</strong> Preparando el reto…';
          // Animación: la pieza crece, sube y se acerca al jugador
          const p0 = coleccionable.position.clone();
          let ta = 0;
          coleccionable.userData.efecto = (dt) => {
            ta += dt;
            const k = Math.min(ta / 0.8, 1);
            coleccionable.scale.setScalar(1 + 1.6 * k);
            coleccionable.position.set(p0.x * (1 - k), p0.y - 0.5 * k, p0.z + 0.3 * k);
            if (k >= 1) { coleccionable.visible = false; coleccionable.userData.efecto = null; }
          };
          setTimeout(() => { if (!cancelado) iniciarMinijuego(); }, 1500);
          return;
        }
        // Tocar el objeto: solo reacciona (la estación decide cómo; si no, rebota)
        const ahora = performance.now();
        if (ahora - ultimoToque < 350) return;
        ultimoToque = ahora;
        navigator.vibrate?.(15);
        try { if (est.alTocar) est.alTocar(objeto, { THREE }); else rebote(objeto); } catch (e) { console.warn('alTocar:', e); }
      });
      if (cancelado) return;
      await escena.iniciar();
      // Mover el overlay por encima del canvas que MindAR acaba de insertar
      arContainer.appendChild(overlay);
    } catch (err) {
      console.error(err);
      msg.innerHTML = h`No se pudo iniciar la cámara: ${err?.message ?? err}. Verifique el permiso de cámara
      y que la página se abra con <strong>https</strong>.`;
    }
  })();

  btnJugar.addEventListener('click', () => { tocado = true; iniciarMinijuego(); });

  let minijuegoIniciado = false;
  function iniciarMinijuego() {
    if (minijuegoIniciado) return;
    minijuegoIniciado = true;
    btnJugar.hidden = true;
    escena?.detener(); // apagar cámara: ahorra batería durante el minijuego
    escena = null;
    arContainer.hidden = true;

    const inicioMs = Date.now();
    let terminado = false;
    mjContainer.hidden = false;
    mjContainer.innerHTML = '';

    const cabecera = document.createElement('div');
    cabecera.className = 'muted';
    cabecera.innerHTML = h`<span id="cronometro">${Math.round(est.tiempoLimiteMs / 1000)}</span> s restantes`;
    mjContainer.appendChild(cabecera);
    const cuerpo = document.createElement('div');
    cuerpo.style.cssText = 'display:flex;flex-direction:column;gap:16px;flex:1';
    mjContainer.appendChild(cuerpo);
    const ayuda = document.createElement('p');
    ayuda.className = 'muted';
    mjContainer.appendChild(ayuda);

    const crono = cabecera.querySelector('#cronometro');
    const tic = setInterval(() => {
      const rest = Math.max(0, Math.round((est.tiempoLimiteMs - (Date.now() - inicioMs)) / 1000));
      crono.textContent = rest;
    }, 500);

    const finalizar = (resultado) => {
      if (terminado) return;
      terminado = true;
      clearInterval(tic);
      clearTimeout(temporizadorLimite);
      const finMs = Date.now();
      const tiempoUsado = finMs - inicioMs;
      let puntos = 0;
      try { puntos = Math.max(0, Math.min(est.puntosMax, est.calcularPuntaje(resultado, tiempoUsado))); } catch (e) { console.warn(e); }
      try { est.desmontar(); } catch (e) { console.warn('desmontar:', e); }
      mjContainer.hidden = true;
      mjContainer.innerHTML = '';
      almacen.set(completar(almacen.get(), {
        estacionId: est.id, puntos, inicioMs, finMs,
        completado: !!resultado.completado, detalle: resultado.detalle,
      }));
      ir(pantallaResultado, { estacion: est, puntos, tiempoUsado, resultado });
    };

    temporizadorLimite = setTimeout(() => finalizar({ completado: false, aciertos: 0, intentos: 0, detalle: { motivo: 'tiempo' } }), est.tiempoLimiteMs);

    try {
      est.montarMinijuego(cuerpo, {
        equipoId: estado.equipoId,
        estacionId: est.id,
        tiempoLimiteMs: est.tiempoLimiteMs,
        terminar: finalizar,
        mostrarAyuda: (t) => { ayuda.textContent = t; },
      });
    } catch (err) {
      console.error(err);
      finalizar({ completado: false, aciertos: 0, intentos: 0, detalle: { motivo: 'error', error: String(err) } });
    }
  }

  return limpiar;
}
