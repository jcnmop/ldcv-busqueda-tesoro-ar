import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEstacion } from '../src/stations/contrato.js';
import viga from '../src/stations/viga-equilibrio/index.js';
import secuencia from '../src/stations/secuencia-constructiva/index.js';
import * as vigaLogica from '../src/stations/viga-equilibrio/logica.js';
import * as secLogica from '../src/stations/secuencia-constructiva/logica.js';

// Generador determinista para pruebas
function rngFijo(semilla = 1) {
  let s = semilla;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

test('las estaciones reales cumplen el contrato', () => {
  assert.deepEqual(validarEstacion(viga), []);
  assert.deepEqual(validarEstacion(secuencia), []);
});

test('viga: reacciones y posición objetivo son consistentes', () => {
  const reto = { L: 8, P1: 20, x1: 2, P2: 20 };
  const x2 = vigaLogica.posicionObjetivo(reto);
  assert.equal(x2, 6);
  const { RA, RB } = vigaLogica.reacciones({ ...reto, x2 });
  assert.ok(Math.abs(RA - RB) < 1e-9);
  assert.ok(Math.abs(RA + RB - 40) < 1e-9);
});

test('viga: generarReto siempre da solución dentro de la viga', () => {
  const r = rngFijo(42);
  for (let i = 0; i < 300; i++) {
    const reto = vigaLogica.generarReto(r);
    assert.ok(reto.objetivo >= 0 && reto.objetivo <= reto.L, JSON.stringify(reto));
    const { RA, RB } = vigaLogica.reacciones({ ...reto, x2: reto.objetivo });
    assert.ok(Math.abs(RA - RB) < 1e-9);
  }
});

test('viga: evaluar acepta dentro de tolerancia e indica inclinación', () => {
  const reto = { L: 8, P1: 20, x1: 2, P2: 20, objetivo: 6 };
  assert.equal(vigaLogica.evaluar(reto, 6.1).correcto, true);
  const mal = vigaLogica.evaluar(reto, 3);
  assert.equal(mal.correcto, false);
  assert.equal(mal.inclinaHacia, 'A');
});

test('viga: puntaje penaliza intentos y vale 0 si no completó', () => {
  assert.equal(viga.calcularPuntaje({ completado: false, intentos: 3 }, 1000), 0);
  const uno = viga.calcularPuntaje({ completado: true, intentos: 1 }, 0);
  const tres = viga.calcularPuntaje({ completado: true, intentos: 3 }, 0);
  assert.equal(uno, 100);
  assert.equal(tres, 80);
});

test('secuencia: generarReto baraja y evaluar cuenta aciertos', () => {
  const reto = secLogica.generarReto(rngFijo(7));
  assert.equal(reto.desordenados.length, reto.correcto.length);
  assert.notDeepEqual(reto.desordenados, reto.correcto);
  assert.equal(secLogica.evaluar(reto, reto.correcto).correcto, true);
  const parcial = secLogica.evaluar(reto, reto.desordenados);
  assert.ok(parcial.aciertos < reto.correcto.length);
});

test('secuencia: puntaje completo vs parcial', () => {
  assert.equal(secuencia.calcularPuntaje({ completado: true, aciertos: 6, intentos: 1, detalle: { total: 6 } }, 0), 100);
  assert.equal(secuencia.calcularPuntaje({ completado: true, aciertos: 6, intentos: 2, detalle: { total: 6 } }, 0), 85);
  const parcial = secuencia.calcularPuntaje({ completado: false, aciertos: 3, intentos: 2, detalle: { total: 6 } }, 0);
  assert.equal(parcial, 50);
});
