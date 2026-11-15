/**
 * Visor 3D del puente coleccionable (fuera de la RA: un canvas normal que gira).
 * Las piezas obtenidas se dibujan en color; las pendientes, como "fantasma";
 * las perdidas, en rojo translúcido. La pieza `resaltar` aparece con una animación.
 *
 * Uso:  const destruir = await montarPuente(contenedor, { estados, resaltar: 'arco' });
 */

/** Construye la geometría de cada pieza (coordenadas Y arriba, luz ~5 m). */
export function construirPiezas(THREE) {
  const piezas = {};
  const grupo = (...hijos) => { const g = new THREE.Group(); hijos.forEach((h) => g.add(h)); return g; };
  const caja = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d)); m.position.set(x, y, z); return m; };
  const cil = (r, h, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8)); m.position.set(x, y, z); return m; };

  // 1. Cimientos y pilas: estribos en los extremos + dos pilas
  piezas.pilas = grupo(
    caja(0.6, 0.9, 1.3, -2.55, 0.45, 0), caja(0.6, 0.9, 1.3, 2.55, 0.45, 0),
    caja(0.35, 0.85, 1.0, -1.7, 0.425, 0), caja(0.35, 0.85, 1.0, 1.7, 0.425, 0),
  );

  // 2. Tablero
  piezas.tablero = grupo(caja(5.6, 0.14, 1.1, 0, 0.92, 0));

  // 3. Arco: dos tubos parabólicos, uno a cada lado
  const curvaArco = (z) => new THREE.CatmullRomCurve3(
    Array.from({ length: 13 }, (_, i) => {
      const x = -1.7 + (3.4 * i) / 12;
      const y = 0.85 + 1.25 * (1 - (x / 1.7) ** 2);
      return new THREE.Vector3(x, y, z);
    }),
  );
  piezas.arco = grupo(
    new THREE.Mesh(new THREE.TubeGeometry(curvaArco(0.5), 48, 0.06, 8)),
    new THREE.Mesh(new THREE.TubeGeometry(curvaArco(-0.5), 48, 0.06, 8)),
  );

  // 4. Péndolas (cables verticales arco→tablero) y barandas
  const pend = [];
  for (let i = 1; i < 12; i++) {
    const x = -1.7 + (3.4 * i) / 12;
    const yArco = 0.85 + 1.25 * (1 - (x / 1.7) ** 2);
    const h = yArco - 0.99;
    for (const z of [0.5, -0.5]) pend.push(cil(0.012, h, x, 0.99 + h / 2, z));
  }
  pend.push(caja(5.6, 0.04, 0.04, 0, 1.25, 0.53), caja(5.6, 0.04, 0.04, 0, 1.25, -0.53));
  for (let i = 0; i <= 14; i++) {
    const x = -2.8 + (5.6 * i) / 14;
    pend.push(cil(0.015, 0.26, x, 1.12, 0.53), cil(0.015, 0.26, x, 1.12, -0.53));
  }
  piezas.pendolas = grupo(...pend);

  // 5. Iluminación: postes con luminaria en los extremos y centro
  const luces = [];
  for (const x of [-2.4, 0, 2.4]) for (const z of [0.6, -0.6]) {
    luces.push(cil(0.02, 0.6, x, 1.29, z));
    const foco = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10));
    foco.position.set(x, 1.6, z);
    foco.userData.esFoco = true;
    luces.push(foco);
  }
  piezas.iluminacion = grupo(...luces);

  // 6. Señalización: placa de carga máxima a la entrada
  piezas.senalizacion = grupo(caja(0.05, 0.3, 0.3, -2.75, 1.3, 0.45), cil(0.015, 0.4, -2.75, 1.05, 0.45));
  return piezas;
}

const COLORES = { pilas: 0x9aa5b1, tablero: 0xcfd3d8, arco: 0xf2a900, pendolas: 0x1e88e5, iluminacion: 0xfff3b0, senalizacion: 0xd0453c };

/**
 * Puente del equipo (Y arriba, ~5.6 de largo). Reutilizado por el visor normal y por la RA.
 * @returns {{ grupo: THREE.Group, animar: (dt:number) => void }}
 *   Cada pieza queda con userData.piezaId para identificarla al tocarla.
 */
