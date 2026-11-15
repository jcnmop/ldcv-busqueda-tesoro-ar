/**
 * PUENTE COLECCIONABLE
 * Cada estación de la ruta del equipo corresponde a una pieza de un puente en arco.
 * La pieza se gana si el reto se COMPLETA; si no, queda un hueco (visible al final).
 * El orden de las piezas sigue el orden de construcción real (de abajo hacia arriba),
 * no el id de la estación, así cualquier ruta arma el puente en secuencia lógica.
 *
 * Lógica pura (sin DOM ni Three.js) para poder probarla. El dibujo está en src/ui/puente3d.js.
 */

export const PIEZAS = [
  { id: 'pilas', nombre: 'Cimientos y pilas', descripcion: 'Transmiten las cargas del puente al suelo.' },
  { id: 'tablero', nombre: 'Tablero', descripcion: 'La superficie por donde circulan peatones y vehículos.' },
  { id: 'arco', nombre: 'Arco', descripcion: 'Trabaja a compresión y lleva las cargas hacia los apoyos.' },
  { id: 'pendolas', nombre: 'Péndolas y barandas', descripcion: 'Cuelgan el tablero del arco y protegen al usuario.' },
  { id: 'iluminacion', nombre: 'Iluminación', descripcion: 'Luminarias para uso nocturno seguro.' },
  { id: 'senalizacion', nombre: 'Señalización', descripcion: 'Placas y marcas de carga máxima.' },
];

/** Piezas en juego para una ruta de N estaciones (máximo PIEZAS.length). */
export function piezasEnJuego(totalEstaciones) {
  return PIEZAS.slice(0, Math.max(0, Math.min(totalEstaciones, PIEZAS.length)));
}

/**
 * Estado de cada pieza para el equipo.
 * @param {{ ruta: string[], completadas: { estacionId: string, completado: boolean }[] }} estado
 * @returns {{ pieza: typeof PIEZAS[number], estado: 'obtenida'|'perdida'|'pendiente', estacionId: string }[]}
 */
export function piezasDelEquipo(estado) {
  const piezas = piezasEnJuego(estado.ruta.length);
  return piezas.map((pieza, i) => {
    const c = estado.completadas[i];
    return {
      pieza,
      estacionId: estado.ruta[i],
      estado: !c ? 'pendiente' : c.completado ? 'obtenida' : 'perdida',
    };
  });
}

/** Pieza que corresponde a la estación recién jugada (índice = posición en la ruta). */
export function piezaDeEstacion(estado, estacionId) {
  const i = estado.ruta.indexOf(estacionId);
  return i >= 0 ? (PIEZAS[i] ?? null) : null;
}

export function puenteCompleto(estado) {
  const p = piezasDelEquipo(estado);
  return p.length > 0 && p.every((x) => x.estado === 'obtenida');
}
