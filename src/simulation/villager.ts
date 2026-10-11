import { ENGINE } from '../content/config.ts';
import { BUILDINGS, VILLAGER, type ResourceType } from '../content/economy.ts';
import { advanceConstruction } from './construction.ts';
import { deposit } from './economy.ts';
import { buildOccupancy, distanceToRect, footprintOf, isAdjacentToRect, isWalkable, type Occupancy } from './grid.ts';
import { pathToAdjacent, pathToTile } from './pathfinding.ts';
import type { Building, EntityId, ResourceNode, Tile, Villager } from './types.ts';
import { entityList, getEntity, removeEntity, type WorldState } from './world.ts';

// Comportamiento de los aldeanos, un tick cada vez.

/** Casillas que recorre un aldeano por tick. */
const STEP = VILLAGER.speed / ENGINE.tickRate;
/** Recolección en enteros: cada tick suma `GATHER_PER_TICK`; cada `GATHER_UNIT` es 1 de recurso. */
const GATHER_PER_TICK = Math.round(VILLAGER.forageRatePerSecond * 1000);
const GATHER_UNIT = 1000 * ENGINE.tickRate;
/** Radio en el que un aldeano busca otro arbusto cuando el suyo se agota. */
const RETARGET_RADIUS = 10;

interface TickContext {
  world: WorldState;
  occ: Occupancy | null;
  /** Aldeanos construyendo cada cimiento en este tick. */
  builders: Map<EntityId, number>;
}

const occupancy = (ctx: TickContext) => (ctx.occ ??= buildOccupancy(ctx.world));

const tileOf = (v: Villager) => ({ x: Math.round(v.x), y: Math.round(v.y) });
const resourceRect = (r: ResourceNode) => ({ x: r.x, y: r.y, w: 1, h: 1 });

function isAdjacentTo(v: Villager, rect: { x: number; y: number; w: number; h: number }): boolean {
  const t = tileOf(v);
  return v.path.length === 0 && Math.abs(v.x - t.x) < 1e-6 && Math.abs(v.y - t.y) < 1e-6 && isAdjacentToRect(t.x, t.y, rect);
}

export function setIdle(v: Villager): void {
  v.task = { type: 'idle' };
  v.path = [];
}

/** Avanza por el camino. Devuelve 'blocked' si la siguiente casilla quedó ocupada. */
function walk(v: Villager, occ: Occupancy): 'moving' | 'arrived' | 'blocked' {
  let remaining = STEP;
  while (remaining > 0) {
    const next = v.path[0];
    if (!next) return 'arrived';
    if (!isWalkable(occ, next.x, next.y)) {
      v.path = [];
      return 'blocked';
    }
    const dx = next.x - v.x;
    const dy = next.y - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      v.x = next.x;
      v.y = next.y;
      v.path.shift();
      remaining -= dist;
    } else {
      v.x += (dx / dist) * remaining;
      v.y += (dy / dist) * remaining;
      remaining = 0;
    }
  }
  return v.path.length === 0 ? 'arrived' : 'moving';
}

/**
 * Si el camino calculado está vacío pero el aldeano quedó entre dos casillas (recibió la orden a mitad
 * de un paso), primero camina al centro de su casilla. Sin esto se quedaba quieto para siempre.
 */
export function centeredPath(v: Villager, path: Tile[]): Tile[] {
  const t = tileOf(v);
  const centered = Math.abs(v.x - t.x) < 1e-6 && Math.abs(v.y - t.y) < 1e-6;
  return path.length === 0 && !centered ? [t] : path;
}

/** Asegura un camino hacia un rectángulo; devuelve false si es inalcanzable. */
function ensurePathToRect(ctx: TickContext, v: Villager, rect: { x: number; y: number; w: number; h: number }): boolean {
  if (v.path.length > 0 || isAdjacentTo(v, rect)) return true;
  const path = pathToAdjacent(occupancy(ctx), tileOf(v), rect);
  if (!path) return false;
  v.path = centeredPath(v, path);
  return true;
}

