import assert from 'node:assert/strict';
import { test } from 'node:test';
import { villagerVisualAction, VILLAGER_ECO_ORIGIN, VILLAGER_ECO_BODY_OFFSET } from '../src/render/villagerVisualState.ts';
import type { Villager, ResourceNode } from '../src/simulation/types.ts';

const villager = (task: Villager['task'], carryType: Villager['carryType'] = null, carryAmount = 0): Villager => ({
  id: 1, kind: 'villager', owner: 1, x: 0, y: 0, path: [], task, carryType, carryAmount, gatherProgress: 0,
});
const node = (type: ResourceNode['type']): ResourceNode => ({
  id: 2, kind: 'resource', type, resource: type === 'tree' ? 'wood' : type === 'berryBush' ? 'food' : type === 'goldMine' ? 'gold' : 'stone',
  x: 1, y: 1, amount: 100,
});

test('PR13: ancla y centro de toque de la ciudadana 0 A.D.', () => {
  assert.deepEqual(VILLAGER_ECO_ORIGIN, { x: 0.5, y: 0.6905 });
  assert.equal(VILLAGER_ECO_BODY_OFFSET, 19);
});

test('PR13: recolección usa herramienta incluso si hay carga parcial', () => {
  for (const [kind, action] of [['tree', 'chop'], ['berryBush', 'forage'], ['stoneMine', 'mine'], ['goldMine', 'mine']] as const) {
    const v = villager({ type: 'gather', targetId: 2, phase: 'gathering', dropsiteId: null }, 'wood', 3);
    assert.equal(villagerVisualAction(v, false, node(kind)), action);
  }
});

test('PR13: el transporte distingue oro, piedra, madera y comida', () => {
  for (const resource of ['wood', 'stone', 'gold', 'food'] as const) {
    const v = villager({ type: 'gather', targetId: 2, phase: 'toDropsite', dropsiteId: 3 }, resource, 5);
    assert.equal(villagerVisualAction(v, true, node('tree')), `carry/${resource}`);
    assert.equal(villagerVisualAction(v, false, node('tree')), `carry/${resource}-idle`);
  }
});

test('PR13: construir, caminar y descansar', () => {
  assert.equal(villagerVisualAction(villager({ type: 'build', targetId: 3, phase: 'building' }), false, undefined), 'build');
  assert.equal(villagerVisualAction(villager({ type: 'move', tx: 1, ty: 1 }), true, undefined), 'walk');
  assert.equal(villagerVisualAction(villager({ type: 'idle' }), false, undefined), 'idle');
});
