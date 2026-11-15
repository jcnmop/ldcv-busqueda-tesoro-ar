/**
 * Lógica pura de "Abastecimiento de agua de un barrio".
 *
 * Demanda diaria de agua potable = población × dotación
 *   población = casas × habitantes por casa (4)
 *   dotación  = litros por habitante por día (150, 200 o 250)
 *   consumo (m³/día) = casas × 4 × dotación / 1000
 * El tanque alcanza para un día si su volumen ≥ consumo diario.
 *
 * Algunas casas quedan ocultas detrás de una bodega en el modelo de RA: para contarlas
 * todas hay que girar el barrio. Por eso el conteo es parte del reto.
 */
export const HAB_POR_CASA = 4;

const r1 = (x) => Math.round(x * 10) / 10;

export function consumoM3(casas, dotacion, hab = HAB_POR_CASA) {
  return r1((casas * hab * dotacion) / 1000);
}

/** @param {() => number} aleatorio */
export function generarReto(aleatorio = Math.random) {
  const visibles = 6 + Math.floor(aleatorio() * 5);          // 6..10 a la vista
  const ocultas = 2 + Math.floor(aleatorio() * 3);           // 2..4 detrás de la bodega
  const casas = visibles + ocultas;
  const dotacion = [150, 200, 250][Math.floor(aleatorio() * 3)];
  const consumo = consumoM3(casas, dotacion);
  // Tanque cerca del consumo: a veces alcanza y a veces no (diferencia de 10–30 %)
  const alcanza = aleatorio() < 0.5;
  const factor = alcanza ? 1.1 + aleatorio() * 0.2 : 0.7 + aleatorio() * 0.2;
  const tanque = Math.max(1, Math.round(consumo * factor));
  // Opciones de consumo: la correcta y errores típicos
  const candidatos = [
    { id: 'correcta', valor: consumo, error: '' },
    { id: 'sin-habitantes', valor: r1((casas * dotacion) / 1000), error: 'olvidar multiplicar por 4 habitantes por casa' },
    { id: 'solo-visibles', valor: consumoM3(visibles, dotacion), error: 'contar solo las casas visibles de frente' },
    { id: 'litros', valor: casas * HAB_POR_CASA * dotacion, error: 'no convertir litros a m³ (dividir entre 1000)' },
  ];
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  return { visibles, ocultas, casas, dotacion, habPorCasa: HAB_POR_CASA, consumo, tanque, alcanza: tanque >= consumo, opciones: candidatos };
}

export function evaluar(reto, { casas, opcionId, alcanza }) {
  const conteoOk = Number(casas) === reto.casas;
  const consumoOk = opcionId === 'correcta';
  const decisionOk = alcanza === reto.alcanza;
  return { conteoOk, consumoOk, decisionOk, correcto: conteoOk && consumoOk && decisionOk };
}
