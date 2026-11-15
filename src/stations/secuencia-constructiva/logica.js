/**
 * Lógica pura de "Secuencia constructiva".
 * Varios bancos de pasos; se elige uno al azar y se barajan los pasos.
 */

export const BANCOS = [
  {
    titulo: 'Construcción de una losa de entrepiso en concreto',
    pasos: [
      'Replanteo y nivelación',
      'Colocación de encofrado y apuntalamiento',
      'Armado del acero de refuerzo',
      'Inspección y liberación del armado',
      'Colado del concreto y vibrado',
      'Curado',
      'Desencofrado',
    ],
  },
  {
    titulo: 'Cimentación superficial (placa aislada)',
    pasos: [
      'Trazo y excavación',
      'Verificación del suelo de fundación',
      'Colocación de sello de concreto pobre',
      'Armado de la parrilla y arranques de columna',
      'Colado de la placa',
      'Relleno compactado',
    ],
  },
  {
    titulo: 'Levantamiento con escáner láser (flujo LDCV)',
    pasos: [
      'Planificación de estaciones y traslapes',
      'Colocación de dianas (targets)',
      'Escaneo en cada estación',
      'Registro de nubes de puntos',
      'Georreferenciación (CRTM05)',
      'Limpieza y exportación',
      'Modelado BIM a partir de la nube',
    ],
  },
  {
    titulo: 'Pavimento flexible (asfalto)',
    pasos: [
      'Preparación de la subrasante',
      'Colocación y compactación de la subbase',
      'Colocación y compactación de la base',
      'Riego de imprimación',
      'Colocación de la carpeta asfáltica',
      'Compactación y señalización',
    ],
  },
];

export function barajar(arr, aleatorio = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generarReto(aleatorio = Math.random) {
  const banco = BANCOS[Math.floor(aleatorio() * BANCOS.length)];
  let desordenados = barajar(banco.pasos, aleatorio);
  // Evitar que salga ya ordenado
  if (desordenados.every((p, i) => p === banco.pasos[i])) desordenados = [...banco.pasos].reverse();
  return { titulo: banco.titulo, correcto: banco.pasos, desordenados };
}

/** Cuenta pasos en la posición correcta. */
export function evaluar(reto, propuesta) {
  const aciertos = propuesta.filter((p, i) => p === reto.correcto[i]).length;
  return { aciertos, total: reto.correcto.length, correcto: aciertos === reto.correcto.length };
}
