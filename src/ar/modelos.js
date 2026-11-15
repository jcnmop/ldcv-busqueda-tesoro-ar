/**
 * Ayudantes para objetos 3D de las estaciones.
 *
 * cargarGLB: `crearObjeto()` debe ser síncrono, así que devuelve un Group vacío
 * que se rellena cuando termina la carga. Mientras tanto se muestra un indicador.
 *
 * Flujo recomendado desde Blender (ver docs/MODELOS.md):
 *   Decimate < 50k tris → unir mallas → hornear a 1 textura ≤ 1024 px →
 *   File > Export > glTF 2.0 (.glb, +Y up, aplicar modificadores) → public/modelos/<id>.glb
 */

/**
 * Carga un .glb y lo devuelve dentro de un Group (síncrono; el modelo aparece al cargar).
 *
 * ANIMACIONES: si el .glb trae animaciones, el grupo expone en `userData`:
 *   - actualizar(dt)                    lo llama la escena en cada cuadro (no tocar)
 *   - reproducir(nombre, { unaVez, luego })  cambia de animación con transición suave;
 *         unaVez=true la corre una sola vez y luego vuelve a `luego` (o a la inicial)
 *   - animaciones                       lista de nombres disponibles
 *   - listo                             Promise que resuelve cuando el modelo cargó
 *
 * @param {typeof import('three')} THREE
 * @param {string} url            ej: `${import.meta.env.BASE_URL}modelos/robot.glb`
 * @param {object} [op]
 * @param {number} [op.altura]     normaliza el modelo a esta altura (unidades de marcador = 1 de ancho).
 *                                 Recomendado: evita adivinar la escala de cada .glb.
 * @param {number} [op.escala=1]   escala fija (se ignora si se da `altura`)
 * @param {boolean} [op.acostar=true]  rota 90° en X para que "+Y arriba" de Blender
 *                                     quede "+Z arriba" sobre el plano del marcador
 * @param {string} [op.animacion]  animación en bucle al aparecer (ej: "Idle")
 * @param {string} [op.entrada]    animación de una sola vez al detectar el marcador (ej: "Wave")
 */
export function cargarGLB(THREE, url, { altura, escala = 1, acostar = true, animacion, entrada } = {}) {
  const grupo = new THREE.Group();
  const indicador = indicadorCarga(THREE);
  grupo.add(indicador);

  let mixer = null;
  const acciones = {};
  let actual = null;
  let base = animacion;

  function reproducir(nombre, { unaVez = false, luego } = {}) {
    const accion = acciones[nombre];
    if (!accion) return false;
    if (actual && actual !== accion) actual.fadeOut(0.25);
    accion.reset();
    accion.setLoop(unaVez ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    accion.clampWhenFinished = unaVez;
    accion.fadeIn(0.25).play();
    actual = accion;
    if (unaVez) {
      const volverA = luego ?? base;
      const alTerminar = (e) => {
        if (e.action !== accion) return;
        mixer.removeEventListener('finished', alTerminar);
        if (volverA) reproducir(volverA);
      };
      mixer.addEventListener('finished', alTerminar);
    }
    return true;
  }

  grupo.userData.reproducir = (n, op) => reproducir(n, op);
  grupo.userData.animaciones = [];
  grupo.userData.actualizar = (dt) => mixer?.update(dt);

  grupo.userData.listo = import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new Promise((ok, mal) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        grupo.remove(indicador);
        const m = gltf.scene;
        if (acostar) m.rotation.x = Math.PI / 2;
        if (altura) {
          m.updateMatrixWorld(true);
          const caja = new THREE.Box3().setFromObject(m);
          const alto = caja.max.z - caja.min.z || caja.max.y - caja.min.y || 1;
          m.scale.multiplyScalar(altura / alto);
          m.updateMatrixWorld(true);
          const caja2 = new THREE.Box3().setFromObject(m);
          m.position.z -= caja2.min.z; // apoyar en el plano del marcador
        } else {
          m.scale.multiplyScalar(escala);
        }
        grupo.add(m);

        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(m);
          for (const clip of gltf.animations) acciones[clip.name] = mixer.clipAction(clip);
          grupo.userData.animaciones = Object.keys(acciones);
          if (base && !acciones[base]) base = undefined;
          if (base) reproducir(base);
        }
        ok(grupo);
      },
      undefined,
      (err) => { console.error('[glb] no se pudo cargar', url, err); mal(err); },
    );
  }));

  // Animación de entrada cuando la escena avisa que se encontró el marcador
  grupo.userData.alEncontrar = () => {
    if (entrada) grupo.userData.listo.then(() => reproducir(entrada, { unaVez: true }));
  };
  return grupo;
}

/**
 * Reacción genérica al tocar un objeto en RA (si la estación no define la suya):
 * un rebote rápido de escala. Devuelve una función de actualización por cuadro.
 */
export function rebote(objeto, { duracion = 0.45, amplitud = 0.25 } = {}) {
  const escalaBase = objeto.userData.escalaBase ?? objeto.scale.x;
  objeto.userData.escalaBase = escalaBase;
  let t = 0;
  objeto.userData.efecto = (dt) => {
    t += dt;
    const p = Math.min(t / duracion, 1);
    const s = escalaBase * (1 + amplitud * Math.sin(p * Math.PI) * (1 - p * 0.5));
    objeto.scale.setScalar(s);
    if (p >= 1) { objeto.scale.setScalar(escalaBase); objeto.userData.efecto = null; }
  };
}

/** Anillo que gira mientras carga un modelo. */
export function indicadorCarga(THREE) {
  const anillo = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.03, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xf2a900 }),
  );
  anillo.position.z = 0.1;
  anillo.userData.girar = 2;
  return anillo;
}

/** Texto plano como sprite (útil para etiquetas sobre el marcador). */
export function etiqueta(THREE, texto, { color = '#f7f7f5', fondo = 'rgba(11,31,58,0.85)', ancho = 0.6 } = {}) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 512; lienzo.height = 128;
  const c = lienzo.getContext('2d');
  c.fillStyle = fondo; c.fillRect(0, 0, 512, 128);
  c.fillStyle = color; c.font = 'bold 56px system-ui, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(texto, 256, 64);
  const tex = new THREE.CanvasTexture(lienzo);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(ancho, ancho / 4, 1);
  return sprite;
}
