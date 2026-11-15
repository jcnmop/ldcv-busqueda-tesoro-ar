import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoInicial, crearEquipo, completar, estacionActual, puedeJugar, terminada,
  puntosTotales, resumen, slug, crearAlmacen, CLAVE_STORAGE,
} from '../src/core/estado.js';
import { ordenarTabla } from '../src/core/backend/local.js';

const IDS = ['a', 'b', 'c'];

function memoria() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), _m: m };
}

test('slug normaliza nombres', () => {
  assert.equal(slug('Los Voladizos  ÁÉ!'), 'los-voladizos-ae');
});

test('crearEquipo asigna id, ruta completa y marca de inicio', () => {
  const e = crearEquipo(estadoInicial(), 'Los Voladizos', IDS, 'clave', 1000);
  assert.match(e.equipoId, /^los-voladizos-[0-9a-z]{3}$/);
  assert.deepEqual([...e.ruta].sort(), IDS);
  assert.equal(e.inicioPartidaMs, 1000);
  assert.equal(e.sincronizado, false);
});

test('crearEquipo rechaza nombres cortos', () => {
  assert.throws(() => crearEquipo(estadoInicial(), ' x ', IDS, 'k'));
});

test('completar respeta la secuencia y cierra la partida al final', () => {
  let e = crearEquipo(estadoInicial(), 'Equipo', IDS, 'k', 0);
  const [s1, s2, s3] = e.ruta;
  assert.equal(estacionActual(e), s1);
  assert.equal(puedeJugar(e, s2), false);
  assert.throws(() => completar(e, { estacionId: s2, puntos: 10, inicioMs: 0, finMs: 5, completado: true }));

  e = completar(e, { estacionId: s1, puntos: 80, inicioMs: 10, finMs: 50, completado: true });
  e = completar(e, { estacionId: s2, puntos: 0, inicioMs: 60, finMs: 100, completado: false });
  assert.equal(terminada(e), false);
  assert.equal(e.finPartidaMs, null);
  e = completar(e, { estacionId: s3, puntos: 100, inicioMs: 110, finMs: 200, completado: true });
  assert.equal(terminada(e), true);
  assert.equal(e.finPartidaMs, 200);
  assert.equal(puntosTotales(e), 180);
  const r = resumen(e);
  assert.equal(r.duracionMs, 200);
  assert.equal(r.estacionesCompletadas, 3);
});

test('el almacén persiste y restaura', () => {
  const st = memoria();
  const a = crearAlmacen(st);
  a.set(crearEquipo(a.get(), 'Persistente', IDS, 'k', 5));
  assert.ok(st.getItem(CLAVE_STORAGE));
  const b = crearAlmacen(st);
  assert.equal(b.get().equipoNombre, 'Persistente');
  let avisos = 0;
  b.suscribir(() => avisos++);
  b.reiniciar();
  assert.equal(avisos, 1);
  assert.equal(b.get().equipoId, null);
});

test('ordenarTabla: puntos, luego estaciones, luego menor duración', () => {
  const t = ordenarTabla([
    { equipoId: 'a', puntos: 100, estacionesCompletadas: 3, duracionMs: 900 },
    { equipoId: 'b', puntos: 120, estacionesCompletadas: 2, duracionMs: null },
    { equipoId: 'c', puntos: 100, estacionesCompletadas: 3, duracionMs: 500 },
    { equipoId: 'd', puntos: 100, estacionesCompletadas: 2, duracionMs: null },
  ]);
  assert.deepEqual(t.map((f) => f.equipoId), ['b', 'c', 'a', 'd']);
});