export function construirPuenteEquipo(THREE, estados, { resaltar, secuencial = false } = {}) {
  const raiz = new THREE.Group();
  const piezas = construirPiezas(THREE);
  const caidas = []; // piezas que "caen" a su lugar

  estados.forEach(({ pieza, estado }, i) => {
    const g = piezas[pieza.id];
    if (!g) return;
    let mat;
    if (estado === 'obtenida') mat = new THREE.MeshStandardMaterial({ color: COLORES[pieza.id], roughness: 0.6, metalness: pieza.id === 'arco' ? 0.3 : 0.1 });
    else if (estado === 'perdida') mat = new THREE.MeshStandardMaterial({ color: 0xd0453c, transparent: true, opacity: 0.18 });
    else mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, wireframe: true });
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.material = (estado === 'obtenida' && o.userData.esFoco) ? new THREE.MeshBasicMaterial({ color: 0xfff3b0 }) : mat;
    });
    g.userData.piezaId = pieza.id;
    raiz.add(g);
    const cae = estado === 'obtenida' && (secuencial || pieza.id === resaltar);
    if (cae) { g.position.y = 2.5; caidas.push({ g, retardo: secuencial ? i * 0.55 : 0, t: 0 }); }
  });

  const animar = (dt) => {
    for (const c of caidas) {
      if (c.listo) continue;
      c.t += dt;
      const t = c.t - c.retardo;
      if (t < 0) continue;
      const p = Math.min(t / 0.9, 1);
      const rebote = p < 1 ? Math.abs(Math.cos(p * Math.PI * 1.5)) * (1 - p) : 0;
      c.g.position.y = 2.5 * (1 - p) * (1 - p) + rebote * 0.15;
      if (p >= 1) { c.g.position.y = 0; c.listo = true; }
    }
  };
  return { grupo: raiz, animar };
}

/**
 * Pieza en miniatura, dorada y brillante, para "atraparla" en la RA (diseño Z arriba).
 * Lleva userData.coleccionable = true y un halo que facilita el toque.
 */
export function piezaMini(THREE, piezaId, tam = 0.26) {
  const g = new THREE.Group();
  const fuente = piezaId ? construirPiezas(THREE)[piezaId] : null;
  const oro = new THREE.MeshStandardMaterial({ color: 0xf2a900, emissive: 0x6a4700, metalness: 0.7, roughness: 0.3 });
  let modelo;
  if (fuente) {
    modelo = fuente;
    modelo.traverse((o) => { if (o.isMesh) o.material = oro; });
    const caja = new THREE.Box3().setFromObject(modelo);
    const c = caja.getCenter(new THREE.Vector3());
    const t = caja.getSize(new THREE.Vector3());
    modelo.position.sub(c);
    const envoltura = new THREE.Group();
    envoltura.add(modelo);
    envoltura.scale.setScalar(tam / Math.max(t.x, t.y, t.z));
    envoltura.rotation.x = Math.PI / 2; // Y arriba → Z arriba
    modelo = envoltura;
  } else {
    modelo = new THREE.Mesh(new THREE.OctahedronGeometry(tam * 0.45), oro);
  }
  g.add(modelo);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(tam * 0.75, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  g.add(halo);
  g.userData.coleccionable = true;
  g.userData.piezaId = piezaId;
  // Flotar, girar y "latir"
  let t = Math.random() * 6;
  g.userData.efectoPropio = (dt) => {
    t += dt;
    modelo.rotation.z += dt * 1.6;
    halo.scale.setScalar(1 + 0.12 * Math.sin(t * 4));
    halo.material.opacity = 0.16 + 0.1 * (1 + Math.sin(t * 4)) / 2;
  };
  g.userData.actualizar = g.userData.efectoPropio;
  return g;
}

/**
 * @param {HTMLElement} contenedor
 * @param {{ estados: { pieza: { id: string }, estado: string }[], resaltar?: string, alto?: number }} op
 * @returns {Promise<() => void>} función para destruir el visor
 */
export async function montarPuente(contenedor, { estados, resaltar, alto = 220, secuencial = false }) {
  const THREE = await import('three');
  const ancho = contenedor.clientWidth || 320;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(ancho, alto);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  contenedor.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, ancho / alto, 0.1, 100);
  camera.position.set(0, 2.6, 7.2);
  camera.lookAt(0, 0.9, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.3));
  const sol = new THREE.DirectionalLight(0xffffff, 1.0);
  sol.position.set(3, 5, 4);
  scene.add(sol);

  // Agua bajo el puente
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.3 }));
  agua.rotation.x = -Math.PI / 2;
  scene.add(agua);

  const { grupo: raiz, animar } = construirPuenteEquipo(THREE, estados, { resaltar, secuencial });
  scene.add(raiz);

  const reloj = new THREE.Clock();
  let activo = true;
  renderer.setAnimationLoop(() => {
    if (!activo) return;
    const dt = Math.min(reloj.getDelta(), 0.1);
    raiz.rotation.y += dt * 0.35;
    animar(dt);
    renderer.render(scene, camera);
  });

  return () => {
    activo = false;
    renderer.setAnimationLoop(null);
    scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
