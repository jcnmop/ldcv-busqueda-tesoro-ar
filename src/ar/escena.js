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
/**
 * ESTABILIDAD ('normal' | 'alta'): el objeto no cuelga directamente del ancla de MindAR sino
 * de un "seguidor" que la persigue con suavizado exponencial y una zona muerta que ignora
 * microvibraciones. Si el marcador se pierde un instante, el objeto se queda quieto
 * `gracia` segundos en vez de desaparecer. 'alta' suaviza más (objetos grandes, ej. el puente).
 */
const PERFILES_ESTABILIDAD = {
  normal: { k: 14, zonaMuerta: 0.004, angMuerto: 0.006, gracia: 0.8 },
  alta: { k: 6, zonaMuerta: 0.008, angMuerto: 0.012, gracia: 1.5 },
};

export async function crearEscena(contenedor, { marcadorSrc, objeto, orientacion = 'pared', estabilidad = 'normal', alturaBase = -0.38, onEncontrado, onPerdido }) {
  const perfil = PERFILES_ESTABILIDAD[estabilidad] ?? PERFILES_ESTABILIDAD.normal;
  const mindar = new MindARThree({
    container: contenedor,
    imageTargetSrc: marcadorSrc,
    maxTrack: 1,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
    filterMinCF: 0.0001, // suaviza el temblor del anclaje (filtro One Euro de MindAR)
    filterBeta: 0.001,
    missTolerance: 10,   // cuadros sin ver el marcador antes de darlo por perdido (menos parpadeo)
    warmupTolerance: 3,
  });

  const { renderer, scene, camera } = mindar;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Luz básica para materiales estándar. Los .glb con materiales sin luz (unlit) la ignoran.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(1, 2, 3);
  scene.add(dir);

  const ancla = mindar.addAnchor(0);
  // Jerarquía: seguidor (persigue al ancla, suavizado) → soporte (pared/mesa) → manipulador (gestos) → objeto
  const seguidor = new THREE.Group();
  seguidor.matrixAutoUpdate = true;
  seguidor.visible = false;
  scene.add(seguidor);
  const manipulador = new THREE.Group();
  if (objeto) {
    const soporte = new THREE.Group();
    if (orientacion === 'pared') {
      soporte.rotation.x = -Math.PI / 2; // diseño Z-arriba → arriba del póster (+Y)
      soporte.position.set(0, alturaBase, 0.12); // por defecto apoyado cerca del borde inferior, un poco al frente
    }
    manipulador.add(objeto);
    soporte.add(manipulador);
    seguidor.add(soporte);
  }
  let visible = false;
  ancla.onTargetFound = () => {
    visible = true;
    // Cualquier parte del objeto puede reaccionar a la aparición (ej: animación "Wave")
    seguidor.traverse((o) => o.userData?.alEncontrar?.());
    onEncontrado?.();
  };
  ancla.onTargetLost = () => { visible = false; perdidoDesde = performance.now(); onPerdido?.(); };

  // ---- Estabilizador: el seguidor persigue la pose del ancla ----
  let perdidoDesde = 0;
  let primeraPose = true;
  const pObj = new THREE.Vector3(), qObj = new THREE.Quaternion(), eObj = new THREE.Vector3();
  function estabilizar(dt) {
    if (visible) {
      ancla.group.updateMatrixWorld(true);
      ancla.group.matrixWorld.decompose(pObj, qObj, eObj);
      if (primeraPose) {
        seguidor.position.copy(pObj); seguidor.quaternion.copy(qObj); seguidor.scale.copy(eObj);
        primeraPose = false;
      } else {
        const escalaRef = Math.max(eObj.x, 1e-6);
        const dist = seguidor.position.distanceTo(pObj) / escalaRef; // en unidades de marcador
        const ang = seguidor.quaternion.angleTo(qObj);
        // Zona muerta: si el cambio es mínimo, es ruido del seguimiento → no mover
        if (dist > perfil.zonaMuerta || ang > perfil.angMuerto) {
          const a = 1 - Math.exp(-perfil.k * dt);
          seguidor.position.lerp(pObj, a);
          seguidor.quaternion.slerp(qObj, a);
          seguidor.scale.lerp(eObj, a);
        }
      }
      seguidor.visible = true;
    } else if (seguidor.visible && performance.now() - perdidoDesde > perfil.gracia * 1000) {
      seguidor.visible = false;
      primeraPose = true; // al reaparecer, saltar directo a la nueva pose
    }
  }

  let animaciones = [];
  let activo = false;

  // Animaciones genéricas de cualquier objeto bajo el ancla:
  //   userData.actualizar(dt)  → mixers de .glb animados (ver ar/modelos.js)
  //   userData.efecto(dt)      → efectos temporales (rebote al tocar)
  //   userData.girar = rad/s   → rotación continua sobre Z
  const animarObjetos = (dt) => {
    seguidor.traverse((o) => {
      const u = o.userData;
      if (!u) return;
      u.actualizar?.(dt);
      u.efecto?.(dt);
      if (u.girar) o.rotation.z += u.girar * dt;
    });
  };

  // ---- Interacción: toques y gestos ----
  //   1 dedo, modo 'mover'    → MOVER el objeto en el plano del póster (arriba/abajo/izq/der)
  //   1 dedo, modo 'girar'    → horizontal: girar sobre su eje vertical; vertical: inclinar (±60°)
  //   2 dedos (girar muñeca)  → GIRAR el objeto sobre su eje vertical
  //   2 dedos (pellizco)      → ESCALAR (0.5× a 2.5×)
  //   doble toque             → volver a la posición, giro y tamaño originales
  //   toque corto             → raycast: 'coleccionable' (userData.coleccionable en un ancestro) u 'objeto'
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
    const golpes = raycaster.intersectObject(seguidor, true);
    for (const g of golpes) {
      const c = coleccionableDe(g.object);
      if (c) { globalThis.__ramaToque = 'golpe-pieza'; return emitir('coleccionable', g, c); }
    }
    // Tolerancia para dedos, en orden de prioridad:
    //   1. cerca de la pieza (margen chico)  2. golpe directo al objeto
    //   3. dentro de la silueta del objeto   4. cerca de la pieza (margen amplio)
    const coleccionables = [];
    seguidor.traverse((o) => { if (o.userData?.coleccionable && o.visible) coleccionables.push(o); });
    // (globalThis.__ramaToque: diagnóstico de qué regla decidió el toque)
    for (const c of coleccionables) if (dentro(p, rectPantalla(c, 0.1))) { globalThis.__ramaToque = 'cerca-pieza'; return emitir('coleccionable', null, c); }
    if (golpes.length) { globalThis.__ramaToque = 'golpe-objeto'; return emitir('objeto', golpes[0], golpes[0].object); }
    const objetos = manipulador.children[0]?.children.filter((o) => !o.userData?.coleccionable) ?? [];
    for (const o of objetos) if (dentro(p, rectPantalla(o, 0.1))) { globalThis.__ramaToque = 'silueta-objeto'; return emitir('objeto', null, o); }
    for (const c of coleccionables) if (dentro(p, rectPantalla(c, 0.4))) { globalThis.__ramaToque = 'zona-pieza'; return emitir('coleccionable', null, c); }
    globalThis.__ramaToque = 'nada';
  }
  const emitir = (tipo, golpe, obj) => oyentesToque.forEach((fn) => fn(tipo, golpe, obj));

  const alBajar = (ev) => {
    if (!visible || ev.target.closest?.('.overlay-ar')) return; // botones del panel no cuentan
    punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: performance.now() });
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      pellizcoInicial = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), escala: manipulador.scale.x, giro: manipulador.rotation.z };
    }
  };

  // Convierte un desplazamiento en píxeles a unidades del plano del póster (ejes X y "arriba"
  // del soporte), proyectando los ejes a pantalla y resolviendo el sistema 2×2.
  const vArriba = new THREE.Vector3(0, 0, 1); // diseño Z-arriba (en 'mesa' se usa Y)
  function pixelesAPlano(dx, dy) {
    const soporte = manipulador.parent;
    const r = renderer.domElement.getBoundingClientRect();
    const aPx = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * r.width, (1 - p.y) / 2 * r.height]; };
    const o = soporte.localToWorld(manipulador.position.clone());
    const ex = soporte.localToWorld(manipulador.position.clone().add(new THREE.Vector3(1, 0, 0)));
    const eu = soporte.localToWorld(manipulador.position.clone().add(orientacion === 'pared' ? vArriba : new THREE.Vector3(0, 1, 0)));
    const [ox, oy] = aPx(o), [xx, xy] = aPx(ex), [ux, uy] = aPx(eu);
    const a = xx - ox, b = ux - ox, c = xy - oy, d = uy - oy;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return [0, 0];
    return [(d * dx - b * dy) / det, (-c * dx + a * dy) / det];
  }
  const LIMITE = 1.2;
  let modo = 'girar'; // 'girar' | 'mover' (lo cambian los botones de la pantalla)
  const MAX_INCLINACION = Math.PI / 3;
  let ultimoToqueMs = 0;
  const alMover = (ev) => {
    const p = punteros.get(ev.pointerId);
    if (!p) return;
    const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
    p.x = ev.clientX; p.y = ev.clientY;
    if (punteros.size === 1 && !pellizcoInicial && modo === 'girar') {
      manipulador.rotation.z += dx * 0.012;
      manipulador.rotation.x = Math.max(-MAX_INCLINACION, Math.min(MAX_INCLINACION, manipulador.rotation.x + dy * 0.008));
    } else if (punteros.size === 1 && !pellizcoInicial) {
      // Mover en el plano del póster siguiendo el dedo
      const [mx, mu] = pixelesAPlano(dx, dy);
      manipulador.position.x = Math.max(-LIMITE, Math.min(LIMITE, manipulador.position.x + mx));
      if (orientacion === 'pared') manipulador.position.z = Math.max(-LIMITE, Math.min(LIMITE, manipulador.position.z + mu));
      else manipulador.position.y = Math.max(-LIMITE, Math.min(LIMITE, manipulador.position.y + mu));
    } else if (punteros.size === 2 && pellizcoInicial) {
      const [a, b] = [...punteros.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const s = Math.min(2.5, Math.max(0.5, pellizcoInicial.escala * (d / pellizcoInicial.d)));
      manipulador.scale.setScalar(s);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      manipulador.rotation.z = pellizcoInicial.giro - (ang - pellizcoInicial.ang);
    }
  };
  const alSubir = (ev) => {
    const p = punteros.get(ev.pointerId);
    if (!p) return;
    const fueToque = punteros.size === 1 && !pellizcoInicial
      && Math.hypot(ev.clientX - p.x0, ev.clientY - p.y0) < 12 && performance.now() - p.t0 < 600;
    punteros.delete(ev.pointerId);
    if (punteros.size < 2) pellizcoInicial = null;
    if (!fueToque || !visible) return;
    const ahora = performance.now();
    if (ahora - ultimoToqueMs < 320) { // doble toque: centrar
      manipulador.position.set(0, 0, 0); manipulador.rotation.set(0, 0, 0); manipulador.scale.setScalar(1);
      ultimoToqueMs = 0;
      return;
    }
    ultimoToqueMs = ahora;
    if (oyentesToque.length) resolverToque(ev.clientX, ev.clientY);
  };
  contenedor.addEventListener('pointerdown', alBajar);
  contenedor.addEventListener('pointermove', alMover);
  contenedor.addEventListener('pointerup', alSubir);
  contenedor.addEventListener('pointercancel', alSubir);

  // Gancho para pruebas automáticas y depuración (proyectar el objeto a pantalla)
  // `ancla.group` apunta al seguidor (lo que realmente se dibuja) para las pruebas
  globalThis.__escenaRA = { THREE, camera, renderer, ancla: { group: seguidor }, manipulador, estaVisible: () => visible, modo: () => modo };

  return {
    scene,
    camera,
    ancla,
    /** Registra una función (dt en segundos) que corre en cada cuadro. */
    enCadaCuadro(fn) { animaciones.push(fn); return () => { animaciones = animaciones.filter((f) => f !== fn); }; },
    manipulador,
    /** Modo del gesto de un dedo: 'girar' | 'mover'. */
    setModo(m) { modo = m === 'mover' ? 'mover' : 'girar'; },
    getModo: () => modo,
    /** Vuelve el objeto a su posición, giro y tamaño originales. */
    centrar() { manipulador.position.set(0, 0, 0); manipulador.rotation.set(0, 0, 0); manipulador.scale.setScalar(1); },
    /** Registra fn(tipo, intersección|null, objeto|null); tipo = 'coleccionable' | 'objeto'. */
    alTocar(fn) { oyentesToque.push(fn); return () => { oyentesToque = oyentesToque.filter((f) => f !== fn); }; },
    async iniciar() {
      await mindar.start();
      activo = true;
      const reloj = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = Math.min(reloj.getDelta(), 0.1);
        estabilizar(dt);
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
      seguidor.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { m?.map?.dispose?.(); m?.dispose?.(); });
      });
      renderer.dispose();
      contenedor.innerHTML = '';
    },
  };
}
