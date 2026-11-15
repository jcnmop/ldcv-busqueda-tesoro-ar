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

test('clash: 1 a 3 conflictos, siempre resolubles, y los que cumplen están sobre el cielo raso', () => {
  const r = rngFijo(3);
  for (let i = 0; i < 300; i++) {
    const reto = clashLogica.generarReto(r);
    const ids = clashLogica.conflictos(reto);
    assert.ok(ids.length >= 1 && ids.length <= 3, `conflictos: ${ids.length}`);
    assert.ok(ids.some((id) => clashLogica.clasificar(reto.elementos.find((e) => e.id === id), reto.viga) === 'duro'));
    for (const e of reto.elementos) {
      if (!ids.includes(e.id)) assert.ok(e.zMin >= reto.cieloRaso - 1e-9, 'elemento OK bajo el cielo raso');
      // Siempre existe una posición válida: tope en el límite de holgura y fondo sobre el cielo raso
      assert.ok(reto.viga.zMin - reto.holgura - e.alto >= reto.cieloRaso - 1e-9, `${e.nombre} no cabe`);
    }
  }
});

test('clash: clasificar duro / blando / ok', () => {
  const viga = { zMin: 3.0, zMax: 3.5 };
  assert.equal(clashLogica.clasificar({ zMax: 3.05 }, viga), 'duro');
  assert.equal(clashLogica.clasificar({ zMax: 2.98 }, viga), 'blando');
  assert.equal(clashLogica.clasificar({ zMax: 2.95 }, viga), 'ok');
});

test('clash: evaluar detección y resolución', () => {
  const reto = clashLogica.generarReto(rngFijo(21));
  const ids = clashLogica.conflictos(reto);
  const otro = reto.elementos.find((e) => !ids.includes(e.id));
  const det = clashLogica.evaluarDeteccion(reto, [...ids.slice(1), otro.id]);
  assert.equal(det.omitidos, 1); assert.equal(det.falsos, 1);
  assert.equal(clashLogica.evaluarDeteccion(reto, ids).perfecto, true);
  const limite = Math.round((reto.viga.zMin - reto.holgura) * 100) / 100;
  const bien = Object.fromEntries(ids.map((id) => [id, limite]));
  assert.equal(clashLogica.evaluarResolucion(reto, bien).resueltos, ids.length);
  const muyAbajo = Object.fromEntries(ids.map((id) => [id, reto.cieloRaso]));
  assert.equal(clashLogica.evaluarResolucion(reto, muyAbajo).resueltos, 0);
});

test('clash: puntaje combina detección y resolución', () => {
  const r = (a, f, t, res) => ({ detalle: { deteccion: { aciertos: a, falsos: f, total: t }, resolucion: { resueltos: res, total: t } } });
  assert.equal(clash.calcularPuntaje(r(2, 0, 2, 2), 0), 100);
  assert.equal(clash.calcularPuntaje(r(1, 0, 2, 2), 0), 75);
  assert.equal(clash.calcularPuntaje(r(2, 2, 2, 0), 0), 0);
  assert.equal(clash.calcularPuntaje({ detalle: null }, 0), 0);
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

  const c = clash.explicarSolucion({ vigaZMin: 3.0, vigaZMax: 3.5, cieloRaso: 2.5, holgura: 0.05,
    conflictos: [{ nombre: 'Ducto de aire', alto: 0.4, zMaxOriginal: 3.1, tipo: 'duro', zMaxFinal: 2.95, resuelto: true }],
    deteccion: { aciertos: 1, falsos: 0, omitidos: 0, total: 1 }, resolucion: { resueltos: 1, total: 1 } });
  assert.ok(c.some((l) => l.includes('Ducto de aire') && l.includes('duro')));

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
