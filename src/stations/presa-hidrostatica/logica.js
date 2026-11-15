/**
 * Lógica pura de "Presa y empuje hidrostático".
 *
 * Presa de gravedad con paramento aguas arriba VERTICAL y agua de profundidad h.
 * Por metro de ancho (b = 1 m):
 *   - La presión crece linealmente con la profundidad: p(z) = γ·(h − z)   [kPa]
 *   - Diagrama de presiones triangular: máximo γ·h en el fondo.
 *   - Fuerza resultante = área del triángulo: F = γ·h²/2      [kN/m]
 *   - Actúa en el centroide del triángulo: a h/3 desde el FONDO.
 * Para cálculo mental se usa γ ≈ 10 kN/m³ (el valor real es 9.81) y h par:
 * así F = 10·h²/2 = 5·h² siempre es un número entero (h = 6 → 180 kN/m).
 */
export const GAMMA = 10;

export function fuerza(h, gamma = GAMMA) { return (gamma * h * h) / 2; }
export function alturaResultante(h) { return h / 3; }

/**
 * @param {() => number} aleatorio
 * @returns {{ h: number, F: number, yR: number, opciones: { id: string, valor: number, formula: string }[], correcta: string }}
 */
export function generarReto(aleatorio = Math.random) {
  const h = [4, 6, 8, 10, 12][Math.floor(aleatorio() * 5)]; // profundidades pares: cálculo mental
  const F = fuerza(h);
  // Distractores con errores conceptuales típicos (todos enteros)
  const candidatos = [
    { id: 'correcta', valor: F, formula: 'área del triángulo = (γ·h)·h/2' },
    { id: 'sin-mitad', valor: GAMMA * h * h, formula: 'rectángulo (γ·h)·h: olvidar dividir entre 2' },
    { id: 'presion-fondo', valor: GAMMA * h, formula: 'solo la presión del fondo γ·h' },
    { id: 'sin-gamma', valor: (h * h) / 2, formula: 'olvidar multiplicar por γ (h·h/2)' },
  ];
  // Barajar (Fisher–Yates) con el generador inyectable
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  return { h, F, yR: alturaResultante(h), opciones: candidatos, correcta: 'correcta' };
}

/** Altura correcta si está a menos del 6 % de h del valor h/3. */
export function evaluar(reto, yPropuesta, opcionId, tolerancia = 0.06) {
  const alturaOk = Math.abs(yPropuesta - reto.yR) <= reto.h * tolerancia;
  const fuerzaOk = opcionId === reto.correcta;
  return { alturaOk, fuerzaOk, correcto: alturaOk && fuerzaOk };
}
