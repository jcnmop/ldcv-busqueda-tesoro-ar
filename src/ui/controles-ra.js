/**
 * Botones de manipulación para cualquier pantalla de RA:
 *   [🔄 Girar] [✋ Mover] [⌖ Centrar]
 * Un dedo gira o mueve según el modo activo; dos dedos siempre escalan y giran.
 * Se insertan al inicio del panel inferior (.overlay-ar).
 */
export function montarControlesRA(overlay, escena) {
  const barra = document.createElement('div');
  barra.className = 'controles-ra';
  barra.innerHTML = `
    <button data-modo="girar" aria-pressed="true">🔄 Girar</button>
    <button data-modo="mover" aria-pressed="false">✋ Mover</button>
    <button data-accion="centrar">⌖ Centrar</button>
  `;
  overlay.prepend(barra);
  const marcar = () => barra.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === escena.getModo())));
  barra.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.modo) { escena.setModo(b.dataset.modo); marcar(); navigator.vibrate?.(10); }
    if (b.dataset.accion === 'centrar') { escena.centrar(); navigator.vibrate?.(10); }
  });
  marcar();
  return barra;
}
