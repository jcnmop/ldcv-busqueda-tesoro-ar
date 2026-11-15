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
import ojo from '../src/stations/ojo-ingeniero/index.js';

test('ojo-ingeniero cumple el contrato', () => {
  assert.deepEqual(validarEstacion(ojo), []);
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


  const o = ojo.explicarSolucion({ que: 'la altura', real: 14.2, unidad: 'm', estimado: 12, errorPct: 15.5 });
  assert.ok(o.some((l) => l.includes('14.2')));

  // Sin detalle no revienta
  for (const e of [viga, secuencia, ojo]) assert.deepEqual(e.explicarSolucion(undefined), []);
});

test('validarEstacion revisa los campos opcionales', () => {
  const base = { ...viga };
  assert.deepEqual(validarEstacion({ ...base, orientacion: 'mesa' }), []);
  assert.ok(validarEstacion({ ...base, orientacion: 'techo' }).length === 1);
  assert.ok(validarEstacion({ ...base, alTocar: 'no' }).length === 1);
});

// ---- Presa y empuje hidrostático ----
import presa from '../src/stations/presa-hidrostatica/index.js';
import * as presaLogica from '../src/stations/presa-hidrostatica/logica.js';

test('presa: cumple el contrato', () => {
  assert.deepEqual(validarEstacion(presa), []);
});

test('presa: física del empuje hidrostático', () => {
  assert.equal(presaLogica.fuerza(10), 500); // γ≈10: 10·100/2
  assert.equal(presaLogica.fuerza(6), 180);
  assert.ok(Math.abs(presaLogica.alturaResultante(9) - 3) < 1e-12);
});

test('presa: reto con 4 opciones distintas y una sola correcta', () => {
  const r = rngFijo(11);
  for (let i = 0; i < 100; i++) {
    const reto = presaLogica.generarReto(r);
    assert.ok([4, 6, 8, 10, 12].includes(reto.h));
    assert.ok(reto.opciones.every((o) => Number.isInteger(o.valor)), 'opciones enteras para cálculo mental');
    assert.equal(reto.opciones.length, 4);
    assert.equal(new Set(reto.opciones.map((o) => o.valor.toFixed(3))).size, 4);
    assert.equal(reto.opciones.filter((o) => o.id === reto.correcta).length, 1);
  }
});

test('presa: evaluar altura con tolerancia y magnitud', () => {
  const reto = { h: 9, yR: 3, correcta: 'correcta' };
  assert.equal(presaLogica.evaluar(reto, 3.4, 'correcta').correcto, true);   // 0.4 < 0.54
  assert.equal(presaLogica.evaluar(reto, 4.5, 'correcta').alturaOk, false);
  assert.equal(presaLogica.evaluar(reto, 3, 'sin-mitad').fuerzaOk, false);
});

test('presa: puntaje y explicación', () => {
  assert.equal(presa.calcularPuntaje({ completado: true, intentos: 1 }, 0), 100);
  assert.equal(presa.calcularPuntaje({ completado: true, intentos: 2 }, 0), 80);
  assert.equal(presa.calcularPuntaje({ completado: false, aciertos: 1, intentos: 2 }, 0), 30);
  const ex = presa.explicarSolucion({ h: 6, F: 180, yR: 2, yPropuesta: 2.1, opcion: { valor: 180, formula: 'área' }, alturaOk: true, fuerzaOk: true });
  assert.ok(ex.some((l) => l.includes('60 × 6 ÷ 2 = 180')));
  assert.ok(ex.some((l) => l.includes('h/3')));
  assert.deepEqual(presa.explicarSolucion(undefined), []);
});

// ---- Agua para el barrio ----
import agua from '../src/stations/agua-barrio/index.js';
import * as aguaLogica from '../src/stations/agua-barrio/logica.js';

test('agua: cumple el contrato', () => {
  assert.deepEqual(validarEstacion(agua), []);
});

test('agua: consumo = casas × 4 × dotación / 1000', () => {
  assert.equal(aguaLogica.consumoM3(12, 200), 9.6);
  assert.equal(aguaLogica.consumoM3(11, 150), 6.6);
});

test('agua: retos coherentes (opciones distintas, decisión del tanque correcta)', () => {
  const r = rngFijo(17);
  let si = 0;
  for (let i = 0; i < 300; i++) {
    const reto = aguaLogica.generarReto(r);
    assert.equal(reto.casas, reto.visibles + reto.ocultas);
    assert.ok(reto.ocultas >= 2, 'siempre hay casas ocultas que obligan a girar');
    assert.equal(new Set(reto.opciones.map((o) => o.valor)).size, 4);
    assert.equal(reto.alcanza, reto.tanque >= reto.consumo);
    if (reto.alcanza) si++;
  }
  assert.ok(si > 60 && si < 240, `balance sí/no razonable (${si}/300)`);
});

test('agua: evaluar, puntaje y explicación', () => {
  const reto = aguaLogica.generarReto(rngFijo(4));
  const bien = aguaLogica.evaluar(reto, { casas: reto.casas, opcionId: 'correcta', alcanza: reto.alcanza });
  assert.equal(bien.correcto, true);
  const malConteo = aguaLogica.evaluar(reto, { casas: reto.visibles, opcionId: 'correcta', alcanza: reto.alcanza });
  assert.equal(malConteo.conteoOk, false);
  assert.equal(agua.calcularPuntaje({ completado: true, intentos: 1 }, 0), 100);
  assert.equal(agua.calcularPuntaje({ completado: false, aciertos: 2, intentos: 2 }, 0), 50);
  const ex = agua.explicarSolucion({ ...reto, respuestaCasas: reto.casas, conteoOk: true, consumoOk: true, decisionOk: true });
  assert.ok(ex.length === 4 && ex[1].includes('Población'));
  assert.deepEqual(agua.explicarSolucion(undefined), []);
});
