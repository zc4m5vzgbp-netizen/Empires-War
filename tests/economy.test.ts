import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENGINE, TEST_MAP } from '../src/content/config.ts';
import { BERRY_BUSH, BLOCK1_SCENARIO, BUILDINGS, PLAYER_ID, STARTING_STOCKPILE, VILLAGER } from '../src/content/economy.ts';
import { TerrainKind } from '../src/content/terrain.ts';
import { decodeSave, encodeSave } from '../src/persistence/saveFormat.ts';
import { withSavePause } from '../src/persistence/savePause.ts';
import { advanceClock, createFixedClock } from '../src/simulation/clock.ts';
import { issueCommand } from '../src/simulation/commands.ts';
import { constructionRatio } from '../src/simulation/construction.ts';
import { buildOccupancy, distanceToRect, footprintOf, isAdjacentToRect, isWalkable, type Occupancy } from '../src/simulation/grid.ts';
import { findPath, octile, pathToTile } from '../src/simulation/pathfinding.ts';
import { canPlaceBuilding, findPlacementNear } from '../src/simulation/placement.ts';
import type { Building, ResourceNode, Villager } from '../src/simulation/types.ts';
import { addEntity, createWorld, entityList, hashWorld, newVillager, replaceWorld, stepWorld, type WorldState } from '../src/simulation/world.ts';

const make = () => createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
const villagers = (w: WorldState) => entityList(w).filter((e): e is Villager => e.kind === 'villager');
const bushes = (w: WorldState) => entityList(w).filter((e): e is ResourceNode => e.kind === 'resource');
const buildings = (w: WorldState) => entityList(w).filter((e): e is Building => e.kind === 'building');
const food = (w: WorldState) => w.players[PLAYER_ID]!.stockpile.food;
const wood = (w: WorldState) => w.players[PLAYER_ID]!.stockpile.wood;

/** Ejecuta ticks comprobando en cada uno que ningún aldeano pisa una casilla bloqueada. */
function run(w: WorldState, ticks: number, until?: () => boolean): number {
  for (let i = 0; i < ticks; i++) {
    stepWorld(w);
    const occ = buildOccupancy(w);
    for (const v of villagers(w)) {
      assert.ok(isWalkable(occ, Math.round(v.x), Math.round(v.y)), `aldeano ${v.id} sobre casilla bloqueada (${v.x}, ${v.y}) en tick ${w.tick}`);
    }
    if (until?.()) return i + 1;
  }
  return ticks;
}

function openGrid(width: number, height: number, blockedTiles: [number, number][] = []): Occupancy {
  const blocked = new Uint8Array(width * height);
  for (const [x, y] of blockedTiles) blocked[y * width + x] = 1;
  return { width, height, blocked };
}

test('Escenario: Centro Urbano, 3 aldeanos, 6 arbustos y reserva inicial, con IDs estables consecutivos', () => {
  const w = make();
  assert.equal(buildings(w).length, 1);
  assert.equal(buildings(w)[0]!.type, 'townCenter');
  assert.equal(villagers(w).length, BLOCK1_SCENARIO.villagers.length);
  assert.equal(bushes(w).length, BLOCK1_SCENARIO.berryBushes.length);
  assert.deepEqual(w.players[PLAYER_ID]!.stockpile, STARTING_STOCKPILE.value);
  assert.deepEqual(entityList(w).map((e) => e.id), Array.from({ length: 10 }, (_, i) => i + 1));
  assert.equal(w.nextEntityId, 11);
  // Todo el escenario está sobre terreno transitable.
  for (const e of entityList(w)) assert.equal(w.map.terrain[e.y * w.map.width + e.x], TerrainKind.Grass, `entidad ${e.id}`);
});

test('A*: rodea obstáculos, no corta esquinas y devuelve null si no hay camino', () => {
  // Muro vertical en x = 5 con un hueco en y = 9.
  const wall: [number, number][] = [];
  for (let y = 0; y < 9; y++) wall.push([5, y]);
  const occ = openGrid(10, 10, wall);
  const path = pathToTile(occ, { x: 0, y: 0 }, { x: 9, y: 0 });
  assert.ok(path && path.length > 0);
  let prev = { x: 0, y: 0 };
  for (const step of path) {
    assert.ok(isWalkable(occ, step.x, step.y), 'el camino pisa una casilla bloqueada');
    const dx = step.x - prev.x;
    const dy = step.y - prev.y;
    assert.ok(Math.max(Math.abs(dx), Math.abs(dy)) === 1, 'saltos de más de una casilla');
    if (dx !== 0 && dy !== 0) {
      assert.ok(isWalkable(occ, prev.x + dx, prev.y) && isWalkable(occ, prev.x, prev.y + dy), 'corta una esquina');
    }
    prev = step;
  }
  assert.deepEqual(prev, { x: 9, y: 0 });
  assert.ok(path.some((t) => t.y === 9), 'debe pasar por el hueco');

  // Destino encerrado: sin camino.
  const closed = openGrid(10, 10, [[7, 6], [8, 6], [9, 6], [7, 7], [9, 7], [7, 8], [8, 8], [9, 8]]);
  closed.blocked[7 * 10 + 8] = 0;
  assert.equal(findPath(closed, { x: 0, y: 0 }, (x, y) => x === 8 && y === 7, (x, y) => octile(8 - x, 7 - y)), null);
});

