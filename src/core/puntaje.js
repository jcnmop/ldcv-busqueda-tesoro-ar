/**
 * Ayudantes de puntaje compartidos por las estaciones.
 */

/**
 * Puntaje decreciente con el tiempo: 100 % si resuelve al instante,
 * baja linealmente hasta un piso del 40 % al llegar al límite.
 * Así el tiempo importa, pero completar siempre vale más que no completar.
 */
export function puntajePorTiempo(puntosMax, tiempoUsadoMs, tiempoLimiteMs, piso = 0.4) {
  const t = Math.min(Math.max(tiempoUsadoMs, 0), tiempoLimiteMs) / tiempoLimiteMs;
  const factor = 1 - (1 - piso) * t;
  return Math.round(puntosMax * factor);
}

/**
 * Puntaje por aciertos con penalización por intento fallido.
 */
export function puntajePorAciertos(puntosMax, aciertos, totalObjetivos, intentos, penalPorFallo = 0.1) {
  if (totalObjetivos <= 0) return 0;
  const base = (aciertos / totalObjetivos) * puntosMax;
  const fallos = Math.max(intentos - aciertos, 0);
  return Math.max(0, Math.round(base * (1 - penalPorFallo * fallos)));
}
