import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUILDINGS, PLAYER_ID } from '../src/content/economy.ts';
import { issueCommand } from '../src/simulation/commands.ts';
import { decodeSave, encodeSave } from '../src/persistence/saveFormat.ts';
import { constructionRatio } from '../src/simulation/construction.ts';
import { findPlacementNear } from '../src/simulation/placement.ts';
import { addEntity, createWorld, entityList, hashWorld, newVillager, stepWorld } from '../src/simulation/world.ts';

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

test('Aldeanos depositan madera, oro y piedra en su campamento terminado', () => {
  const world = createWorld({ seed: 11, size: 48 });
  const woodCamp = addEntity(world, { kind: 'building', type: 'lumberCamp', owner: PLAYER_ID, x: 8, y: 8, complete: true, buildProgress: 0 });
  const mineCamp = addEntity(world, { kind: 'building', type: 'miningCamp', owner: PLAYER_ID, x: 12, y: 12, complete: true, buildProgress: 0 });
  for (const [resource, campId, x, y] of [
    ['wood', woodCamp, 7, 8],
    ['gold', mineCamp, 11, 12],
    ['stone', mineCamp, 12, 11],
  ] as const) {
    const villagerId = addEntity(world, newVillager(x, y));
    const villager = world.entities[villagerId]!;
    assert.equal(villager.kind, 'villager');
    villager.carryType = resource;
    villager.carryAmount = 7;
    const node = addEntity(world, { kind: 'resource', type: resource === 'wood' ? 'tree' : resource === 'gold' ? 'goldMine' : 'stoneMine', resource, x: 3, y: 3, amount: 50 });
    villager.task = { type: 'gather', targetId: node, phase: 'toDropsite', dropsiteId: campId };
    const before = world.players[PLAYER_ID]!.stockpile[resource];
    stepWorld(world);
    assert.equal(world.players[PLAYER_ID]!.stockpile[resource], before + 7, resource);
    assert.equal(villager.carryAmount, 0, resource);
    assert.equal(villager.carryType, null, resource);
  }
});

test('Campamentos: sin madera no se cobra ni crea edificio', () => {
  const world = createWorld({ seed: 11, size: 48 });
  const villager = entityList(world).find((e) => e.kind === 'villager');
  assert.ok(villager);
  const site = findPlacementNear(world, 'lumberCamp', 17, 17);
  assert.ok(site);
  world.players[PLAYER_ID]!.stockpile.wood = 0;
  const before = entityList(world).length;
  const result = issueCommand(world, { type: 'build', playerId: PLAYER_ID, unitIds: [villager.id], building: 'lumberCamp', x: site.x, y: site.y });
  assert.equal(result.ok, false);
  assert.equal(entityList(world).length, before);
  assert.equal(world.players[PLAYER_ID]!.stockpile.wood, 0);
});

test('Campamentos: guardar, cargar y continuar conserva construcciones y carga', () => {
  const world = createWorld({ seed: 11, size: 48 });
  const site = addEntity(world, { kind: 'building', type: 'lumberCamp', owner: PLAYER_ID, x: 8, y: 8, complete: true, buildProgress: 0 });
  const mine = addEntity(world, { kind: 'building', type: 'miningCamp', owner: PLAYER_ID, x: 12, y: 12, complete: false, buildProgress: 3 });
  const id = addEntity(world, newVillager(7, 8));
  const villager = world.entities[id]!;
  assert.equal(villager.kind, 'villager');
  villager.carryType = 'wood';
  villager.carryAmount = 5;
  const node = addEntity(world, { kind: 'resource', type: 'tree', resource: 'wood', x: 3, y: 3, amount: 50 });
  villager.task = { type: 'gather', targetId: node, phase: 'toDropsite', dropsiteId: site };
  const saved = decodeSave(encodeSave(world, '2026-10-10T00:00:00.000Z'));
  assert.ok(saved.ok);
  if (!saved.ok) return;
  const loaded = saved.save.world;
  assert.equal(hashWorld(loaded), hashWorld(world));
  assert.deepEqual(loaded.entities[mine], world.entities[mine]);
  for (let i = 0; i < 50; i++) {
    stepWorld(world);
    stepWorld(loaded);
  }
  assert.equal(hashWorld(loaded), hashWorld(world));
  assert.equal(world.players[PLAYER_ID]!.stockpile.wood, loaded.players[PLAYER_ID]!.stockpile.wood);
});
