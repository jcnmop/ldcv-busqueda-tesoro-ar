/**
 * Lógica pura de "Detective de clashes".
 * Se genera una vista en planta de un cielo técnico con elementos MEP y una viga.
 * Exactamente UN par de elementos colisiona en su cota (se cruzan en planta y sus
 * rangos de altura se traslapan). El equipo debe tocar el elemento que choca con la viga.
 *
 * Modelo: cada elemento tiene { id, tipo, x1,y1,x2,y2 (planta, en m), zMin, zMax (m) }.
 * La viga va horizontal a lo ancho del área. Los ductos/tuberías la cruzan en vertical.
 */

const TIPOS = [
  { tipo: 'ducto', nombre: 'Ducto de aire', ancho: 0.6, color: '#9aa5b1' },
  { tipo: 'tuberia', nombre: 'Tubería de agua potable', ancho: 0.2, color: '#1e88e5' },
  { tipo: 'sanitaria', nombre: 'Tubería sanitaria', ancho: 0.3, color: '#8d6e63' },
  { tipo: 'bandeja', nombre: 'Bandeja eléctrica', ancho: 0.4, color: '#f2a900' },
  { tipo: 'rociadores', nombre: 'Tubería de rociadores', ancho: 0.15, color: '#d0453c' },
];

const AREA = { ancho: 10, alto: 6 }; // m

export function generarReto(aleatorio = Math.random) {
  // Viga: horizontal en y = 3, peralte 0.5 m, fondo de viga a cota zMin
  const vigaZMax = 3.5;                          // nivel de losa
  const vigaZMin = vigaZMax - (0.5 + Math.round(aleatorio() * 2) * 0.1); // 0.5..0.7 de peralte
  const viga = { id: 'viga', tipo: 'viga', nombre: 'Viga de concreto', x1: 0, y1: 3, x2: AREA.ancho, y2: 3, zMin: vigaZMin, zMax: vigaZMax, ancho: 0.4, color: '#f7f7f5' };

  // 4 a 5 elementos que cruzan la viga en planta; solo uno con cota que la invade
  const n = 4 + Math.floor(aleatorio() * 2);
  const tipos = [...TIPOS].sort(() => aleatorio() - 0.5).slice(0, n);
  const culpable = Math.floor(aleatorio() * n);
  const elementos = tipos.map((t, i) => {
    const x = 1 + (i + 0.5) * ((AREA.ancho - 2) / n) + (aleatorio() - 0.5) * 0.6;
    let zMax;
    if (i === culpable) {
      // invade la viga: su tope queda dentro del rango de la viga
      zMax = vigaZMin + 0.05 + aleatorio() * (vigaZMax - vigaZMin - 0.1);
    } else {
      // pasa por debajo con holgura de al menos 5 cm
      zMax = vigaZMin - 0.05 - aleatorio() * 0.4;
    }
    const espesor = t.tipo === 'ducto' ? 0.4 : t.ancho;
    return { id: `e${i}`, ...t, x1: x, y1: 0.3, x2: x, y2: AREA.alto - 0.3, zMin: +(zMax - espesor).toFixed(2), zMax: +zMax.toFixed(2) };
  });
  return { area: AREA, viga, elementos, culpableId: `e${culpable}` };
}

/** Un elemento colisiona con la viga si se cruzan en planta y sus cotas se traslapan. */
export function colisiona(elemento, viga) {
  const cruzaEnPlanta = Math.min(elemento.y1, elemento.y2) <= viga.y1 && Math.max(elemento.y1, elemento.y2) >= viga.y1
    && elemento.x1 >= viga.x1 && elemento.x1 <= viga.x2;
  const traslapeZ = elemento.zMax > viga.zMin && elemento.zMin < viga.zMax;
  return cruzaEnPlanta && traslapeZ;
}

export function evaluar(reto, idTocado) {
  return { correcto: idTocado === reto.culpableId };
}
