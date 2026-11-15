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

// ---- clash-bim y ojo-ingeniero ----
import clash from '../src/stations/clash-bim/index.js';
import ojo from '../src/stations/ojo-ingeniero/index.js';
import * as clashLogica from '../src/stations/clash-bim/logica.js';

test('clash-bim y ojo-ingeniero cumplen el contrato', () => {
  assert.deepEqual(validarEstacion(clash), []);
  assert.deepEqual(validarEstacion(ojo), []);
});

test('clash: exactamente un elemento colisiona y es el culpable', () => {
  const r = rngFijo(3);
  for (let i = 0; i < 200; i++) {
    const reto = clashLogica.generarReto(r);
    const chocan = reto.elementos.filter((e) => clashLogica.colisiona(e, reto.viga));
    assert.equal(chocan.length, 1, JSON.stringify(reto));
    assert.equal(chocan[0].id, reto.culpableId);
    assert.equal(clashLogica.evaluar(reto, reto.culpableId).correcto, true);
  }
});

test('clash: puntaje penaliza el segundo intento', () => {
  assert.equal(clash.calcularPuntaje({ completado: true, intentos: 1 }, 0), 100);
  assert.equal(clash.calcularPuntaje({ completado: true, intentos: 2 }, 0), 75);
  assert.equal(clash.calcularPuntaje({ completado: false, intentos: 2 }, 0), 0);
});

test('ojo: puntaje por error porcentual', () => {
  assert.equal(ojo.calcularPuntaje({ detalle: { errorPct: 0 } }), 100);
  assert.equal(ojo.calcularPuntaje({ detalle: { errorPct: 15 } }), 50);
  assert.equal(ojo.calcularPuntaje({ detalle: { errorPct: 45 } }), 0);
  assert.equal(ojo.calcularPuntaje({}), 0);
});

// ---- Respuestas correctas (explicarSolucion) y opcionales del contrato ----
test('cada estación real explica su solución a partir del detalle', () => {
  const vRet = vigaLogica.generarReto(rngFijo(5));
  const v = viga.explicarSolucion({ reto: vRet, x2: 1 });
  assert.ok(v.length >= 3 && v.some((l) => l.includes(vRet.objetivo.toFixed(2))));

  const sRet = secLogica.generarReto(rngFijo(9));
  const s = secuencia.explicarSolucion({ titulo: sRet.titulo, correcto: sRet.correcto, propuesta: sRet.desordenados });
  assert.equal(s.length, sRet.correcto.length + 1);

  const c = clash.explicarSolucion({ culpableNombre: 'Ducto de aire', culpableZMin: 2.9, culpableZMax: 3.3, vigaZMin: 3.0, vigaZMax: 3.5 });
  assert.ok(c.some((l) => l.includes('Ducto de aire')));

  const o = ojo.explicarSolucion({ que: 'la altura', real: 14.2, unidad: 'm', estimado: 12, errorPct: 15.5 });
  assert.ok(o.some((l) => l.includes('14.2')));

  // Sin detalle no revienta
  for (const e of [viga, secuencia, clash, ojo]) assert.deepEqual(e.explicarSolucion(undefined), []);
});

test('validarEstacion revisa los campos opcionales', () => {
  const base = { ...viga };
  assert.deepEqual(validarEstacion({ ...base, orientacion: 'mesa' }), []);
  assert.ok(validarEstacion({ ...base, orientacion: 'techo' }).length === 1);
  assert.ok(validarEstacion({ ...base, alTocar: 'no' }).length === 1);
});
