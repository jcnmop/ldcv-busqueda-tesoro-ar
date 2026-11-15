/**
 * Lógica pura del minijuego "Viga en equilibrio" (sin DOM, para poder probarla).
 *
 * Viga simplemente apoyada de longitud L (apoyos en x=0 y x=L). Hay una carga fija
 * P1 en x1. El equipo debe colocar una segunda carga P2 en la posición x2 tal que
 * las reacciones en ambos apoyos sean iguales (RA = RB).
 *
 * Equilibrio de momentos respecto a B:  RA·L = P1·(L − x1) + P2·(L − x2)
 * Condición RA = RB = (P1+P2)/2  ⇒  x2 = (L − P1·(2·x1 − L)/P2) / 2
 */

export function reacciones({ L, P1, x1, P2, x2 }) {
  const RA = (P1 * (L - x1) + P2 * (L - x2)) / L;
  const RB = P1 + P2 - RA;
  return { RA, RB };
}

export function posicionObjetivo({ L, P1, x1, P2 }) {
  return (L - (P1 * (2 * x1 - L)) / P2) / 2;
}

/**
 * Genera un reto con solución dentro de la viga (margen 10 % en cada extremo).
 * @param {() => number} aleatorio  función en [0,1); inyectable para pruebas
 */
export function generarReto(aleatorio = Math.random) {
  const L = 6 + Math.floor(aleatorio() * 5); // 6..10 m
  for (let i = 0; i < 200; i++) {
    const P1 = 10 + Math.floor(aleatorio() * 7) * 5; // 10..40 kN
    const P2 = 10 + Math.floor(aleatorio() * 7) * 5;
    const x1 = Math.round((0.5 + aleatorio() * (L - 1)) * 2) / 2; // múltiplos de 0.5
    const x2 = posicionObjetivo({ L, P1, x1, P2 });
    if (x2 >= L * 0.1 && x2 <= L * 0.9 && Math.abs(x2 - x1) >= 0.5) {
      return { L, P1, x1, P2, objetivo: x2 };
    }
  }
  return { L: 8, P1: 20, x1: 2, P2: 20, objetivo: 6 }; // respaldo determinista
}

/**
 * Evalúa una propuesta. Tolerancia relativa a L (2 % por defecto ≈ 16 cm en 8 m).
 */
export function evaluar(reto, x2, toleranciaRel = 0.02) {
  const error = Math.abs(x2 - reto.objetivo);
  const { RA, RB } = reacciones({ ...reto, x2 });
  return { correcto: error <= reto.L * toleranciaRel, error, RA, RB, inclinaHacia: RA > RB ? 'A' : RA < RB ? 'B' : null };
}
