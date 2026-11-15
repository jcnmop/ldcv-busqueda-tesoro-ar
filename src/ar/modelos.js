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
 * @param {typeof import('three')} THREE
 * @param {string} url            ej: `${import.meta.env.BASE_URL}modelos/viga.glb`
 * @param {object} [op]
 * @param {number} [op.escala=1]   el marcador mide 1 unidad de ancho
 * @param {boolean} [op.acostar=true]  rota -90° en X para que "+Y arriba" de Blender
 *                                     quede "+Z arriba" sobre el plano del marcador
 */
export function cargarGLB(THREE, url, { escala = 1, acostar = true } = {}) {
  const grupo = new THREE.Group();
  const indicador = indicadorCarga(THREE);
  grupo.add(indicador);

  import('three/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    new GLTFLoader().load(
      url,
      (gltf) => {
        grupo.remove(indicador);
        const m = gltf.scene;
        m.scale.setScalar(escala);
        if (acostar) m.rotation.x = Math.PI / 2;
        grupo.add(m);
      },
      undefined,
      (err) => console.error('[glb] no se pudo cargar', url, err),
    );
  });
  return grupo;
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