function nearestDropsite(world: WorldState, v: Villager, resource: ResourceType): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const e of entityList(world)) {
    if (e.kind !== 'building' || e.owner !== v.owner || !e.complete) continue;
    if (!BUILDINGS[e.type].accepts.includes(resource)) continue;
    const d = distanceToRect(v.x, v.y, footprintOf(e));
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function nearestResource(world: WorldState, v: Villager, resource: ResourceType): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestD = Infinity;
  for (const e of entityList(world)) {
    if (e.kind !== 'resource' || e.resource !== resource || e.amount <= 0) continue;
    const d = Math.hypot(e.x - v.x, e.y - v.y);
    if (d <= RETARGET_RADIUS && d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function updateMove(ctx: TickContext, v: Villager): void {
  if (v.task.type !== 'move') return;
  const result = walk(v, occupancy(ctx));
  if (result === 'arrived') setIdle(v);
  else if (result === 'blocked') {
    const path = pathToTile(occupancy(ctx), tileOf(v), { x: v.task.tx, y: v.task.ty });
    if (path) v.path = centeredPath(v, path);
    else setIdle(v);
  }
}

function updateGather(ctx: TickContext, v: Villager): void {
  const task = v.task;
  if (task.type !== 'gather') return;
  const world = ctx.world;

  if (task.phase === 'toDropsite') {
    const type = v.carryType;
    if (!type || v.carryAmount === 0) {
      task.phase = 'toResource';
      return;
    }
    const drop = (task.dropsiteId !== null ? getEntity(world, task.dropsiteId) : undefined) as Building | undefined;
    const target = drop && drop.kind === 'building' && drop.owner === v.owner && drop.complete && BUILDINGS[drop.type].accepts.includes(type)
      ? drop
      : nearestDropsite(world, v, type);
    if (!target) {
      setIdle(v); // sin depósito disponible: conserva la carga
      return;
    }
    task.dropsiteId = target.id;
    const rect = footprintOf(target);
    if (isAdjacentTo(v, rect)) {
      deposit(world, v.owner, type, v.carryAmount);
      v.carryAmount = 0;
      v.carryType = null;
      task.phase = 'toResource';
      task.dropsiteId = null;
      return;
    }
    if (!ensurePathToRect(ctx, v, rect)) {
      setIdle(v);
      return;
    }
    if (walk(v, occupancy(ctx)) === 'blocked') v.path = [];
    return;
  }

  // Buscar el recurso (o uno nuevo cercano si el anterior se agotó).
  let node = getEntity(world, task.targetId);
  if (!node || node.kind !== 'resource' || node.amount <= 0) {
    const replacement = nearestResource(world, v, v.carryType ?? 'food');
    if (!replacement) {
      if (v.carryAmount > 0) {
        task.phase = 'toDropsite';
        task.dropsiteId = null;
        v.path = [];
      } else setIdle(v);
      return;
    }
    task.targetId = replacement.id;
    task.phase = 'toResource';
    v.path = [];
    node = replacement;
  }
  const rect = resourceRect(node);

  if ((v.carryType && v.carryType !== node.resource) || v.carryAmount >= VILLAGER.carryCapacity) {
    task.phase = 'toDropsite';
    task.dropsiteId = null;
    v.path = [];
    return;
  }

  if (task.phase === 'toResource') {
    if (isAdjacentTo(v, rect)) {
      task.phase = 'gathering';
    } else {
      if (!ensurePathToRect(ctx, v, rect)) {
        setIdle(v);
        return;
      }
      if (walk(v, occupancy(ctx)) === 'blocked') v.path = [];
      return;
    }
  }

  // Recolección gradual.
  if (!isAdjacentTo(v, rect)) {
    task.phase = 'toResource';
    return;
  }
  v.carryType = node.resource;
  v.gatherProgress += GATHER_PER_TICK;
  while (v.gatherProgress >= GATHER_UNIT && node.amount > 0 && v.carryAmount < VILLAGER.carryCapacity) {
    v.gatherProgress -= GATHER_UNIT;
    node.amount -= 1;
    v.carryAmount += 1;
  }
  if (node.amount <= 0) {
    removeEntity(world, node.id);
    ctx.occ = null; // la casilla del arbusto queda libre
  }
  if (v.carryAmount >= VILLAGER.carryCapacity || node.amount <= 0) {
    task.phase = 'toDropsite';
    task.dropsiteId = null;
    v.path = [];
  }
}

function updateBuild(ctx: TickContext, v: Villager): void {
  const task = v.task;
  if (task.type !== 'build') return;
  const site = getEntity(ctx.world, task.targetId);
  if (!site || site.kind !== 'building' || site.complete) {
    setIdle(v);
    return;
  }
  const rect = footprintOf(site);
  if (isAdjacentTo(v, rect)) {
    task.phase = 'building';
    ctx.builders.set(site.id, (ctx.builders.get(site.id) ?? 0) + 1);
    return;
  }
  task.phase = 'toSite';
  if (!ensurePathToRect(ctx, v, rect)) {
    setIdle(v);
    return;
  }
  if (walk(v, occupancy(ctx)) === 'blocked') v.path = [];
}

export function updateVillagers(world: WorldState): void {
  const ctx: TickContext = { world, occ: null, builders: new Map() };
  for (const e of entityList(world)) {
    if (e.kind !== 'villager') continue;
    switch (e.task.type) {
      case 'move':
        updateMove(ctx, e);
        break;
      case 'gather':
        updateGather(ctx, e);
        break;
      case 'build':
        updateBuild(ctx, e);
        break;
      case 'idle':
        break;
    }
  }
  advanceConstruction(world, ctx.builders);
  // Al terminar un edificio, sus constructores quedan libres en ese mismo tick.
  for (const e of entityList(world)) {
    if (e.kind !== 'villager' || e.task.type !== 'build') continue;
    const site = getEntity(world, e.task.targetId);
    if (!site || site.kind !== 'building' || site.complete) setIdle(e);
  }
}
