import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rutaDeEquipo, esSiguiente, hash32 } from '../src/core/rutas.js';
import { puntajePorTiempo, puntajePorAciertos } from '../src/core/puntaje.js';
import { validarEstacion } from '../src/stations/contrato.js';
import plantilla from '../src/stations/_plantilla/index.js';

const IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

test('la ruta es determinista para el mismo equipo', () => {
  assert.deepEqual(rutaDeEquipo('equipo-01', IDS, 'clave'), rutaDeEquipo('equipo-01', IDS, 'clave'));
});

test('la ruta es una permutación completa', () => {
  const r = rutaDeEquipo('equipo-07', IDS);
  assert.deepEqual([...r].sort(), IDS);
});

test('equipos distintos reciben rutas distintas (en la gran mayoría de casos)', () => {
  const rutas = new Set();
  for (let i = 0; i < 20; i++) rutas.add(rutaDeEquipo(`equipo-${i}`, IDS, 'x').join(','));
  assert.ok(rutas.size >= 18);
});

test('cambiar la clave del evento cambia las rutas', () => {
  assert.notDeepEqual(rutaDeEquipo('equipo-01', IDS, 'a'), rutaDeEquipo('equipo-01', IDS, 'b'));
});

test('esSiguiente valida la secuencia', () => {
  const ruta = ['c', 'a', 'b'];
  assert.equal(esSiguiente(ruta, [], 'c'), true);
  assert.equal(esSiguiente(ruta, [], 'a'), false);
  assert.equal(esSiguiente(ruta, ['c'], 'a'), true);
});

test('hash32 es estable', () => {
  assert.equal(hash32('ldcv'), hash32('ldcv'));
  assert.notEqual(hash32('ldcv'), hash32('ldcw'));
});

test('puntajePorTiempo: máximo al instante, piso al límite', () => {
  assert.equal(puntajePorTiempo(100, 0, 60000), 100);
  assert.equal(puntajePorTiempo(100, 60000, 60000), 40);
  assert.equal(puntajePorTiempo(100, 90000, 60000), 40); // nunca menos que el piso
});

test('puntajePorAciertos penaliza fallos', () => {
  assert.equal(puntajePorAciertos(100, 5, 5, 5), 100);
  assert.equal(puntajePorAciertos(100, 5, 5, 7), 80);
  assert.equal(puntajePorAciertos(100, 0, 5, 3), 0);
});

test('la plantilla cumple el contrato', () => {
  assert.deepEqual(validarEstacion(plantilla), []);
});

test('validarEstacion detecta campos faltantes', () => {
  const errores = validarEstacion({ id: 'Mal Id' });
  assert.ok(errores.length > 5);
  assert.ok(errores.some((e) => e.includes('kebab-case')));
});
