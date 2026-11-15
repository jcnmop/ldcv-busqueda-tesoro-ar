/**
 * ARRANQUE de la app del jugador.
 * Lee el estado guardado y decide la primera pantalla.
 */
import { estaciones, porId } from './stations/registro.js';
import { crearAlmacen, terminada } from './core/estado.js';
import { crearRouter } from './core/router.js';
import { obtenerBackend } from './core/backend/index.js';
import { crearSincronizador } from './core/sincronizador.js';
import { pantallaRegistro } from './ui/registro.js';
import { pantallaPista } from './ui/pista.js';
import { pantallaFinal } from './ui/final.js';

const claveEvento = import.meta.env.VITE_CLAVE_EVENTO || 'desarrollo';
const almacen = crearAlmacen();
const router = crearRouter(document.getElementById('app'), { almacen, estaciones, porId, claveEvento, obtenerBackend });

crearSincronizador(almacen, obtenerBackend).sincronizar();

const estado = almacen.get();
if (!estado.equipoId) router.ir(pantallaRegistro);
else if (terminada(estado)) router.ir(pantallaFinal);
else router.ir(pantallaPista);

// Para depurar desde la consola del celular (chrome://inspect o Safari remoto)
globalThis.__tesoro = { almacen, estaciones };
