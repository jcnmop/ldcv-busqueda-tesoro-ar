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
  if (objeto) {
    const soporte = new THREE.Group();
    if (orientacion === 'pared') {
      soporte.rotation.x = -Math.PI / 2; // diseño Z-arriba → arriba del póster (+Y)
      soporte.position.set(0, -0.38, 0.12); // apoyado cerca del borde inferior, un poco al frente
    }
    soporte.add(objeto);
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

  // ---- Toques sobre el objeto 3D (raycast) ----
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let oyentesToque = [];
  const alPresionar = (ev) => {
    if (!visible || !oyentesToque.length) return;
    if (ev.target.closest?.('.overlay-ar')) return; // toques en botones no cuentan
    // El canvas de MindAR puede ser más grande que la pantalla (recorte): usar su rectángulo real
    const r = renderer.domElement.getBoundingClientRect();
    puntero.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    puntero.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camera);
    const golpes = raycaster.intersectObject(ancla.group, true);
    if (golpes.length) return oyentesToque.forEach((fn) => fn(golpes[0]));
    // Tolerancia para dedos: objetos delgados (vigas, cables) son difíciles de acertar.
    // Si el toque cae dentro del rectángulo en pantalla del objeto (+10 % de margen), cuenta.
    const caja = new THREE.Box3().setFromObject(ancla.group);
    if (caja.isEmpty()) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const x of [caja.min.x, caja.max.x]) for (const y of [caja.min.y, caja.max.y]) for (const z of [caja.min.z, caja.max.z]) {
      const v = new THREE.Vector3(x, y, z).project(camera);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    const mx = (maxX - minX) * 0.1, my = (maxY - minY) * 0.1;
    if (puntero.x >= minX - mx && puntero.x <= maxX + mx && puntero.y >= minY - my && puntero.y <= maxY + my) {
      oyentesToque.forEach((fn) => fn(null));
    }
  };
  contenedor.addEventListener('pointerdown', alPresionar);

  // Gancho para pruebas automáticas y depuración (proyectar el objeto a pantalla)
  globalThis.__escenaRA = { THREE, camera, renderer, ancla, estaVisible: () => visible };

  return {
    scene,
    camera,
    ancla,
    /** Registra una función (dt en segundos) que corre en cada cuadro. */
    enCadaCuadro(fn) { animaciones.push(fn); return () => { animaciones = animaciones.filter((f) => f !== fn); }; },
    /** Registra fn(intersección) cuando el jugador toca el objeto 3D. */
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
      contenedor.removeEventListener('pointerdown', alPresionar);
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
