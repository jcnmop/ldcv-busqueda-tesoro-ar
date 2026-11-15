/**
 * PLANTILLA DE ESTACIÓN
 * Para crear una estación nueva:
 *   1. Copiar esta carpeta a src/stations/<id-de-la-estacion>/
 *   2. Reemplazar los TODO.
 *   3. Agregar el import en src/stations/registro.js
 *   4. Colocar el marcador compilado en public/marcadores/<marcadorId>.mind
 *      (ver docs/MARCADORES.md para generarlo)
 *   5. Correr `npm test` para validar el contrato.
 */
import { puntajePorTiempo } from '../../core/puntaje.js';

let limpiar = () => {};

/** @type {import('../contrato.js').Estacion} */
const estacion = {
  id: 'plantilla',                 // TODO kebab-case único
  nombre: 'Estación de plantilla', // TODO
  marcadorId: 'plantilla',         // TODO nombre del .mind en public/marcadores/
  pista: 'TODO: pista para encontrar el punto físico.',
  tiempoLimiteMs: 120000,
  puntosMax: 100,

  crearObjeto(THREE) {
    // TODO: reemplazar por el objeto real (puede cargar un .glb con GLTFLoader)
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2a900 });
    const cubo = new THREE.Mesh(geo, mat);
    cubo.position.z = 0.25; // sobre el plano del marcador
    return cubo;
  },

  montarMinijuego(contenedor, ctx) {
    contenedor.innerHTML = `
      <h2>${estacion.nombre}</h2>
      <p>TODO: instrucciones del minijuego.</p>
      <button id="resolver">Resolver</button>
    `;
    const btn = contenedor.querySelector('#resolver');
    const onClick = () => ctx.terminar({ completado: true, aciertos: 1, intentos: 1 });
    btn.addEventListener('click', onClick);
    limpiar = () => btn.removeEventListener('click', onClick);
  },

  desmontar() {
    limpiar();
    limpiar = () => {};
  },

  calcularPuntaje(resultado, tiempoUsadoMs) {
    if (!resultado.completado) return 0;
    return puntajePorTiempo(estacion.puntosMax, tiempoUsadoMs, estacion.tiempoLimiteMs);
  },
};

export default estacion;
