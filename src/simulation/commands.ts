import { BUILDINGS, type BuildingType } from '../content/economy.ts';
import { describeMissing, getStockpile, missingFor, pay } from './economy.ts';
import { buildOccupancy, isWalkable } from './grid.ts';
import { nearestWalkable, pathToTile } from './pathfinding.ts';
import { canPlaceBuilding } from './placement.ts';
import { centeredPath } from './villager.ts';
import type { EntityId, Tile, Villager } from './types.ts';
import { addEntity, getEntity, type WorldState } from './world.ts';

// Órdenes: la ÚNICA vía para que la entrada (jugador o, en el futuro, la IA) cambie el mundo.
// La simulación valida cada orden; la interfaz nunca modifica el estado directamente.

export type Command =
  | { type: 'move'; playerId: number; unitIds: EntityId[]; x: number; y: number }
  | { type: 'gather'; playerId: number; unitIds: EntityId[]; targetId: EntityId }
  | { type: 'build'; playerId: number; unitIds: EntityId[]; building: BuildingType; x: number; y: number }
  | { type: 'assistBuild'; playerId: number; unitIds: EntityId[]; targetId: EntityId };

export type CommandResult = { ok: true; entityId?: EntityId } | { ok: false; reason: string };

function ownVillagers(world: WorldState, playerId: number, ids: EntityId[]): Villager[] {
  const out: Villager[] = [];
  for (const id of ids) {
    const e = getEntity(world, id);
    if (e && e.kind === 'villager' && e.owner === playerId) out.push(e);
  }
  return out;
}

/** Reparte destinos distintos alrededor de una casilla para un grupo de unidades. */
function spreadTargets(world: WorldState, target: Tile, count: number): Tile[] {
  const occ = buildOccupancy(world);
  const start = nearestWalkable(occ, target.x, target.y);
  if (!start) return [];
  const result: Tile[] = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  const queue: Tile[] = [start];
  while (result.length < count && queue.length > 0) {
    const t = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
      const n = { x: t.x + dx, y: t.y + dy };
      const key = `${n.x},${n.y}`;
      if (seen.has(key) || !isWalkable(occ, n.x, n.y)) continue;
      seen.add(key);
      queue.push(n);
      result.push(n);
      if (result.length >= count) break;
    }
  }
  return result;
}

function assignBuild(units: Villager[], targetId: EntityId): void {
  for (const v of units) {
    v.task = { type: 'build', targetId, phase: 'toSite' };
    v.path = [];
  }
}

export function issueCommand(world: WorldState, cmd: Command): CommandResult {
  const units = ownVillagers(world, cmd.playerId, cmd.unitIds);
  if (units.length === 0) return { ok: false, reason: 'No hay aldeanos propios seleccionados.' };

  switch (cmd.type) {
    case 'move': {
      const occ = buildOccupancy(world);
      const targets = spreadTargets(world, { x: cmd.x, y: cmd.y }, units.length);
      if (targets.length === 0) return { ok: false, reason: 'No se puede llegar a ese punto.' };
      let moved = 0;
      units.forEach((v, i) => {
        const goal = targets[Math.min(i, targets.length - 1)]!;
        const path = pathToTile(occ, { x: Math.round(v.x), y: Math.round(v.y) }, goal);
        if (!path) return;
        v.task = { type: 'move', tx: goal.x, ty: goal.y };
        v.path = centeredPath(v, path);
        moved++;
      });
      return moved > 0 ? { ok: true } : { ok: false, reason: 'No hay camino hasta ese punto.' };
    }

    case 'gather': {
      const node = getEntity(world, cmd.targetId);
      if (!node || node.kind !== 'resource' || node.amount <= 0) return { ok: false, reason: 'Ese recurso ya no existe.' };
      for (const v of units) {
        v.task = { type: 'gather', targetId: node.id, phase: 'toResource', dropsiteId: null };
        v.path = [];
      }
      return { ok: true };
    }

    case 'build': {
      const def = BUILDINGS[cmd.building];
      const placement = canPlaceBuilding(world, cmd.building, cmd.x, cmd.y);
      if (!placement.ok) return placement;
      const missing = missingFor(getStockpile(world, cmd.playerId), def.cost);
      if (Object.keys(missing).length > 0) return { ok: false, reason: `Faltan ${describeMissing(missing)}.` };
      pay(world, cmd.playerId, def.cost);
      const id = addEntity(world, {
        kind: 'building',
        type: cmd.building,
        owner: cmd.playerId,
        x: cmd.x,
        y: cmd.y,
        complete: false,
        buildProgress: 0,
      });
      assignBuild(units, id);
      return { ok: true, entityId: id };
    }

    case 'assistBuild': {
      const site = getEntity(world, cmd.targetId);
      if (!site || site.kind !== 'building' || site.owner !== cmd.playerId) return { ok: false, reason: 'No es un edificio propio.' };
      if (site.complete) return { ok: false, reason: 'Ese edificio ya está terminado.' };
      assignBuild(units, site.id);
      return { ok: true };
    }
  }
}
