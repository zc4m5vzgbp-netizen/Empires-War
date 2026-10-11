import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pathToAdjacent, pathToTile } from '../src/simulation/pathfinding.ts';
import type { Occupancy } from '../src/simulation/grid.ts';

function grid(width: number, height: number, walls: Array<[number, number]>): Occupancy {
  const blocked = new Uint8Array(width * height);
  for (const [x, y] of walls) blocked[y * width + x] = 1;
  return { width, height, blocked };
}

test('Conectividad: muro completo impide llegar a destino o edificio', () => {
  const walls: Array<[number, number]> = [];
  for (let y = 0; y < 80; y++) walls.push([40, y]);
  const occ = grid(80, 80, walls);
  assert.equal(pathToTile(occ, { x: 3, y: 40 }, { x: 75, y: 40 }), null);
  assert.equal(pathToAdjacent(occ, { x: 3, y: 40 }, { x: 70, y: 38, w: 2, h: 2 }), null);
});

test('Conectividad: puerta abierta permite rutas y conserva determinismo', () => {
  const walls: Array<[number, number]> = [];
  for (let y = 0; y < 40; y++) if (y !== 20) walls.push([20, y]);
  const occ = grid(40, 40, walls);
  const route = () => pathToTile(occ, { x: 2, y: 20 }, { x: 35, y: 20 });
  const first = route();
  assert.ok(first && first.length > 0);
  assert.deepEqual(route(), first);
  assert.ok(pathToAdjacent(occ, { x: 2, y: 20 }, { x: 33, y: 19, w: 2, h: 2 }));
});

test('Conectividad: la diagonal entre dos muros no constituye conexión', () => {
  const occ = grid(2, 2, [[1, 0], [0, 1]]);
  assert.equal(pathToTile(occ, { x: 0, y: 0 }, { x: 1, y: 1 }), null);
});

test('Conectividad: el cache pertenece a cada ocupación y no conserva muros anteriores', () => {
  const walls: Array<[number, number]> = [];
  for (let y = 0; y < 16; y++) walls.push([8, y]);
  const blocked = grid(16, 16, walls);
  assert.equal(pathToTile(blocked, { x: 1, y: 8 }, { x: 14, y: 8 }), null);
  const opened = grid(16, 16, walls.filter(([, y]) => y !== 8));
  assert.ok(pathToTile(opened, { x: 1, y: 8 }, { x: 14, y: 8 }));
});
