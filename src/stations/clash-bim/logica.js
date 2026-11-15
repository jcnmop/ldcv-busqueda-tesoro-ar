/**
 * Lógica pura de "Detective de clashes" (coordinación BIM en dos fases).
 *
 * Corte transversal de un cielo técnico: una viga de concreto y 5 instalaciones (MEP).
 * Cada elemento tiene un rango de cota [zMin, zMax] (m). Reglas de coordinación:
 *   - CHOQUE DURO  : el elemento ocupa espacio de la viga        → zMax > vigaZMin
 *   - CHOQUE BLANDO: no la toca pero no deja la holgura mínima    → vigaZMin − HOLGURA < zMax ≤ vigaZMin
 *   - OK           : zMax ≤ vigaZMin − HOLGURA
 * Además nada puede quedar por debajo del CIELO RASO (zMin ≥ cieloRaso).
 *
 * Fase 1 (detectar): marcar TODOS los elementos en conflicto (duros y blandos).
 * Fase 2 (resolver): reubicar cada elemento en conflicto para que quede OK y sobre el cielo raso.
 */

export const HOLGURA = 0.05; // 5 cm de holgura mínima para mantenimiento

export const TIPOS = [
  { tipo: 'ducto', nombre: 'Ducto de aire', alto: 0.40, color: '#9aa5b1' },
  { tipo: 'tuberia', nombre: 'Tubería de agua potable', alto: 0.10, color: '#1e88e5' },
  { tipo: 'sanitaria', nombre: 'Tubería sanitaria', alto: 0.16, color: '#8d6e63' },
  { tipo: 'bandeja', nombre: 'Bandeja eléctrica', alto: 0.12, color: '#f2a900' },
  { tipo: 'rociadores', nombre: 'Tubería de rociadores', alto: 0.08, color: '#d0453c' },
];

const r2 = (x) => Math.round(x * 100) / 100;

/** Clasifica un elemento respecto a la viga. */
export function clasificar(e, viga, holgura = HOLGURA) {
  if (e.zMax > viga.zMin + 1e-9) return 'duro';
  if (e.zMax > viga.zMin - holgura + 1e-9) return 'blando';
  return 'ok';
}

/**
 * @param {() => number} aleatorio
 */
export function generarReto(aleatorio = Math.random) {
  const vigaZMax = 3.5;
  const peralte = 0.5 + Math.round(aleatorio() * 2) * 0.1;     // 0.5 .. 0.7 m
  const viga = { zMin: r2(vigaZMax - peralte), zMax: vigaZMax };
  // Espacio útil entre cielo raso y fondo de viga: el ducto (0.40) cabe con poco margen
  const cieloRaso = r2(viga.zMin - HOLGURA - 0.40 - (0.04 + Math.round(aleatorio() * 4) * 0.01));

  // Cuántos conflictos (1 a 3) y de qué tipo
  const orden = [...TIPOS].sort(() => aleatorio() - 0.5);
  const nConflictos = 1 + Math.floor(aleatorio() * 3);
  const elementos = orden.map((t, i) => {
    let zMax;
    if (i < nConflictos) {
      const duro = i === 0 || aleatorio() < 0.5; // al menos un choque duro
      zMax = duro
        ? viga.zMin + 0.03 + Math.round(aleatorio() * 10) * 0.01          // atraviesa 3–13 cm
        : viga.zMin - 0.01 - Math.round(aleatorio() * 3) * 0.01;          // le faltan 1–4 cm de holgura
    } else {
      zMax = viga.zMin - HOLGURA - 0.01 - Math.round(aleatorio() * 8) * 0.01; // cumple (6–14 cm)
    }
    zMax = r2(zMax);
    let zMin = r2(zMax - t.alto);
    // Los que cumplen tampoco pueden quedar bajo el cielo raso
    if (i >= nConflictos && zMin < cieloRaso) { zMin = r2(cieloRaso + 0.01); zMax = r2(zMin + t.alto); }
    return { id: `e${i}`, ...t, zMin, zMax };
  });
  // Barajar la posición visual (columna) para que los conflictos no queden siempre a la izquierda
  for (let i = elementos.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [elementos[i], elementos[j]] = [elementos[j], elementos[i]];
  }
  return { viga, cieloRaso, holgura: HOLGURA, elementos };
}

/** ids de los elementos en conflicto. */
export function conflictos(reto) {
  return reto.elementos.filter((e) => clasificar(e, reto.viga, reto.holgura) !== 'ok').map((e) => e.id);
}

/** Fase 1: compara la selección del equipo con los conflictos reales. */
export function evaluarDeteccion(reto, seleccion) {
  const reales = new Set(conflictos(reto));
  const sel = new Set(seleccion);
  const aciertos = [...sel].filter((id) => reales.has(id)).length;
  const falsos = [...sel].filter((id) => !reales.has(id)).length;
  const omitidos = [...reales].filter((id) => !sel.has(id)).length;
  return { aciertos, falsos, omitidos, total: reales.size, perfecto: falsos === 0 && omitidos === 0 };
}

/**
 * Fase 2: `nuevosZMax` = { id: zMax propuesto } para los elementos a reubicar.
 * Un elemento queda resuelto si cumple la holgura y no baja del cielo raso.
 */
export function evaluarResolucion(reto, nuevosZMax) {
  const detalle = conflictos(reto).map((id) => {
    const e = reto.elementos.find((x) => x.id === id);
    const zMax = r2(nuevosZMax[id] ?? e.zMax);
    const zMin = r2(zMax - e.alto);
    const holguraOk = zMax <= r2(reto.viga.zMin - reto.holgura) + 1e-9;
    const cieloOk = zMin >= reto.cieloRaso - 1e-9;
    return { id, zMax, zMin, holguraOk, cieloOk, resuelto: holguraOk && cieloOk };
  });
  return { detalle, resueltos: detalle.filter((d) => d.resuelto).length, total: detalle.length };
}
