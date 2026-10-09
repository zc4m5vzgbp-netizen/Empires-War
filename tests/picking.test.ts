import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TEST_MAP } from '../src/content/config.ts';
import { PLAYER_ID } from '../src/content/economy.ts';
import { VILLAGER_BODY_OFFSET } from '../src/render/entityTextures.ts';
import { tileToWorld } from '../src/render/iso.ts';
import { pickAt, villagersInRect } from '../src/render/picking.ts';
import { createWorld, entityList } from '../src/simulation/world.ts';

const world = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });

test('Selección: tocar el cuerpo de un aldeano lo selecciona', () => {
  for (const v of entityList(world).filter((e) => e.kind === 'villager')) {
    const p = tileToWorld(v.x, v.y);
    assert.deepEqual(pickAt(world, p.x, p.y - VILLAGER_BODY_OFFSET), { kind: 'villager', id: v.id });
  }
});

test('Selección: tocar el Centro Urbano (base o paredes) y un arbusto', () => {
  const tc = entityList(world).find((e) => e.kind === 'building')!;
  const c = tileToWorld(tc.x + 1.5, tc.y + 1.5);
  assert.deepEqual(pickAt(world, c.x, c.y), { kind: 'building', id: tc.id });
  assert.deepEqual(pickAt(world, c.x, c.y - 30), { kind: 'building', id: tc.id });
  const bush = entityList(world).find((e) => e.kind === 'resource')!;
  const b = tileToWorld(bush.x, bush.y);
  assert.deepEqual(pickAt(world, b.x, b.y), { kind: 'resource', id: bush.id });
});

test('Selección: el suelo vacío no selecciona nada', () => {
  const p = tileToWorld(16, 30);
  assert.equal(pickAt(world, p.x, p.y), null);
});

test('Selección por recuadro: incluye solo los aldeanos dentro', () => {
  const vs = entityList(world).filter((e) => e.kind === 'villager');
  const pts = vs.map((v) => tileToWorld(v.x, v.y));
  const all = villagersInRect(world, PLAYER_ID, { x: Math.min(...pts.map((p) => p.x)) - 5, y: Math.min(...pts.map((p) => p.y)) - 40 }, { x: Math.max(...pts.map((p) => p.x)) + 5, y: Math.max(...pts.map((p) => p.y)) + 5 });
  assert.deepEqual(all, vs.map((v) => v.id));
  const one = pts[0]!;
  assert.deepEqual(villagersInRect(world, PLAYER_ID, { x: one.x - 10, y: one.y - 30 }, { x: one.x + 10, y: one.y + 5 }), [vs[0]!.id]);
  assert.deepEqual(villagersInRect(world, 2, { x: -1e6, y: -1e6 }, { x: 1e6, y: 1e6 }), [], 'no selecciona unidades ajenas');
});
