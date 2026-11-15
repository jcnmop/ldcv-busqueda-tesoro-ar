import { h } from '../core/router.js';
import { piezasDelEquipo, puenteCompleto } from '../core/puente.js';

/**
 * PUENTE EN RA SIN PÓSTER ("en mi espacio").
 * Exporta el puente del equipo a .glb en el mismo celular y lo abre con <model-viewer>,
 * que usa la RA nativa: WebXR en Android (Chrome + ARCore) y Quick Look en iPhone
 * (model-viewer genera el USDZ al vuelo). El puente se coloca sobre el piso o una mesa real.
 * Si el teléfono no soporta RA, queda el visor 3D interactivo y se sugiere el póster META.
 */
export const MODEL_VIEWER_URL = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js';

let cargaModelViewer = null;
function cargarModelViewer() {
  if (customElements.get('model-viewer')) return Promise.resolve();
  cargaModelViewer ??= new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = MODEL_VIEWER_URL;
    s.onload = () => customElements.whenDefined('model-viewer').then(ok);
    s.onerror = () => mal(new Error('No se pudo cargar model-viewer'));
    document.head.appendChild(s);
  });
  return cargaModelViewer;
}

/** Construye el puente del equipo y lo exporta a un Blob .glb (escala real ~1.1 m de largo). */
export async function exportarPuenteGLB(estados) {
  const THREE = await import('three');
  const { construirPuenteEquipo } = await import('./puente3d.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  // Solo piezas ganadas o perdidas (las pendientes son alambre y no tienen sentido en RA)
  const visibles = estados.filter((e) => e.estado !== 'pendiente');
  const { grupo } = construirPuenteEquipo(THREE, visibles, {});
  const escena = new THREE.Scene();
  grupo.scale.setScalar(0.2);
  escena.add(grupo);
  const buffer = await new GLTFExporter().parseAsync(escena, { binary: true });
  return new Blob([buffer], { type: 'model/gltf-binary' });
}

export function pantallaPuenteLibre(raiz, { almacen, ir, params }) {
  const estado = almacen.get();
  const estados = piezasDelEquipo(estado);
  const n = estados.filter((e) => e.estado === 'obtenida').length;
  const volver = params?.volver;

  raiz.innerHTML = h`
    <h1>Su puente, en su espacio</h1>
    <p class="muted">${puenteCompleto(estado) ? '¡Puente completo!' : `${n} de ${estados.length} piezas ganadas.`}
    Gírenlo con el dedo. Toquen <strong>“Ver en mi espacio”</strong> y apunten al piso o a una mesa.</p>
    <div id="visor" class="tarjeta" style="padding:0;overflow:hidden;min-height:360px">
      <p class="muted" style="padding:16px">Preparando el modelo 3D…</p>
    </div>
    <p id="aviso" class="muted"></p>
    <button id="volver" class="secundario">Volver</button>
  `;
  raiz.querySelector('#volver').addEventListener('click', () => { if (volver) ir(volver); });

  let url = null;
  let cancelado = false;
  (async () => {
    try {
      const [blob] = await Promise.all([exportarPuenteGLB(estados), cargarModelViewer()]);
      if (cancelado) return;
      url = URL.createObjectURL(blob);
      const visor = raiz.querySelector('#visor');
      visor.innerHTML = `
        <model-viewer id="mv" src="${url}" alt="Puente del equipo"
          ar ar-modes="webxr quick-look" ar-scale="auto" ar-placement="floor"
          camera-controls auto-rotate shadow-intensity="1" exposure="1.1"
          camera-orbit="30deg 70deg auto" style="width:100%;height:360px;background:#0e2748">
          <button slot="ar-button" style="position:absolute;left:12px;right:12px;bottom:12px;width:auto">
            Ver en mi espacio (RA)
          </button>
        </model-viewer>`;
      const mv = visor.querySelector('#mv');
      globalThis.__puenteLibre = mv; // para pruebas
      mv.addEventListener('load', () => {
        // canActivateAR solo es confiable después de cargar
        if (!mv.canActivateAR) {
          raiz.querySelector('#aviso').innerHTML = 'Este celular o navegador no permite RA sin marcador. '
            + 'Pueden verlo aquí en 3D, o escanear el <strong>póster META</strong> desde la pantalla final.';
        }
      });
      mv.addEventListener('ar-status', (e) => {
        if (e.detail?.status === 'failed') raiz.querySelector('#aviso').textContent = 'No se pudo iniciar la RA. Intenten de nuevo o usen el póster META.';
      });
    } catch (e) {
      console.error(e);
      raiz.querySelector('#visor').innerHTML = h`<p class="muted" style="padding:16px">No se pudo preparar el modelo: ${e.message}</p>`;
    }
  })();

  return () => { cancelado = true; if (url) URL.revokeObjectURL(url); };
}
