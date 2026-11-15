import { h } from '../core/router.js';
import { piezasDelEquipo, puenteCompleto, PIEZAS } from '../core/puente.js';

/** marcadorId del póster de la meta (mesa del LDCV). Ver tools/marcadores.js. */
export const MARCADOR_META = 'meta';

/**
 * PUENTE EN RA: el equipo escanea el póster META y ve su propio puente sobre él,
 * con las piezas cayendo en orden. Puede girarlo, acercarlo y tocar cada pieza
 * para leer qué función cumple. Si el puente está completo, hay celebración.
 */
export function pantallaPuenteRA(raiz, { almacen, ir, params }) {
  const estado = almacen.get();
  const estados = piezasDelEquipo(estado);
  const completo = puenteCompleto(estado);
  const volver = params?.volver;

  const arContainer = document.getElementById('ar-container');
  raiz.innerHTML = h`<h1>Su puente en RA</h1><p class="muted">Iniciando cámara…</p>`;
  arContainer.hidden = false;
  arContainer.innerHTML = '';
  const overlay = document.createElement('div');
  overlay.className = 'overlay-ar';
  overlay.innerHTML = h`
    <p id="ar-msg">Apunten la cámara al póster <strong>META</strong> en la mesa del LDCV.</p>
    <button id="volver" class="secundario">Volver</button>
  `;
  arContainer.appendChild(overlay);
  const msg = overlay.querySelector('#ar-msg');

  let escena = null;
  let cancelado = false;
  let destruirVisor = null;
  const limpiar = () => {
    cancelado = true;
    destruirVisor?.();
    escena?.detener();
    escena = null;
    arContainer.hidden = true;
    arContainer.innerHTML = '';
  };
  overlay.querySelector('#volver').addEventListener('click', () => { limpiar(); if (volver) ir(volver); });

  const modoDemo = new URLSearchParams(location.search).has('demo');
  if (modoDemo) {
    // Sin cámara: mostrar el visor 3D normal a pantalla completa
    arContainer.style.background = '#0b1f3a';
    msg.innerHTML = '<strong>Modo demo</strong>: puente sin cámara.';
    const cont = document.createElement('div');
    cont.id = 'puente';
    cont.style.cssText = 'position:absolute;top:10%;left:0;right:0;max-width:520px;margin:0 auto';
    arContainer.insertBefore(cont, overlay);
    import('./puente3d.js').then(({ montarPuente }) => montarPuente(cont, { estados, secuencial: true, alto: 360 }))
      .then((d) => { if (cancelado) d(); else destruirVisor = d; });
    return limpiar;
  }

  (async () => {
    try {
      const { crearEscena, THREE } = await import('../ar/escena.js');
      const { construirPuenteEquipo } = await import('./puente3d.js');

      // Puente: Y arriba → Z arriba (diseño de la escena), largo 5.6 → ~1.15 unidades de marcador
      const { grupo, animar } = construirPuenteEquipo(THREE, estados, { secuencial: true });
      const puente = new THREE.Group();
      grupo.rotation.x = Math.PI / 2;
      puente.add(grupo);
      puente.scale.setScalar(0.2);

      // Agua bajo el puente para dar contexto
      const agua = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1e88e5, transparent: true, opacity: 0.55 }),
      );
      puente.add(agua);

      // Celebración: confeti si el puente está completo
      const confeti = new THREE.Group();
      if (completo) {
        const colores = [0xf2a900, 0x2e9e5b, 0x1e88e5, 0xd0453c, 0xffffff];
        for (let i = 0; i < 60; i++) {
          const c = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.04),
            new THREE.MeshBasicMaterial({ color: colores[i % colores.length], side: THREE.DoubleSide }));
          c.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.6);
          c.position.set(0, 0, 0.3);
          confeti.add(c);
        }
        confeti.visible = false;
      }
      const conjunto = new THREE.Group();
      conjunto.add(puente, confeti);

      let encontrado = false;
      escena = await crearEscena(arContainer, {
        marcadorSrc: `${import.meta.env.BASE_URL}marcadores/${MARCADOR_META}.mind`,
        objeto: conjunto,
        orientacion: 'pared',
        onEncontrado() {
          encontrado = true;
          const n = estados.filter((e) => e.estado === 'obtenida').length;
          msg.innerHTML = completo
            ? '<strong>¡Puente completo!</strong> Muévanlo con un dedo, giren y acerquen con dos, y toquen una pieza para ver su función.'
            : h`<strong>Su puente: ${n} de ${estados.length} piezas.</strong> Las rojas son retos no superados. Toquen una pieza para ver su función.`;
          if (completo) setTimeout(() => { confeti.visible = true; }, 2600);
          navigator.vibrate?.(30);
        },
      });

      let tConfeti = 0;
      escena.enCadaCuadro((dt) => {
        if (!encontrado) return;
        animar(dt);
        if (confeti.visible) {
          tConfeti += dt;
          for (const c of confeti.children) {
            c.userData.v.z -= 0.9 * dt; // gravedad
            c.position.addScaledVector(c.userData.v, dt);
            c.rotation.x += dt * 6; c.rotation.y += dt * 4;
            if (c.position.z < -0.1) { c.position.set(0, 0, 0.3); c.userData.v.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.6); }
          }
          if (tConfeti > 6) confeti.visible = false;
        }
      });

      // Tocar una pieza: mostrar su nombre y función
      escena.alTocar((tipo, golpe) => {
        let o = golpe?.object;
        while (o && !o.userData?.piezaId) o = o.parent;
        if (!o) return;
        const pieza = PIEZAS.find((p) => p.id === o.userData.piezaId);
        const e = estados.find((x) => x.pieza.id === pieza?.id);
        if (!pieza) return;
        const estadoTxt = e?.estado === 'obtenida' ? '✓ ganada' : e?.estado === 'perdida' ? '✗ perdida' : 'pendiente';
        msg.innerHTML = h`<strong>${pieza.nombre}</strong> (${estadoTxt}): ${pieza.descripcion}`;
        navigator.vibrate?.(15);
      });

      if (cancelado) return;
      await escena.iniciar();
      arContainer.appendChild(overlay);
    } catch (err) {
      console.error(err);
      msg.innerHTML = h`No se pudo iniciar la cámara: ${err?.message ?? err}.`;
    }
  })();

  return limpiar;
}
