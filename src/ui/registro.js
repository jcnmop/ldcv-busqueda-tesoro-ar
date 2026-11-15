import { h } from '../core/router.js';
import { crearEquipo } from '../core/estado.js';
import { pantallaPista } from './pista.js';

export function pantallaRegistro(raiz, { almacen, estaciones, claveEvento, ir }) {
  raiz.innerHTML = h`
    <h1>Búsqueda del Tesoro AR</h1>
    <p class="muted">Laboratorio de Diseño y Construcción Virtual · Ingeniería Civil UCR</p>
    <div class="tarjeta">
      <h2>Registre su equipo</h2>
      <p>Van a recorrer ${estaciones.length} estaciones por el campus. En cada una, apunten
      la cámara al marcador para descubrir el reto.</p>
      <label for="nombre" class="muted">Nombre del equipo</label>
      <input id="nombre" type="text" maxlength="40" autocomplete="off" placeholder="Ej: Los Voladizos" />
      <p id="error" class="muted" style="color: var(--error)" hidden></p>
      <button id="empezar">Empezar</button>
    </div>
    <p class="muted">Consejos: lleven el celular con batería, activen el sonido y manténganse juntos.
    La ruta de cada equipo es distinta.</p>
  `;

  const input = raiz.querySelector('#nombre');
  const error = raiz.querySelector('#error');
  const btn = raiz.querySelector('#empezar');

  const empezar = () => {
    try {
      const nuevo = crearEquipo(almacen.get(), input.value, estaciones.map((e) => e.id), claveEvento);
      almacen.set(nuevo);
      ir(pantallaPista);
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    }
  };
  btn.addEventListener('click', empezar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') empezar(); });
  input.focus();
}
