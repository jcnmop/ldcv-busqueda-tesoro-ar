/**
 * CONFIGURACIÓN DEL EVENTO (un solo lugar para las decisiones del organizador).
 */

/**
 * Cuándo puede un equipo ver las respuestas correctas de los retos:
 *   'al-final' (recomendado): solo al terminar todo el recorrido. Evita que se pasen
 *              respuestas entre equipos durante la competencia.
 *   'siempre': también en la pantalla de resultado de cada estación (útil en clase).
 *   'nunca'  : no se muestran.
 */
export const MOSTRAR_RESPUESTAS = 'siempre'; // decisión 2026-11-15: respuesta y referencia tras cada reto

/**
 * AVATAR DE BIENVENIDA. Para usar el avatar propio: exportar desde Blender un .glb con
 * animaciones (ej: "Saludo", "Reposo"), copiarlo a public/modelos/ y cambiar estos valores.
 */
export const AVATAR = {
  modelo: 'modelos/robot.glb',     // relativo a la raíz publicada
  nombre: 'Robi',                  // cómo se presenta el guía
  animacionSaludo: 'Wave',         // se reproduce al aparecer y al tocarlo
  animacionReposo: 'Idle',
  mensaje: '¡Hola! Bienvenidos al Laboratorio de Diseño y Construcción Virtual. '
    + 'Hoy van a recorrer el campus buscando estaciones con realidad aumentada. '
    + 'En cada una ganarán una pieza para construir su propio puente. ¿Listos?',
};

/** Crédito que aparece en pequeño en la bienvenida. */
export const CREADO_POR = 'Creado por Juan Carlos Navarrete';

/**
 * REGISTRO PRIVADO DE PARTIDAS (Google Sheets). Pegar aquí la URL de la aplicación web de
 * Apps Script (termina en /exec). Vacío = cada celular guarda solo lo suyo (modo local).
 * Instalación: docs/REGISTRO.md. Los estudiantes no ven esta hoja.
 */
export const REGISTRO_SHEETS_URL = '';
