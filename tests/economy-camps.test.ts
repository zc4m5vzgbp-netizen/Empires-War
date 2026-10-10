import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILDINGS, PLAYER_ID } from '../src/content/economy.ts';
import { issueCommand } from '../src/simulation/commands.ts';
import { constructionRatio } from '../src/simulation/construction.ts';
import { findPlacementNear } from '../src/simulation/placement.ts';
import { createWorld, entityList } from '../src/simulation/world.ts';

test('Campamentos: huella 2x2 y depósitos separados por recurso', () => {
  assert.equal(BUILDINGS.lumberCamp.size, 2);
  assert.equal(BUILDINGS.miningCamp.size, 2);
  assert.deepEqual(BUILDINGS.lumberCamp.accepts, ['wood']);
  assert.deepEqual(BUILDINGS.miningCamp.accepts, ['gold', 'stone']);
  assert.equal(BUILDINGS.lumberCamp.constructible, true);
  assert.equal(BUILDINGS.miningCamp.constructible, true);
  assert.equal(constructionRatio('lumberCamp', 0), 0);
  assert.equal(constructionRatio('miningCamp', 0), 0);
});

test('Campamentos: coste cobrado por comando y cimientos creados sin terminar', () => {
  const world = createWorld({ seed: 11, size: 48 });
  const villager = entityList(world).find((e) => e.kind === 'villager');
  assert.ok(villager);
  const initialWood = world.players[PLAYER_ID]!.stockpile.wood;
  const first = findPlacementNear(world, 'lumberCamp', 17, 17);
  assert.ok(first);
  const result = issueCommand(world, { type: 'build', playerId: PLAYER_ID, unitIds: [villager.id], building: 'lumberCamp', x: first.x, y: first.y });
  assert.equal(result.ok, true);
  assert.equal(world.players[PLAYER_ID]!.stockpile.wood, initialWood - (BUILDINGS.lumberCamp.cost.wood ?? 0));
  assert.ok(entityList(world).some((e) => e.kind === 'building' && e.type === 'lumberCamp' && !e.complete));
  const second = findPlacementNear(world, 'miningCamp', 36, 36);
  assert.ok(second);
  const mining = issueCommand(world, { type: 'build', playerId: PLAYER_ID, unitIds: [villager.id], building: 'miningCamp', x: second.x, y: second.y });
  assert.equal(mining.ok, true);
  assert.ok(entityList(world).some((e) => e.kind === 'building' && e.type === 'miningCamp' && !e.complete));
  assert.equal(world.players[PLAYER_ID]!.stockpile.wood, initialWood - (BUILDINGS.lumberCamp.cost.wood ?? 0) - (BUILDINGS.miningCamp.cost.wood ?? 0));
});
