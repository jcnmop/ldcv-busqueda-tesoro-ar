/**
 * Lógica pura de "Presa y empuje hidrostático".
 *
 * Presa de gravedad con paramento aguas arriba VERTICAL y agua de profundidad h.
 * Por metro de ancho (b = 1 m):
 *   - La presión crece linealmente con la profundidad: p(z) = γ·(h − z)   [kPa]
 *   - Diagrama de presiones triangular: máximo γ·h en el fondo.
 *   - Fuerza resultante = área del triángulo: F = γ·h²/2      [kN/m]
 *   - Actúa en el centroide del triángulo: a h/3 desde el FONDO.
 * γ del agua = 9.81 kN/m³.
 */
export const GAMMA = 9.81;

export function fuerza(h, gamma = GAMMA) { return (gamma * h * h) / 2; }
export function alturaResultante(h) { return h / 3; }

/**
 * @param {() => number} aleatorio
 * @returns {{ h: number, F: number, yR: number, opciones: { id: string, valor: number, formula: string }[], correcta: string }}
 */
export function generarReto(aleatorio = Math.random) {
  const h = 4 + Math.round(aleatorio() * 16) * 0.5; // 4.0 .. 12.0 m, pasos de 0.5
  const F = fuerza(h);
  // Distractores con errores conceptuales típicos
  const candidatos = [
    { id: 'correcta', valor: F, formula: 'γ·h²/2' },
    { id: 'sin-mitad', valor: GAMMA * h * h, formula: 'γ·h²' },
    { id: 'presion-fondo', valor: GAMMA * h, formula: 'γ·h' },
    { id: 'tercio', valor: (GAMMA * h * h) / 3, formula: 'γ·h²/3' },
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
