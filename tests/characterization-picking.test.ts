import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLAYER_ID } from '../src/content/economy.ts';
import { tileToWorld } from '../src/render/iso.ts';
import { pickAt } from '../src/render/picking.ts';
import { addEntity, createEmptyWorld } from '../src/simulation/world.ts';

// Caracterización de la selección por toque entre edificios que se solapan en pantalla (análisis 2026-10-10).
// pickAt recorre los edificios por ID y acepta un toque «bajándolo» hasta la altura de las paredes (BUILDING_WALL),
// sin mirar cuál está dibujado delante. Defecto DEF-PICK-01: no cambia el juego; queda marcado como «todo».

function townWithCampInFront() {
  const w = createEmptyWorld({ seed: 1, size: 48 });
  const tc = addEntity(w, { kind: 'building', type: 'townCenter', owner: PLAYER_ID, x: 22, y: 22, complete: true, buildProgress: 0 });
  // (26, 26): delante del Centro Urbano (mayor x + y = se dibuja encima).
  const camp = addEntity(w, { kind: 'building', type: 'lumberCamp', owner: PLAYER_ID, x: 26, y: 26, complete: true, buildProgress: 0 });
  return { w, tc, camp, c: tileToWorld(26.5, 26.5) };
}

test('caracterización: tocar la base o la pared baja de un campamento delante del CU lo selecciona', () => {
  const { w, camp, c } = townWithCampInFront();
  for (const lift of [0, 12, 24]) assert.deepEqual(pickAt(w, c.x, c.y - lift), { kind: 'building', id: camp }, `${lift} px`);
});

test('DEF-PICK-01: el tejado del campamento (40 px sobre su centro), dibujado delante del CU, debería seleccionar el campamento', { todo: 'hoy devuelve el Centro Urbano (orden por ID, no por profundidad)' }, () => {
  const { w, camp, c } = townWithCampInFront();
  assert.deepEqual(pickAt(w, c.x, c.y - 40), { kind: 'building', id: camp });
});
