import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearBackendSheets } from '../src/core/backend/sheets.js';

function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test('sheets: guarda local y envía equipo y estación (con nombre) al receptor', async () => {
  const envios = [];
  const fetchFn = async (url, op) => { envios.push({ url, op }); return {}; };
  const b = crearBackendSheets({ url: 'https://script.google.com/x/exec', fetchFn, storage: memoria() });
  await b.guardarResumen({ equipoId: 'e1', equipoNombre: 'Los Puentes', puntos: 80 });
  await b.guardarCompletada('e1', { estacionId: 'concreto', puntos: 80, inicioMs: 1, finMs: 2, completado: true, detalle: {} });
  assert.equal(envios.length, 2);
  assert.equal(envios[0].op.mode, 'no-cors');
  assert.match(envios[0].op.headers['Content-Type'], /text\/plain/);
  const [eq, es] = envios.map((e) => JSON.parse(e.op.body));
  assert.equal(eq.tipo, 'equipo');
  assert.equal(es.tipo, 'estacion');
  assert.equal(es.equipoNombre, 'Los Puentes');
  assert.equal((await b.listarTabla()).length, 1); // y quedó en local
});

test('sheets: si la red falla, el error sube (el sincronizador reintenta)', async () => {
  const b = crearBackendSheets({ url: 'u', fetchFn: async () => { throw new Error('sin red'); }, storage: memoria() });
  await assert.rejects(() => b.guardarResumen({ equipoId: 'e1', puntos: 0 }), /sin red/);
});
