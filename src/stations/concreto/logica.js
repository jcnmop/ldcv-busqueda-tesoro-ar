/**
 * Lógica pura de "Cubicación de concreto".
 *
 * Una losa rectangular apoyada en 4 columnas cuadradas.
 *   V_losa     = largo × ancho × espesor
 *   V_columnas = 4 × lado² × altura
 *   V_total    = V_losa + V_columnas                     [m³]
 *   viajes     = ⌈ V_total / capacidad del mixer ⌉        (siempre hacia arriba)
 * Largo, ancho y altura se MIDEN en la RA con la cinta virtual; espesor y lado
 * de columna vienen "de los planos" (son muy pequeños para medirlos tocando).
 */
export const MIXER_M3 = 6;
export const N_COLUMNAS = 4;

const r2 = (x) => Math.round(x * 100) / 100;

export function volumenes({ largo, ancho, espesor, lado, altura }, nCol = N_COLUMNAS) {
  const losa = r2(largo * ancho * espesor);
  const columnas = r2(nCol * lado * lado * altura);
  return { losa, columnas, total: r2(losa + columnas) };
}

export function viajes(total, capacidad = MIXER_M3) { return Math.ceil(total / capacidad - 1e-9); }

/** @param {() => number} aleatorio */
export function generarReto(aleatorio = Math.random) {
  const pick = (arr) => arr[Math.floor(aleatorio() * arr.length)];
  const dims = {
    largo: pick([6, 7, 8, 9, 10]),
    ancho: pick([4, 5, 6]),
    espesor: pick([0.12, 0.15, 0.2]),
    lado: pick([0.3, 0.4]),
    altura: pick([2.5, 3, 3.5]),
  };
  const v = volumenes(dims);
  const candidatos = [
    { id: 'correcta', valor: v.total, error: '' },
    { id: 'solo-losa', valor: v.losa, error: 'olvidar las columnas' },
    { id: 'una-columna', valor: r2(v.losa + v.columnas / N_COLUMNAS), error: 'contar una sola columna' },
    { id: 'lado-sin-cuadrado', valor: r2(v.losa + N_COLUMNAS * dims.lado * dims.altura), error: 'no elevar al cuadrado el lado de la columna' },
  ];
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  return { ...dims, ...v, mixer: MIXER_M3, nColumnas: N_COLUMNAS, viajes: viajes(v.total), opciones: candidatos };
}

export function evaluar(reto, { opcionId, viajes: v }) {
  const volumenOk = opcionId === 'correcta';
  const viajesOk = Number(v) === reto.viajes;
  return { volumenOk, viajesOk, correcto: volumenOk && viajesOk };
}

/**
 * Cinta métrica: ajusta un punto (coordenadas locales de una caja centrada en el origen,
 * con medias dimensiones hx, hy, hz) a la ESQUINA más cercana, para que medir sea exacto.
 */
export function esquinaMasCercana(p, hx, hy, hz) {
  return { x: Math.sign(p.x || 1) * hx, y: Math.sign(p.y || 1) * hy, z: Math.sign(p.z || 1) * hz };
}

/**
 * Identifica QUÉ se midió a partir de las dos esquinas (coordenadas locales de la misma pieza).
 * Losa: solo cambia x → 'largo'; solo y → 'ancho'; solo z → 'espesor'. Columna: solo z → 'altura'.
 * Cualquier otra combinación es una diagonal o una medida que no sirve para el reto.
 * @returns {'largo'|'ancho'|'espesor'|'altura'|'seccion'|'diagonal'|'nula'}
 */
export function clasificarMedida(tipo, a, b, tol = 1e-6) {
  const dx = Math.abs(a.x - b.x) > tol, dy = Math.abs(a.y - b.y) > tol, dz = Math.abs(a.z - b.z) > tol;
  const n = dx + dy + dz;
  if (n === 0) return 'nula';
  if (n > 1) return 'diagonal';
  if (tipo === 'losa') return dx ? 'largo' : dy ? 'ancho' : 'espesor';
  if (tipo === 'columna') return dz ? 'altura' : 'seccion';
  return 'diagonal';
}

export const NOMBRE_MEDIDA = { largo: 'Largo de la losa', ancho: 'Ancho de la losa', altura: 'Altura de la columna' };
