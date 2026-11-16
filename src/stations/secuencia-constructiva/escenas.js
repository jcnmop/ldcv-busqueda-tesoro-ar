/**
 * Modelos 3D de cada proceso constructivo (diseño Z arriba, base en z = 0, ~0.8 de ancho).
 *
 * Cada escena es un CORTE del elemento terminado, con sus componentes reales (suelo,
 * excavación, sello, acero, concreto, capas de pavimento, escáneres…). Al tocarla, los
 * componentes se separan verticalmente (DESPIECE) y al volver a tocar se reensamblan.
 * Observar el corte ayuda a deducir el orden constructivo: es parte del reto.
 *
 * Convención: cada componente es un Group con userData.capa = índice para el despiece.
 */

const COLOR = {
  suelo: 0x8d6e4b, sueloOscuro: 0x6d5236, concreto: 0xbfc5cc, concretoPobre: 0x9aa0a6,
  acero: 0xb5651d, madera: 0xc49a6c, metal: 0x8a97a8, grava: 0xb7a98a, base: 0x9e9e9e,
  asfalto: 0x2b2b2b, pintura: 0xf7f7f5, amarillo: 0xf2a900,
};

function mat(THREE, color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
}
function caja(THREE, w, d, h, color, x = 0, y = 0, z = 0, extra) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), mat(THREE, color, extra));
  m.position.set(x, y, z + h / 2);
  return m;
}
/** Barra de acero entre dos puntos. */
function barra(THREE, a, b, r = 0.0045) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const largo = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, largo, 6), mat(THREE, COLOR.acero, { metalness: 0.5, roughness: 0.5 }));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
function capa(THREE, i, ...hijos) {
  const g = new THREE.Group();
  hijos.forEach((h) => g.add(h));
  g.userData.capa = i;
  return g;
}

// ---------------------------------------------------------------------------
// Cimentación superficial: suelo con excavación, sello, parrilla, placa, arranques, relleno
// ---------------------------------------------------------------------------
function cimentacion(THREE) {
  const g = new THREE.Group();
  const W = 0.8, D = 0.5, H = 0.3;          // bloque de suelo
  const pw = 0.38, pd = 0.3, prof = 0.2;    // excavación
  const fondo = H - prof;
  // Suelo con hueco: 4 bloques alrededor + piso del hueco (corte con cara frontal abierta)
  const suelo = capa(THREE, 0,
    caja(THREE, W, D, fondo, COLOR.sueloOscuro, 0, 0, 0),
    caja(THREE, (W - pw) / 2, D, prof, COLOR.suelo, -(pw / 2 + (W - pw) / 4), 0, fondo),
    caja(THREE, (W - pw) / 2, D, prof, COLOR.suelo, (pw / 2 + (W - pw) / 4), 0, fondo),
    caja(THREE, pw, (D - pd) / 2, prof, COLOR.suelo, 0, (pd / 2 + (D - pd) / 4), fondo),
  );
  const sello = capa(THREE, 1, caja(THREE, pw - 0.04, pd - 0.04, 0.015, COLOR.concretoPobre, 0, 0, fondo));
  const zP = fondo + 0.03;
  const parrilla = capa(THREE, 2);
  for (let i = 0; i < 6; i++) {
    const x = -0.15 + i * 0.06, y = -0.11 + i * 0.044;
    parrilla.add(barra(THREE, [x, -0.12, zP], [x, 0.12, zP]));
    parrilla.add(barra(THREE, [-0.16, y, zP + 0.008], [0.16, y, zP + 0.008]));
  }
  const placa = capa(THREE, 3, caja(THREE, pw - 0.06, pd - 0.06, 0.07, COLOR.concreto, 0, 0, fondo + 0.015, { transparent: true, opacity: 0.45 }));
  const arranques = capa(THREE, 4, caja(THREE, 0.09, 0.09, 0.32, COLOR.concreto, 0, 0, fondo + 0.085, { transparent: true, opacity: 0.4 }));
  for (const [x, y] of [[-0.03, -0.03], [0.03, -0.03], [-0.03, 0.03], [0.03, 0.03]]) {
    arranques.add(barra(THREE, [x, y, fondo + 0.03], [x, y, fondo + 0.42]));
  }
  const relleno = capa(THREE, 5, caja(THREE, pw, pd, prof - 0.085, COLOR.suelo, 0, 0, fondo + 0.085, { transparent: true, opacity: 0.35 }));
  g.add(suelo, sello, parrilla, placa, arranques, relleno);
  return g;
}

