import { BUILDINGS, type BuildingType } from '../content/economy.ts';
import type { EntityId } from '../simulation/types.ts';
import { entityList, type WorldState } from '../simulation/world.ts';
import { BUILDING_WALL, VILLAGER_BODY_OFFSET } from './entityTextures.ts';
import { TILE_H, tileToWorld, worldToTile } from './iso.ts';

// Qué hay bajo un punto del mundo dibujado. Matemática pura sobre el estado (solo lectura).

export type Pick = { kind: 'villager' | 'building' | 'resource'; id: EntityId } | null;

/** Radio (px a zoom 1) en el que un toque cuenta como «sobre el aldeano». Generoso para dedos. */
const VILLAGER_HIT_RADIUS = 20;

/**
 * Área interactiva de un edificio, separada de su dibujo: la huella (rombo de casillas) extruida hacia arriba hasta
 * la altura de pared BUILDING_WALL. Un punto la toca si, bajándolo entre 0 y esa altura, cae dentro de la huella.
 * El dibujo puede ser algo más ancho o alto (tejados, pilas); esa parte no responde, a propósito: así un edificio
 * grande no tapa con su sombra o su silueta los toques destinados a lo que tiene alrededor.
 * Devuelve la profundidad de dibujo del edificio (para elegir el de delante) o null si no lo toca.
 */
export function buildingHitDepth(e: { type: BuildingType; x: number; y: number }, wx: number, wy: number): number | null {
  const size = BUILDINGS[e.type].size;
  const wall = BUILDING_WALL[e.type];
  // Casilla (con decimales) del punto sin bajar. Bajar ℓ píxeles suma ℓ/32 a x y a y de la casilla.
  const t = worldToTile(wx, wy);
  const lo = (v0: number, c: number) => 32 * (c - 0.5 - v0);
  const hi = (v0: number, c: number) => 32 * (c + size - 0.5 - v0);
  const from = Math.max(0, lo(t.x, e.x), lo(t.y, e.y));
  const to = Math.min(wall, hi(t.x, e.x), hi(t.y, e.y));
  if (from > to || from >= Math.min(hi(t.x, e.x), hi(t.y, e.y))) return null;
  const c = tileToWorld(e.x + (size - 1) / 2, e.y + (size - 1) / 2);
  return c.y + (size * TILE_H) / 2;
}

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
  // Edificios: entre todos los que contienen el punto en su ÁREA INTERACTIVA, gana el que se dibuja delante
  // (mayor profundidad, la misma que usa EntityView). Antes ganaba el de menor ID (DEF-PICK-01).
  let hit: { id: number; depth: number } | null = null;
  for (const e of entityList(world)) {
    if (e.kind !== 'building') continue;
    const depth = buildingHitDepth(e, wx, wy);
    if (depth !== null && (!hit || depth > hit.depth || (depth === hit.depth && e.id > hit.id))) hit = { id: e.id, depth };
  }
  if (hit) return { kind: 'building', id: hit.id };
  const t = tileAt(wy);
  const t2 = tileAt(wy + 10); // el arbusto se dibuja algo por encima de su casilla
  for (const e of entityList(world)) {
    if (e.kind === 'resource' && ((e.x === t.x && e.y === t.y) || (e.x === t2.x && e.y === t2.y))) return { kind: 'resource', id: e.id };
  }
  // Los árboles son altos: también se acepta tocar la copa (hasta ~3 casillas de altura sobre la base).
  for (const lift of [32, 48, 64, 80]) {
    const tt = tileAt(wy + lift);
    for (const e of entityList(world)) {
      if (e.kind === 'resource' && e.type === 'tree' && e.x === tt.x && e.y === tt.y) return { kind: 'resource', id: e.id };
    }
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
