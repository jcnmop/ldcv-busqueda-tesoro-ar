/**
 * ROUTER mínimo: una pantalla a la vez dentro de #app.
 * Cada pantalla es una función (raiz, ctx) => (() => void) | void que devuelve
 * opcionalmente una función de limpieza.
 */
export function crearRouter(raiz, ctx) {
  let limpiarActual = null;
  let pantallaActual = null;

  return {
    ir(pantalla, params = {}) {
      limpiarActual?.();
      raiz.innerHTML = '';
      raiz.scrollTop = 0;
      pantallaActual = pantalla;
      const res = pantalla(raiz, { ...ctx, params, ir: (p, q) => this.ir(p, q) });
      limpiarActual = typeof res === 'function' ? res : null;
    },
    actual: () => pantallaActual,
  };
}

/** Ayudante para construir HTML con escape de texto. */
export function h(strings, ...valores) {
  return strings.reduce((acc, s, i) => acc + s + (i < valores.length ? escapar(valores[i]) : ''), '');
}
export function escapar(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function formatearMs(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