// ---------------------------------------------------------------------------
// Losa de entrepiso: columnas, puntales, encofrado, armadura, concreto
// ---------------------------------------------------------------------------
function losa(THREE) {
  const g = new THREE.Group();
  const W = 0.7, D = 0.48, alto = 0.34;
  const columnas = capa(THREE, 0, caja(THREE, W + 0.1, D + 0.1, 0.012, 0x8e979f, 0, 0, -0.012));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) columnas.add(caja(THREE, 0.06, 0.06, alto, COLOR.concreto, sx * (W / 2 - 0.03), sy * (D / 2 - 0.03), 0));
  const puntales = capa(THREE, 1);
  for (const x of [-0.18, 0, 0.18]) for (const y of [-0.12, 0.12]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, alto - 0.015, 6), mat(THREE, COLOR.metal, { metalness: 0.6 }));
    p.rotation.x = Math.PI / 2; p.position.set(x, y, (alto - 0.015) / 2);
    puntales.add(p);
  }
  const encofrado = capa(THREE, 2, caja(THREE, W, D, 0.012, COLOR.madera, 0, 0, alto - 0.015));
  const armadura = capa(THREE, 3);
  const zA = alto + 0.012;
  for (let i = 0; i <= 8; i++) armadura.add(barra(THREE, [-W / 2 + 0.03 + i * (W - 0.06) / 8, -D / 2 + 0.03, zA], [-W / 2 + 0.03 + i * (W - 0.06) / 8, D / 2 - 0.03, zA]));
  for (let i = 0; i <= 6; i++) armadura.add(barra(THREE, [-W / 2 + 0.03, -D / 2 + 0.03 + i * (D - 0.06) / 6, zA + 0.008], [W / 2 - 0.03, -D / 2 + 0.03 + i * (D - 0.06) / 6, zA + 0.008]));
  const concreto = capa(THREE, 4, caja(THREE, W, D, 0.045, COLOR.concreto, 0, 0, alto - 0.003, { transparent: true, opacity: 0.5 }));
  g.add(columnas, puntales, encofrado, armadura, concreto);
  return g;
}

// ---------------------------------------------------------------------------
// Pavimento flexible: corte escalonado de capas + señalización
// ---------------------------------------------------------------------------
function pavimento(THREE) {
  const g = new THREE.Group();
  const D = 0.36;
  // Cada capa un poco más corta que la de abajo: se ve la "escalera" típica del corte
  const capas = [
    { color: COLOR.sueloOscuro, h: 0.12, w: 0.84 },  // subrasante
    { color: COLOR.grava, h: 0.06, w: 0.74 },        // subbase
    { color: COLOR.base, h: 0.05, w: 0.64 },         // base
    { color: 0x4a3b2a, h: 0.006, w: 0.56 },          // imprimación
    { color: COLOR.asfalto, h: 0.045, w: 0.56 },     // carpeta
  ];
  let z = 0;
  capas.forEach((c, i) => {
    g.add(capa(THREE, i, caja(THREE, c.w, D, c.h, c.color, (0.84 - c.w) / 2, 0, z)));
    z += c.h;
  });
  // Señalización: línea central discontinua y bordes
  const sen = capa(THREE, 5);
  for (let i = 0; i < 4; i++) sen.add(caja(THREE, 0.07, 0.012, 0.003, COLOR.pintura, -0.04 + i * 0.12, 0, z));
  sen.add(caja(THREE, 0.5, 0.01, 0.003, COLOR.amarillo, 0.14, -D / 2 + 0.02, z), caja(THREE, 0.5, 0.01, 0.003, COLOR.amarillo, 0.14, D / 2 - 0.02, z));
  g.add(sen);
  return g;
}

