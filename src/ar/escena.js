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

export async function crearEscena(contenedor, { marcadorSrc, objeto, onEncontrado, onPerdido }) {
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
  if (objeto) ancla.group.add(objeto);
  ancla.onTargetFound = () => onEncontrado?.();
  ancla.onTargetLost = () => onPerdido?.();

  let animaciones = [];
  let activo = false;

  return {
    scene,
    camera,
    ancla,
    /** Registra una función (dt en segundos) que corre en cada cuadro. */
    enCadaCuadro(fn) { animaciones.push(fn); return () => { animaciones = animaciones.filter((f) => f !== fn); }; },
    async iniciar() {
      await mindar.start();
      activo = true;
      const reloj = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = reloj.getDelta();
        for (const fn of animaciones) fn(dt);
        renderer.render(scene, camera);
      });
    },
    detener() {
      if (!activo) return;
      activo = false;
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