test('Movimiento: el aldeano llega al destino rodeando el Centro Urbano sin atravesarlo', () => {
  const w = make();
  const v = villagers(w)[0]!;
  const tc = footprintOf(buildings(w)[0]!);
  const target = { x: tc.x + tc.w + 1, y: tc.y - 1 }; // al otro lado del Centro Urbano
  const result = issueCommand(w, { type: 'move', playerId: PLAYER_ID, unitIds: [v.id], x: target.x, y: target.y });
  assert.ok(result.ok);
  const ticks = run(w, 2000, () => v.task.type === 'idle');
  assert.ok(ticks < 2000, 'no llegó');
  assert.deepEqual({ x: v.x, y: v.y }, target);
});

test('Movimiento en grupo: tres aldeanos reciben destinos distintos', () => {
  const w = make();
  const ids = villagers(w).map((v) => v.id);
  assert.ok(issueCommand(w, { type: 'move', playerId: PLAYER_ID, unitIds: ids, x: 18, y: 18 }).ok);
  run(w, 2000, () => villagers(w).every((v) => v.task.type === 'idle'));
  const spots = new Set(villagers(w).map((v) => `${v.x},${v.y}`));
  assert.equal(spots.size, 3);
});

test('Recolección: la reserva solo sube al depositar, la carga no supera la capacidad y el arbusto baja', () => {
  const w = make();
  const v = villagers(w)[2]!;
  const bush = bushes(w)[0]!;
  assert.ok(issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [v.id], targetId: bush.id }).ok);
  const startFood = food(w);
  let maxCarry = 0;
  let sawFullCarryBeforeDeposit = false;
  run(w, 4000, () => {
    maxCarry = Math.max(maxCarry, v.carryAmount);
    if (food(w) === startFood && v.carryAmount === VILLAGER.carryCapacity) sawFullCarryBeforeDeposit = true;
    if (food(w) === startFood) assert.ok(v.carryAmount <= VILLAGER.carryCapacity);
    return food(w) > startFood;
  });
  assert.ok(sawFullCarryBeforeDeposit, 'debería llenar la carga antes de depositar');
  assert.equal(maxCarry, VILLAGER.carryCapacity);
  assert.equal(food(w), startFood + VILLAGER.carryCapacity);
  const left = (w.entities[bush.id] as ResourceNode).amount;
  assert.equal(left + v.carryAmount, BERRY_BUSH.food - VILLAGER.carryCapacity);
});

test('Recolección: el ritmo coincide con el dato provisional (0,31 comida/s)', () => {
  const w = make();
  const v = villagers(w)[2]!;
  const bush = bushes(w)[0]!;
  issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [v.id], targetId: bush.id });
  run(w, 2000, () => v.task.type === 'gather' && v.task.phase === 'gathering');
  const startTick = w.tick;
  run(w, 2000, () => v.carryAmount === VILLAGER.carryCapacity);
  const seconds = (w.tick - startTick) / ENGINE.tickRate;
  const expected = VILLAGER.carryCapacity / VILLAGER.forageRatePerSecond;
  assert.ok(Math.abs(seconds - expected) < 0.2, `tardó ${seconds}s, se esperaban ${expected.toFixed(2)}s`);
});

test('Recolección: al agotarse el arbusto se elimina y el aldeano pasa al siguiente', () => {
  const w = make();
  const v = villagers(w)[2]!;
  const bush = bushes(w)[0]!;
  bush.amount = 3;
  issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [v.id], targetId: bush.id });
  const startFood = food(w);
  run(w, 4000, () => food(w) === startFood + 3);
  assert.equal(w.entities[bush.id], undefined, 'el arbusto agotado debe desaparecer');
  run(w, 2000, () => v.task.type === 'gather' && v.task.targetId !== bush.id && v.task.phase === 'gathering');
  assert.equal(v.task.type, 'gather');
  if (v.task.type === 'gather') assert.notEqual(v.task.targetId, bush.id);
});

