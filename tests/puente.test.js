import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIEZAS, piezasEnJuego, piezasDelEquipo, piezaDeEstacion, puenteCompleto } from '../src/core/puente.js';

const base = { ruta: ['c', 'a', 'd', 'b'], completadas: [] };

test('piezasEnJuego respeta el número de estaciones y el máximo disponible', () => {
  assert.equal(piezasEnJuego(4).length, 4);
  assert.equal(piezasEnJuego(0).length, 0);
  assert.equal(piezasEnJuego(99).length, PIEZAS.length);
  assert.equal(piezasEnJuego(4)[0].id, 'pilas'); // siempre se construye desde abajo
});

test('piezasDelEquipo: pendiente, obtenida y perdida según el resultado', () => {
  const estado = { ...base, completadas: [{ estacionId: 'c', completado: true }, { estacionId: 'a', completado: false }] };
  const p = piezasDelEquipo(estado);
  assert.deepEqual(p.map((x) => x.estado), ['obtenida', 'perdida', 'pendiente', 'pendiente']);
  assert.deepEqual(p.map((x) => x.estacionId), base.ruta);
});

test('piezaDeEstacion sigue la posición en la ruta, no el id', () => {
  assert.equal(piezaDeEstacion(base, 'c').id, 'pilas');
  assert.equal(piezaDeEstacion(base, 'b').id, 'pendolas');
  assert.equal(piezaDeEstacion(base, 'zz'), null);
});

test('puenteCompleto solo si todas las piezas se obtuvieron', () => {
  const todas = { ...base, completadas: base.ruta.map((id) => ({ estacionId: id, completado: true })) };
  assert.equal(puenteCompleto(todas), true);
  const unaMal = { ...todas, completadas: todas.completadas.map((c, i) => (i === 2 ? { ...c, completado: false } : c)) };
  assert.equal(puenteCompleto(unaMal), false);
  assert.equal(puenteCompleto(base), false);
});
