/**
 * CONTRATO DE ESTACIÓN
 * ====================
 * Toda estación de la búsqueda del tesoro es un módulo que exporta por defecto
 * un objeto con esta forma. El núcleo del juego (src/core) no sabe nada de los
 * minijuegos: solo llama a estas funciones en orden.
 *
 * Ciclo de vida de una estación:
 *
 *   1. El jugador llega al punto físico y apunta la cámara al marcador.
 *   2. MindAR reconoce el marcador -> el núcleo busca la estación por `marcadorId`
 *      y valida que sea la que le toca al equipo (antitrampa).
 *   3. El núcleo llama a `crearObjeto(THREE)` y ancla el objeto 3D al marcador.
 *   4. El jugador toca "Jugar" -> el núcleo oculta la cámara y llama a
 *      `montarMinijuego(contenedor, ctx)`.
 *   5. El minijuego, cuando termina, llama a `ctx.terminar(resultado)`.
 *   6. El núcleo calcula el puntaje, lo guarda y pasa a la siguiente estación.
 *
 * Reglas:
 *   - Un minijuego dura entre 1 y 3 minutos. Nunca más.
 *   - Debe funcionar sin conexión. Nunca hacer fetch desde un minijuego.
 *   - Toda la UI del minijuego vive dentro de `contenedor`. No tocar el DOM fuera.
 *   - `desmontar()` debe limpiar timers, listeners y recursos de Three.js.
 */

/**
 * @typedef {Object} ResultadoMinijuego
 * @property {boolean} completado   true si el jugador resolvió el reto
 * @property {number}  aciertos     cantidad de aciertos (según el minijuego)
 * @property {number}  intentos     cantidad de intentos usados
 * @property {Object}  [detalle]    cualquier dato extra para análisis posterior
 */

/**
 * @typedef {Object} ContextoMinijuego
 * @property {string}   equipoId
 * @property {string}   estacionId
 * @property {number}   tiempoLimiteMs  tiempo máximo que el núcleo permite
 * @property {(r: ResultadoMinijuego) => void} terminar  llamar UNA sola vez al finalizar
 * @property {(msg: string) => void} mostrarAyuda  muestra una pista en pantalla
 */

/**
 * @typedef {Object} Estacion
 * @property {string} id              Identificador único, en kebab-case. Ej: "viga-equilibrio"
 * @property {string} nombre          Nombre visible para el jugador
 * @property {string} marcadorId      Nombre del archivo .mind en public/marcadores/ (sin extensión)
 * @property {string} pista           Texto que guía al equipo hacia el punto físico
 * @property {number} tiempoLimiteMs  Tiempo máximo del minijuego (recomendado 60000–180000)
 * @property {number} puntosMax       Puntaje máximo que otorga la estación
 *
 * @property {(THREE: typeof import('three')) => import('three').Object3D} crearObjeto
 *   Devuelve el objeto 3D que aparece anclado sobre el marcador. Mantenerlo liviano
 *   (< 50k triángulos, texturas <= 1024px). Puede cargar un .glb de public/modelos/.
 *
 * @property {(contenedor: HTMLElement, ctx: ContextoMinijuego) => void} montarMinijuego
 *   Construye la UI del minijuego dentro de `contenedor` y arranca la lógica.
 *
 * @property {'pared'|'mesa'} [orientacion]
 *   OPCIONAL (predeterminado 'pared'). Cómo estará colocado el marcador impreso. Diseñe
 *   siempre el objeto "Z arriba" con la base en z=0; la escena lo endereza según el caso.
 *
 * @property {(objeto: import('three').Object3D, ctx: { THREE: typeof import('three') }) => (number|void)} [alTocar]
 *   OPCIONAL. Se llama cada vez que el jugador toca el objeto 3D en RA: solo una REACCIÓN
 *   (animación, sonido, cambio de color). El reto se abre al atrapar la pieza dorada del puente,
 *   que el núcleo agrega automáticamente. Si no se define, el objeto hace un rebote genérico.
 *
 * @property {(detalle: any) => string[]} [explicarSolucion]
 *   OPCIONAL. Recibe el `detalle` que la estación pasó en ctx.terminar() y devuelve líneas
 *   de texto con la respuesta correcta y lo que hizo el equipo. Se muestra según
 *   MOSTRAR_RESPUESTAS (src/config.js). Guardar en `detalle` todo lo necesario para explicar.
 *
 * @property {number} [alturaBase]
 *   OPCIONAL (predeterminado −0.38). Altura de la base del objeto sobre el póster, en unidades
 *   de marcador (0 = centro, −0.5 = borde inferior). Subirla si el objeto queda tapado por los botones.
 *
 * @property {string} [referencia]
 *   OPCIONAL. Concepto, curso o flujo del LDCV que respalda el reto. Se muestra con la respuesta.
 *
 * @property {() => void} desmontar
 *   Limpia todo lo creado por montarMinijuego y crearObjeto.
 *
 * @property {(r: ResultadoMinijuego, tiempoUsadoMs: number) => number} calcularPuntaje
 *   Convierte el resultado en puntos (0..puntosMax). El núcleo lo llama; la estación
 *   decide la fórmula. Ver src/core/puntaje.js para ayudantes comunes.
 */

/**
 * Valida que un módulo cumpla el contrato. Se usa en tests y al cargar el registro.
 * @param {any} e
 * @returns {string[]} lista de errores (vacía si es válida)
 */
export function validarEstacion(e) {
  const errores = [];
  const req = (campo, tipo) => {
    if (typeof e?.[campo] !== tipo) errores.push(`"${campo}" debe ser ${tipo}`);
  };
  req('id', 'string');
  req('nombre', 'string');
  req('marcadorId', 'string');
  req('pista', 'string');
  req('tiempoLimiteMs', 'number');
  req('puntosMax', 'number');
  req('crearObjeto', 'function');
  req('montarMinijuego', 'function');
  req('desmontar', 'function');
  req('calcularPuntaje', 'function');

  const opc = (campo, tipo) => {
    if (e?.[campo] !== undefined && typeof e[campo] !== tipo) errores.push(`"${campo}" (opcional) debe ser ${tipo}`);
  };
  opc('alTocar', 'function');
  opc('explicarSolucion', 'function');
  opc('referencia', 'string');
  opc('alturaBase', 'number');
  if (e?.orientacion !== undefined && !['pared', 'mesa'].includes(e.orientacion)) errores.push('"orientacion" debe ser "pared" o "mesa"');

  if (typeof e?.id === 'string' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) {
    errores.push('"id" debe estar en kebab-case (ej: viga-equilibrio)');
  }
  if (typeof e?.tiempoLimiteMs === 'number' && (e.tiempoLimiteMs < 30000 || e.tiempoLimiteMs > 300000)) {
    errores.push('"tiempoLimiteMs" debe estar entre 30 s y 5 min');
  }
  return errores;
}