test('Construcción: el Molino se paga de la reserva común y se rechaza sin recursos, sin cobrar', () => {
  const w = make();
  const v = villagers(w)[2]!;
  const spot = findPlacementNear(w, 'mill', 28, 21)!;
  const first = issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: [v.id], building: 'mill', x: spot.x, y: spot.y });
  assert.ok(first.ok);
  assert.equal(wood(w), STARTING_STOCKPILE.value.wood - BUILDINGS.mill.cost.wood!);
  const spot2 = findPlacementNear(w, 'mill', 18, 26)!;
  assert.ok(issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: [v.id], building: 'mill', x: spot2.x, y: spot2.y }).ok);
  assert.equal(wood(w), 0);
  const before = entityList(w).length;
  const spot3 = findPlacementNear(w, 'mill', 18, 20)!;
  const third = issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: [v.id], building: 'mill', x: spot3.x, y: spot3.y });
  assert.deepEqual(third, { ok: false, reason: 'Faltan 100 de madera.' });
  assert.equal(wood(w), 0);
  assert.equal(entityList(w).length, before);
});

test('Construcción: no se puede colocar sobre agua, edificios, recursos, unidades ni fuera del mapa', () => {
  const w = make();
  const tc = buildings(w)[0]!;
  const bush = bushes(w)[0]!;
  const v = villagers(w)[0]!;
  const waterIndex = w.map.terrain.indexOf(TerrainKind.Water);
  assert.ok(waterIndex >= 0);
  const wx = waterIndex % w.map.width;
  const wy = Math.floor(waterIndex / w.map.width);
  const cases: [number, number][] = [[wx, wy], [tc.x, tc.y], [bush.x, bush.y], [v.x, v.y], [-1, 0], [w.map.width - 1, 0]];
  for (const [x, y] of cases) assert.equal(canPlaceBuilding(w, 'mill', x, y).ok, false, `(${x}, ${y}) debería ser inválido`);
  const woodBefore = wood(w);
  assert.equal(issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: [v.id], building: 'mill', x: tc.x, y: tc.y }).ok, false);
  assert.equal(wood(w), woodBefore);
  assert.equal(canPlaceBuilding(w, 'townCenter', 5, 5).ok, false, 'el Centro Urbano no es construible en el Bloque 1');
});

test('Construcción: un aldeano tarda el tiempo base; dos aldeanos, base × 3/4', () => {
  for (const [n, factor] of [[1, 1], [2, 3 / 4]] as const) {
    const w = make();
    const ids = villagers(w).slice(0, n).map((v) => v.id);
    const spot = findPlacementNear(w, 'mill', 18, 24)!;
    const r = issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: ids, building: 'mill', x: spot.x, y: spot.y });
    assert.ok(r.ok && r.entityId);
    const mill = w.entities[r.entityId!] as Building;
    run(w, 3000, () => villagers(w).filter((v) => ids.includes(v.id)).every((v) => v.task.type === 'build' && v.task.phase === 'building'));
    // Si un aldeano llegó antes, ya hay progreso: el tiempo esperado es el de lo que falta.
    const remaining = 1 - constructionRatio('mill', mill.buildProgress);
    const start = w.tick;
    run(w, 3000, () => mill.complete);
    const seconds = (w.tick - start) / ENGINE.tickRate;
    const expected = BUILDINGS.mill.buildTimeSeconds * factor * remaining;
    assert.ok(Math.abs(seconds - expected) <= 0.1, `${n} aldeano(s): ${seconds}s, esperado ${expected}s`);
    assert.ok(villagers(w).filter((v) => ids.includes(v.id)).every((v) => v.task.type === 'idle'), 'quedan libres al terminar');
  }
});