// ---------------------------------------------------------------------------
// Escaneo láser: edificio, escáneres en trípode, dianas, nube de puntos, modelo BIM
// ---------------------------------------------------------------------------
function escaneo(THREE) {
  const g = new THREE.Group();
  const terreno = capa(THREE, 0, caja(THREE, 0.9, 0.6, 0.01, 0x6b7a5a, 0, 0, -0.01));
  const edificio = capa(THREE, 0, caja(THREE, 0.34, 0.22, 0.26, 0xdfe3e6, 0, 0.08, 0), caja(THREE, 0.36, 0.24, 0.02, 0x9aa5b1, 0, 0.08, 0.26));
  // Escáneres en trípode (3 estaciones)
  const escaneres = capa(THREE, 1);
  for (const [x, y] of [[-0.3, -0.18], [0.3, -0.18], [0, -0.26]]) {
    const t = new THREE.Group();
    for (const a of [0, 2.1, 4.2]) t.add(barra(THREE, [x + 0.03 * Math.cos(a), y + 0.03 * Math.sin(a), 0], [x, y, 0.14], 0.003));
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 14), mat(THREE, 0xd0453c));
    cab.rotation.x = Math.PI / 2; cab.position.set(x, y, 0.16);
    t.add(cab);
    escaneres.add(t);
  }
  // Dianas (targets) a cuadros sobre la fachada
  const dianas = capa(THREE, 2);
  for (const [x, z] of [[-0.12, 0.18], [0.12, 0.1], [0, 0.22]]) {
    dianas.add(caja(THREE, 0.03, 0.003, 0.03, 0x111111, x, -0.032, z));
    dianas.add(caja(THREE, 0.015, 0.004, 0.015, 0xffffff, x - 0.0075, -0.034, z + 0.015));
    dianas.add(caja(THREE, 0.015, 0.004, 0.015, 0xffffff, x + 0.0075, -0.034, z));
  }
  // Nube de puntos sobre la fachada y el techo, coloreada por altura
  const N = 900;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const enTecho = i % 4 === 0;
    const x = (Math.random() - 0.5) * 0.34;
    const y = enTecho ? 0.08 + (Math.random() - 0.5) * 0.22 : -0.04;
    const z = enTecho ? 0.285 : Math.random() * 0.26;
    pos.set([x, y - 0.002, z], i * 3);
    c.setHSL(0.66 - (z / 0.3) * 0.66, 0.9, 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const nube = capa(THREE, 3, new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.008, vertexColors: true })));
  // Modelo BIM (aristas) que "sale" de la nube
  const aristas = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.34, 0.22, 0.26)), new THREE.LineBasicMaterial({ color: 0x1e88e5 }));
  aristas.position.set(0, 0.08, 0.13);
  const bim = capa(THREE, 4, aristas);
  g.add(terreno, edificio, escaneres, dianas, nube, bim);
  return g;
}

const ESCENAS = { cimentacion, losa, pavimento, escaneo };

/**
 * Crea la escena del proceso `id` con despiece animado.
 * @returns {THREE.Group} con userData.alternarDespiece() y userData.actualizar(dt)
 */
export function crearEscenaProceso(THREE, id) {
  const g = (ESCENAS[id] ?? cimentacion)(THREE);
  const capas = g.children.filter((c) => c.userData.capa != null);
  capas.forEach((c) => { c.userData.z0 = c.position.z; });
  let objetivo = 0, actual = 0;
  g.userData.alternarDespiece = () => { objetivo = objetivo > 0.5 ? 0 : 1; return objetivo > 0.5; };
  g.userData.actualizar = (dt) => {
    actual += (objetivo - actual) * Math.min(1, dt * 4);
    for (const c of capas) c.position.z = c.userData.z0 + actual * c.userData.capa * 0.09;
  };
  return g;
}
