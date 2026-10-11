import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeSave, encodeSave } from '../src/persistence/saveFormat.ts';
import { findPath, pathToTile } from '../src/simulation/pathfinding.ts';
import type { Occupancy } from '../src/simulation/grid.ts';
import { createWorld, hashWorld, stepWorld } from '../src/simulation/world.ts';

function occupancy(width: number, height: number, blockedTiles: Array<[number, number]>): Occupancy {
  const blocked = new Uint8Array(width * height);
  for (const [x, y] of blockedTiles) blocked[y * width + x] = 1;
  return { width, height, blocked };
}

test('A*: no atraviesa una barrera completa y termina sin camino', () => {
  const occ = occupancy(5, 5, [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]);
  const result = pathToTile(occ, { x: 0, y: 2 }, { x: 4, y: 2 });
  assert.equal(result, null);
});

test('A*: impide cortar esquinas bloqueadas en diagonal', () => {
  const occ = occupancy(3, 3, [[1, 0], [0, 1]]);
  assert.equal(pathToTile(occ, { x: 0, y: 0 }, { x: 1, y: 1 }), null);
});

test('A*: el desempate es determinista para la misma ocupación', () => {
  const occ = occupancy(9, 9, [[4, 3], [4, 4], [4, 5]]);
  const path = () => findPath(occ, { x: 1, y: 4 }, (x, y) => x === 7 && y === 4, (x, y) => Math.hypot(7 - x, 4 - y));
  const first = path();
  assert.ok(first && first.length > 0);
  for (let i = 0; i < 10; i++) assert.deepEqual(path(), first);
});

test('Guardado: rechaza alteración del mundo sin actualizar la huella', () => {
  const world = createWorld({ seed: 101, size: 48 });
  const saved = JSON.parse(encodeSave(world, '2026-10-11T00:00:00.000Z')) as {
    world: { tick: number };
  };
  saved.world.tick += 1;
  const decoded = decodeSave(JSON.stringify(saved));
  assert.equal(decoded.ok, false);
  if (!decoded.ok) assert.match(decoded.error, /huella/);
});

test('Guardado: rechaza versión incompatible y mapa truncado', () => {
  const world = createWorld({ seed: 102, size: 48 });
  const original = JSON.parse(encodeSave(world, '2026-10-11T00:00:00.000Z')) as {
    formatVersion: number;
    world: { map: { terrain: number[] } };
  };
  const badVersion = structuredClone(original);
  badVersion.formatVersion += 1;
  assert.equal(decodeSave(JSON.stringify(badVersion)).ok, false);
  const badMap = structuredClone(original);
  badMap.world.map.terrain.pop();
  assert.equal(decodeSave(JSON.stringify(badMap)).ok, false);
});

test('Guardado: simulación posterior a carga mantiene hash exacto durante 200 ticks', () => {
  const original = createWorld({ seed: 103, size: 48 });
  for (let i = 0; i < 50; i++) stepWorld(original);
  const decoded = decodeSave(encodeSave(original, '2026-10-11T00:00:00.000Z'));
  assert.equal(decoded.ok, true);
  if (!decoded.ok) return;
  const restored = decoded.save.world;
  assert.equal(hashWorld(restored), hashWorld(original));
  for (let i = 0; i < 200; i++) {
    stepWorld(original);
    stepWorld(restored);
    assert.equal(hashWorld(restored), hashWorld(original), `Divergencia en tick ${i}`);
  }
});
