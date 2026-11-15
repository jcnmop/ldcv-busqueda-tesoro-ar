import { h } from '../core/router.js';
import { AVATAR, CREADO_POR } from '../config.js';
import { pantallaRegistro } from './registro.js';

/**
 * BIENVENIDA: el avatar (guía) saluda en 3D con un globo de diálogo antes del registro.
 * El modelo y los textos se cambian en src/config.js (AVATAR, CREADO_POR).
 * Tocar al avatar repite el saludo.
 */
export function pantallaBienvenida(raiz, { ir, estaciones }) {
  raiz.innerHTML = h`
    <div style="text-align:center">
      <p class="muted" style="letter-spacing:.08em;text-transform:uppercase;font-size:.8rem">Ingeniería Civil · UCR</p>
      <h1>Bienvenidos al LDCV</h1>
      <p class="muted">Laboratorio de Diseño y Construcción Virtual</p>
    </div>
    <div id="avatar" style="position:relative;height:300px;border-radius:var(--radio);overflow:hidden;
      background:radial-gradient(ellipse at 50% 80%, #1e3a5f 0%, #0b1f3a 70%)"></div>
    <div class="tarjeta" style="position:relative">
      <div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;
        border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:10px solid var(--azul-claro)"></div>
      <h2>${AVATAR.nombre}</h2>
      <p id="globo"></p>
    </div>
    <button id="comenzar">¡Comenzar!</button>
    <p class="muted" style="text-align:center">${estaciones.length} estaciones · realidad aumentada · un puente por construir</p>
    <p class="muted" style="text-align:center;font-size:.72rem;opacity:.75;margin-top:8px">${CREADO_POR} · LDCV-UCR</p>
  `;

  // Texto que aparece letra por letra, como un diálogo
  const globo = raiz.querySelector('#globo');
  let i = 0;
  const escribir = setInterval(() => {
    i += 2;
    globo.textContent = AVATAR.mensaje.slice(0, i);
    if (i >= AVATAR.mensaje.length) clearInterval(escribir);
  }, 25);
  globo.addEventListener('click', () => { i = AVATAR.mensaje.length; globo.textContent = AVATAR.mensaje; clearInterval(escribir); });

  raiz.querySelector('#comenzar').addEventListener('click', () => ir(pantallaRegistro));

  // Avatar 3D (fuera de la RA): cámara fija, el personaje saluda; tocarlo repite el saludo
  let destruir = null;
  let cancelado = false;
  const cont = raiz.querySelector('#avatar');
  (async () => {
    try {
      const THREE = await import('three');
      const { cargarGLB } = await import('../ar/modelos.js');
      if (cancelado) return;
      const ancho = cont.clientWidth || 340, alto = cont.clientHeight || 300;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(ancho, alto);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      cont.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, ancho / alto, 0.1, 50);
      camera.position.set(0, 1.0, 4.4);
      camera.lookAt(0, 0.85, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 1.4));
      const sol = new THREE.DirectionalLight(0xffffff, 1.1);
      sol.position.set(2, 4, 3);
      scene.add(sol);
      const piso = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: 0xf2a900, transparent: true, opacity: 0.25 }));
      piso.rotation.x = -Math.PI / 2;
      scene.add(piso);

      const avatar = cargarGLB(THREE, `${import.meta.env.BASE_URL}${AVATAR.modelo}`, {
        altura: 1.7, acostar: false, animacion: AVATAR.animacionReposo,
      });
      scene.add(avatar);
      avatar.userData.listo.then(() => avatar.userData.reproducir(AVATAR.animacionSaludo, { unaVez: true })).catch(() => {});

      // Tocar al avatar: saluda otra vez
      renderer.domElement.style.cursor = 'pointer';
      renderer.domElement.addEventListener('click', () => avatar.userData.reproducir?.(AVATAR.animacionSaludo, { unaVez: true }));

      const reloj = new THREE.Clock();
      let t = 0;
      renderer.setAnimationLoop(() => {
        const dt = Math.min(reloj.getDelta(), 0.1);
        t += dt;
        avatar.userData.actualizar?.(dt);
        avatar.traverse((o) => { if (o !== avatar) o.userData?.girar && (o.rotation.y += o.userData.girar * dt); });
        avatar.rotation.y = Math.sin(t * 0.5) * 0.25; // leve balanceo para que se sienta vivo
        renderer.render(scene, camera);
      });
      destruir = () => {
        renderer.setAnimationLoop(null);
        scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
        renderer.dispose();
      };
      globalThis.__avatar = avatar; // para pruebas
    } catch (e) {
      console.warn('[bienvenida] avatar no disponible:', e);
    }
  })();

  return () => { cancelado = true; clearInterval(escribir); destruir?.(); };
}
