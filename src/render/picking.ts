import { BUILDINGS } from '../content/economy.ts';
import type { EntityId } from '../simulation/types.ts';
import { entityList, type WorldState } from '../simulation/world.ts';
import { BUILDING_WALL, VILLAGER_BODY_OFFSET } from './entityTextures.ts';
import { tileToWorld, worldToTile } from './iso.ts';

// Qué hay bajo un punto del mundo dibujado. Matemática pura sobre el estado (solo lectura).

export type Pick = { kind: 'villager' | 'building' | 'resource'; id: EntityId } | null;

/** Radio (px a zoom 1) en el que un toque cuenta como «sobre el aldeano». Generoso para dedos. */
const VILLAGER_HIT_RADIUS = 20;

export function pickAt(world: WorldState, wx: number, wy: number): Pick {
  let best: Pick = null;
  let bestD = Infinity;
  for (const e of entityList(world)) {
    if (e.kind !== 'villager') continue;
    const p = tileToWorld(e.x, e.y);
    const d = Math.hypot(wx - p.x, wy - (p.y - VILLAGER_BODY_OFFSET));
    if (d <= VILLAGER_HIT_RADIUS && d < bestD) {
      bestD = d;
      best = { kind: 'villager', id: e.id };
    }
  }
  if (best) return best;

  const tileAt = (y: number) => {
    const t = worldToTile(wx, y);
    return { x: Math.round(t.x), y: Math.round(t.y) };
  };
  for (const e of entityList(world)) {
    if (e.kind === 'building') {
      const size = BUILDINGS[e.type].size;
      // Se acepta tocar la base o las paredes (el punto bajado a la altura de la base).
      for (const lift of [0, BUILDING_WALL[e.type] * 0.5, BUILDING_WALL[e.type]]) {
        const t = tileAt(wy + lift);
        if (t.x >= e.x && t.x < e.x + size && t.y >= e.y && t.y < e.y + size) return { kind: 'building', id: e.id };
      }
    }
  }
  const t = tileAt(wy);
  const t2 = tileAt(wy + 10); // el arbusto se dibuja algo por encima de su casilla
  for (const e of entityList(world)) {
    if (e.kind === 'resource' && ((e.x === t.x && e.y === t.y) || (e.x === t2.x && e.y === t2.y))) return { kind: 'resource', id: e.id };
  }
  return null;
}

/** Aldeanos propios cuyos pies caen dentro de un rectángulo del mundo. */
export function villagersInRect(
  world: WorldState,
  owner: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
): EntityId[] {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const ids: EntityId[] = [];
  for (const e of entityList(world)) {
    if (e.kind !== 'villager' || e.owner !== owner) continue;
    const p = tileToWorld(e.x, e.y);
    const bodyY = p.y - VILLAGER_BODY_OFFSET;
    if (p.x >= minX && p.x <= maxX && bodyY >= minY - VILLAGER_BODY_OFFSET && bodyY <= maxY + VILLAGER_BODY_OFFSET / 2) ids.push(e.id);
  }
  return ids;
}