test('Construcción: el cimiento bloquea el paso y el Molino terminado recibe comida', () => {
  const w = make();
  const v = villagers(w)[2]!;
  const bush = bushes(w)[0]!;
  const spot = findPlacementNear(w, 'mill', bush.x - 3, bush.y)!;
  const r = issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: [v.id], building: 'mill', x: spot.x, y: spot.y });
  assert.ok(r.ok);
  const mill = w.entities[r.entityId!] as Building;
  const occ = buildOccupancy(w);
  for (let y = mill.y; y < mill.y + 2; y++) for (let x = mill.x; x < mill.x + 2; x++) assert.equal(isWalkable(occ, x, y), false);
  run(w, 3000, () => mill.complete);
  assert.ok(mill.complete);

  issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [v.id], targetId: bush.id });
  const tc = footprintOf(buildings(w).find((b) => b.type === 'townCenter')!);
  const millRect = footprintOf(mill);
  let nearTownCenter = false;
  let nextToMillWhenDeposited = false;
  const startFood = food(w);
  let gathered = false;
  run(w, 4000, () => {
    if (v.task.type === 'gather' && v.task.phase === 'gathering') gathered = true;
    // Desde que empieza a recolectar, nunca debe acercarse al Centro Urbano.
    if (gathered && distanceToRect(Math.round(v.x), Math.round(v.y), tc) <= Math.SQRT2) nearTownCenter = true;
    if (food(w) > startFood) {
      nextToMillWhenDeposited = isAdjacentToRect(Math.round(v.x), Math.round(v.y), millRect);
      return true;
    }
    return false;
  });
  assert.ok(nextToMillWhenDeposited, 'debe depositar junto al Molino');
  assert.equal(nearTownCenter, false, 'no debe ir al Centro Urbano, que está más lejos');
  assert.equal(food(w), startFood + VILLAGER.carryCapacity);
});

test('Órdenes: se rechazan unidades ajenas, IDs inexistentes y objetivos inválidos', () => {
  const w = make();
  const foreign = addEntity(w, newVillager(20, 20, 2));
  const bush = bushes(w)[0]!;
  assert.equal(issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [foreign], targetId: bush.id }).ok, false);
  assert.equal(issueCommand(w, { type: 'move', playerId: PLAYER_ID, unitIds: [9999], x: 1, y: 1 }).ok, false);
  const v = villagers(w)[0]!;
  assert.equal(issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [v.id], targetId: buildings(w)[0]!.id }).ok, false);
});

test('Guardado: a mitad del ciclo económico, cargar restaura todo y la simulación sigue idéntica', () => {
  const w = make();
  const [a, b, c] = villagers(w);
  const spot = findPlacementNear(w, 'mill', 27, 22)!;
  issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: [a!.id, b!.id], targetId: bushes(w)[0]!.id });
  issueCommand(w, { type: 'build', playerId: PLAYER_ID, unitIds: [c!.id], building: 'mill', x: spot.x, y: spot.y });
  run(w, 900);

  const decoded = decodeSave(encodeSave(w, '2026-10-09T00:00:00.000Z'));
  assert.ok(decoded.ok);
  if (!decoded.ok) return;
  const loaded = createWorld({ seed: 1, size: 8 });
  replaceWorld(loaded, decoded.save.world);
  assert.equal(hashWorld(loaded), hashWorld(w));
  assert.deepEqual(loaded, w);

  run(w, 1500);
  run(loaded, 1500);
  assert.equal(hashWorld(loaded), hashWorld(w));
  assert.ok(food(w) > STARTING_STOCKPILE.value.food, 'el ciclo debió depositar comida');

  // Los IDs siguen siendo estables: la siguiente entidad recibe el siguiente número.
  const next = loaded.nextEntityId;
  assert.equal(addEntity(loaded, newVillager(20, 20)), next);
});

test('Guardado: el mundo se congela solo durante la escritura y respeta una pausa previa', async () => {
  const clock = createFixedClock(ENGINE.tickRate, ENGINE.maxTicksPerFrame);
  let ticksDuringWrite = -1;
  await withSavePause(clock, async () => {
    ticksDuringWrite = advanceClock(clock, 1000);
  });
  assert.equal(ticksDuringWrite, 0, 'no debe avanzar mientras se escribe');
  assert.equal(clock.paused, false, 'reanuda si estaba en marcha');
  assert.ok(advanceClock(clock, 1000) > 0);

  clock.paused = true;
  await withSavePause(clock, async () => {});
  assert.equal(clock.paused, true, 'sigue en pausa si ya lo estaba');

  clock.paused = false;
  await assert.rejects(withSavePause(clock, async () => {
    throw new Error('disco lleno');
  }));
  assert.equal(clock.paused, false, 'un error al guardar no deja el juego congelado');
});

test('Determinismo: las mismas órdenes producen exactamente el mismo mundo', () => {
  const play = () => {
    const w = make();
    const ids = villagers(w).map((v) => v.id);
    issueCommand(w, { type: 'gather', playerId: PLAYER_ID, unitIds: ids, targetId: bushes(w)[1]!.id });
    run(w, 2500);
    return hashWorld(w);
  };
  assert.equal(play(), play());
});
