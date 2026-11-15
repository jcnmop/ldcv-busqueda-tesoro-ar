/**
 * ESCENA RA: envoltorio de MindAR (image tracking) + Three.js.
 *
 * Decisión: un archivo .mind POR ESTACIÓN (public/marcadores/<marcadorId>.mind).
 * Como el juego sabe cuál es la siguiente estación del equipo, solo carga ese
 * marcador. Un marcador de otra estación simplemente no se reconoce, lo que
 * refuerza la antitrampa sin lógica extra. Ver docs/MARCADORES.md.
 *
 * Uso:
 *   const esc = await crearEscena(contenedor, { marcadorSrc, objeto, onEncontrado, onPerdido });
 *   await esc.iniciar();   // pide permiso de cámara
 *   esc.detener();         // apaga cámara y libera recursos
 */
import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';

export { THREE };

/**
 * ORIENTACIÓN DEL MARCADOR
 *   'pared' (predeterminada): póster vertical en pared/columna. Los objetos se diseñan
 *       "Z arriba" (como sobre una mesa) y aquí se paran sobre el borde inferior del póster,
 *       de frente a quien escanea.
 *   'mesa': marcador acostado en una mesa o el piso; el objeto sale perpendicular al papel.
 */
export async function crearEscena(contenedor, { marcadorSrc, objeto, orientacion = 'pared', onEncontrado, onPerdido }) {
  const mindar = new MindARThree({
    container: contenedor,
    imageTargetSrc: marcadorSrc,
    maxTrack: 1,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
    filterMinCF: 0.0001, // suaviza el temblor del anclaje
    filterBeta: 0.001,
  });

  const { renderer, scene, camera } = mindar;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Luz básica para materiales estándar. Los .glb con materiales sin luz (unlit) la ignoran.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 2, 3);
  scene.add(dir);

  const ancla = mindar.addAnchor(0);
  // Jerarquía: ancla → soporte (orientación pared/mesa) → manipulador (gestos) → objeto
  const manipulador = new THREE.Group();
  if (objeto) {
    const soporte = new THREE.Group();
    if (orientacion === 'pared') {
      soporte.rotation.x = -Math.PI / 2; // diseño Z-arriba → arriba del póster (+Y)
      soporte.position.set(0, -0.38, 0.12); // apoyado cerca del borde inferior, un poco al frente
    }
    manipulador.add(objeto);
    soporte.add(manipulador);
    ancla.group.add(soporte);
  }
  let visible = false;
  ancla.onTargetFound = () => {
    visible = true;
    // Cualquier parte del objeto puede reaccionar a la aparición (ej: animación "Wave")
    ancla.group.traverse((o) => o.userData?.alEncontrar?.());
    onEncontrado?.();
  };
  ancla.onTargetLost = () => { visible = false; onPerdido?.(); };

  let animaciones = [];
  let activo = false;

  // Animaciones genéricas de cualquier objeto bajo el ancla:
  //   userData.actualizar(dt)  → mixers de .glb animados (ver ar/modelos.js)
  //   userData.efecto(dt)      → efectos temporales (rebote al tocar)
  //   userData.girar = rad/s   → rotación continua sobre Z
  const animarObjetos = (dt) => {
    ancla.group.traverse((o) => {
      const u = o.userData;
      if (!u) return;
      u.actualizar?.(dt);
      u.efecto?.(dt);
      if (u.girar) o.rotation.z += u.girar * dt;
    });
  };

  // ---- Interacción: toques y gestos ----
  //   1 dedo arrastrando  → girar el objeto sobre su eje vertical
  //   2 dedos pellizcando → escalar (0.5× a 2.5×)
  //   toque corto         → raycast: 'coleccionable' (userData.coleccionable en un ancestro) u 'objeto'
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let oyentesToque = [];
  const punteros = new Map(); // pointerId → {x, y, x0, y0, t0}
  let pellizcoInicial = null;

  const aNDC = (x, y) => {
    // El canvas de MindAR puede ser más grande que la pantalla (recorte): usar su rectángulo real
    const r = renderer.domElement.getBoundingClientRect();
    puntero.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    return puntero;
  };

  const rectPantalla = (obj, margen) => {
    const caja = new THREE.Box3().setFromObject(obj);
    if (caja.isEmpty()) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) {
      const v = new THREE.Vector3(x, y, z).project(camera);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    const mx = Math.max((maxX - minX) * margen, 0.04), my = Math.max((maxY - minY) * margen, 0.04);
    return { minX: minX - mx, maxX: maxX + mx, minY: minY - my, maxY: maxY + my };
  };
  const dentro = (p, r) => r && p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY;

  const coleccionableDe = (o) => { while (o) { if (o.userData?.coleccionable) return o; o = o.parent; } return null; };

  function resolverToque(x, y) {
    const p = aNDC(x, y);
    raycaster.setFromCamera(p, camera);
    const golpes = raycaster.intersectObject(ancla.group, true);
    for (const g of golpes) {
      const c = coleccionableDe(g.object);
      if (c) return emitir('coleccionable', g, c);
    }
    // Tolerancia para dedos, en orden de prioridad:
    //   1. cerca de la pieza (margen chico)  2. golpe directo al objeto
    //   3. dentro de la silueta del objeto   4. cerca de la pieza (margen amplio)
    const coleccionables = [];
    ancla.group.traverse((o) => { if (o.userData?.coleccionable && o.visible) coleccionables.push(o); });
    for (const c of coleccionables) if (dentro(p, rectPantalla(c, 0.25))) return emitir('coleccionable', null, c);
    if (golpes.length) return emitir('objeto', golpes[0], golpes[0].object);
    const objetos = manipulador.children[0]?.children.filter((o) => !o.userData?.coleccionable) ?? [];
    for (const o of objetos) if (dentro(p, rectPantalla(o, 0.1))) return emitir('objeto', null, o);
    for (const c of coleccionables) if (dentro(p, rectPantalla(c, 0.6))) return emitir('coleccionable', null, c);
  }
  const emitir = (tipo, golpe, obj) => oyentesToque.forEach((fn) => fn(tipo, golpe, obj));

  const alBajar = (ev) => {
    if (!visible || ev.target.closest?.('.overlay-ar')) return; // botones del panel no cuentan
    punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: performance.now() });
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      pellizcoInicial = { d: Math.hypot(a.x - b.x, a.y - b.y), escala: manipulador.scale.x };
    }
  };
  const alMover = (ev) => {
    const p = punteros.get(ev.pointerId);
    if (!p) return;
    const dx = ev.clientX - p.x;
    p.x = ev.clientX; p.y = ev.clientY;
    if (punteros.size === 1) {
      manipulador.rotation.z += dx * 0.012; // girar sobre el eje vertical del objeto
    } else if (punteros.size === 2 && pellizcoInicial) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = Math.min(2.5, Math.max(0.5, pellizcoInicial.escala * (d / pellizcoInicial.d)));
      manipulador.scale.setScalar(s);
    }
  };
  const alSubir = (ev) => {
    const p = punteros.get(ev.pointerId);
    if (!p) return;
    const fueToque = punteros.size === 1 && !pellizcoInicial
      && Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0) < 12 && performance.now() - p.t0 < 600;
    punteros.delete(ev.pointerId);
    if (punteros.size < 2) pellizcoInicial = null;
    if (fueToque && visible && oyentesToque.length) resolverToque(ev.clientX, ev.clientY);
  };
  contenedor.addEventListener('pointerdown', alBajar);
  contenedor.addEventListener('pointermove', alMover);
  contenedor.addEventListener('pointerup', alSubir);
  contenedor.addEventListener('pointercancel', alSubir);

  // Gancho para pruebas automáticas y depuración (proyectar el objeto a pantalla)
  globalThis.__escenaRA = { THREE, camera, renderer, ancla, manipulador, estaVisible: () => visible };

  return {
    scene,
    camera,
    ancla,
    /** Registra una función (dt en segundos) que corre en cada cuadro. */
    enCadaCuadro(fn) { animaciones.push(fn); return () => { animaciones = animaciones.filter((f) => f !== fn); }; },
    manipulador,
    /** Registra fn(tipo, intersección|null, objeto|null); tipo = 'coleccionable' | 'objeto'. */
    alTocar(fn) { oyentesToque.push(fn); return () => { oyentesToque = oyentesToque.filter((f) => f !== fn); }; },
    async iniciar() {
      await mindar.start();
      activo = true;
      const reloj = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = Math.min(reloj.getDelta(), 0.1);
        animarObjetos(dt);
        for (const fn of animaciones) fn(dt);
        renderer.render(scene, camera);
      });
    },
    detener() {
      if (!activo) return;
      activo = false;
      contenedor.removeEventListener('pointerdown', alBajar);
      contenedor.removeEventListener('pointermove', alMover);
      contenedor.removeEventListener('pointerup', alSubir);
      contenedor.removeEventListener('pointercancel', alSubir);
      oyentesToque = [];
      delete globalThis.__escenaRA;
      renderer.setAnimationLoop(null);
      mindar.stop();
      // Liberar GPU: geometrías y materiales del objeto
      ancla.group.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { m?.map?.dispose?.(); m?.dispose?.(); });
      });
      renderer.dispose();
      contenedor.innerHTML = '';
    },
  };
}
