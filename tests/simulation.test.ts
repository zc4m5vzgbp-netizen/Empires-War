import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEST_MAP, TEST_TERRAIN } from '../src/content/config.ts';
import { TERRAIN_COUNT, TERRAIN_DEFS, TerrainKind } from '../src/content/terrain.ts';
import { advanceClock, createFixedClock } from '../src/simulation/clock.ts';
import { createRng } from '../src/simulation/rng.ts';
import { createWorld, hashWorld, stepWorld, terrainAt } from '../src/simulation/world.ts';

test('RNG: misma semilla produce la misma secuencia, en [0, 1)', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 1000; i++) {
    const v = a.next();
    assert.equal(v, b.next());
    assert.ok(v >= 0 && v < 1);
  }
  assert.notEqual(createRng(1).next(), createRng(2).next());
});

test('Mundo: la misma semilla genera exactamente el mismo mapa', () => {
  const a = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
  const b = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
  assert.equal(hashWorld(a), hashWorld(b));
  const c = createWorld({ seed: TEST_MAP.seed + 1, size: TEST_MAP.size });
  assert.notEqual(hashWorld(a), hashWorld(c));
});

test('Mundo: tamaño correcto, terrenos válidos y variedad de prueba', () => {
  const w = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
  assert.equal(w.map.terrain.length, TEST_MAP.size * TEST_MAP.size);
  const counts = new Array(TERRAIN_COUNT).fill(0);
  for (const t of w.map.terrain) {
    assert.ok(Number.isInteger(t) && t >= 0 && t < TERRAIN_COUNT, `terreno inválido ${t}`);
    counts[t]++;
  }
  for (const def of TERRAIN_DEFS) assert.ok(counts[def.kind] > 0, `falta terreno ${def.name}`);
});

test('Mundo: el centro queda despejado (hierba) para el Bloque 1', () => {
  const w = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
  const c = (TEST_MAP.size - 1) / 2;
  for (let y = 0; y < w.map.height; y++) {
    for (let x = 0; x < w.map.width; x++) {
      if (Math.hypot(x - c, y - c) <= TEST_TERRAIN.clearRadius) assert.equal(terrainAt(w.map, x, y), TerrainKind.Grass);
    }
  }
  assert.equal(terrainAt(w.map, -1, 0), undefined);
});

test('Simulación: cada tick avanza el contador y cambia la huella', () => {
  const w = createWorld({ seed: 7, size: 16 });
  const before = hashWorld(w);
  stepWorld(w);
  assert.equal(w.tick, 1);
  assert.notEqual(hashWorld(w), before);
});

test('Simulación: el estado es serializable sin pérdidas (JSON ida y vuelta)', () => {
  const w = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
  for (let i = 0; i < 100; i++) stepWorld(w);
  const copy = JSON.parse(JSON.stringify(w));
  assert.deepEqual(copy, w);
  assert.equal(hashWorld(copy), hashWorld(w));
});

test('Reloj: 1 s real a 20 ticks/s produce 20 ticks, en frames de 60 fps', () => {
  const clock = createFixedClock(20, 5);
  let ticks = 0;
  for (let i = 0; i < 60; i++) ticks += advanceClock(clock, 1000 / 60);
  assert.ok(ticks === 19 || ticks === 20, `ticks=${ticks}`);
  ticks += advanceClock(clock, 1);
  assert.equal(ticks, 20);
});

test('Reloj: un frame enorme no bloquea (máximo de ticks por frame) y la pausa detiene', () => {
  const clock = createFixedClock(20, 5);
  assert.equal(advanceClock(clock, 10_000), 5);
  assert.equal(clock.accumulatorMs, 0);
  clock.paused = true;
  assert.equal(advanceClock(clock, 1000), 0);
});
