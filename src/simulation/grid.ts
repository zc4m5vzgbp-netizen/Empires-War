import { BUILDINGS } from '../content/economy.ts';
import { TERRAIN_DEFS } from '../content/terrain.ts';
import type { Building, Entity, Tile } from './types.ts';
import { entityList, terrainAt, type WorldState } from './world.ts';

// Rejilla de ocupación: qué casillas se pueden pisar. Se calcula a partir del estado
// (terreno + edificios + recursos), así nunca se desincroniza ni hace falta guardarla.
export interface Occupancy {
  width: number;
  height: number;
  /** 1 = bloqueada (agua, bosque, edificio o recurso). */
  blocked: Uint8Array;
}

export function footprintOf(b: Pick<Building, 'type' | 'x' | 'y'>): { x: number; y: number; w: number; h: number } {
  const size = BUILDINGS[b.type].size;
  return { x: b.x, y: b.y, w: size, h: size };
}

/** Casillas que ocupa una entidad estática (edificio o recurso). Los aldeanos no bloquean. */
export function entityTiles(e: Entity): Tile[] {
  if (e.kind === 'resource') return [{ x: e.x, y: e.y }];
  if (e.kind === 'building') {
    const f = footprintOf(e);
    const tiles: Tile[] = [];
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) tiles.push({ x, y });
    return tiles;
  }
  return [];
}

export function buildOccupancy(world: WorldState): Occupancy {
  const { width, height } = world.map;
  const blocked = new Uint8Array(width * height);
  for (let i = 0; i < blocked.length; i++) {
    const def = TERRAIN_DEFS[world.map.terrain[i] ?? 0];
    if (!def?.walkable) blocked[i] = 1;
  }
  for (const e of entityList(world)) {
    for (const t of entityTiles(e)) {
      if (t.x >= 0 && t.y >= 0 && t.x < width && t.y < height) blocked[t.y * width + t.x] = 1;
    }
  }
  return { width, height, blocked };
}

export function inBounds(occ: Pick<Occupancy, 'width' | 'height'>, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < occ.width && y < occ.height;
}

export function isWalkable(occ: Occupancy, x: number, y: number): boolean {
  return inBounds(occ, x, y) && occ.blocked[y * occ.width + x] === 0;
}

export function isTerrainWalkable(world: WorldState, x: number, y: number): boolean {
  const t = terrainAt(world.map, x, y);
  return t !== undefined && TERRAIN_DEFS[t]?.walkable === true;
}

/** Distancia de una casilla al rectángulo de una huella (0 si está dentro). */
export function distanceToRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w - 1));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h - 1));
  return Math.hypot(dx, dy);
}

/** ¿La casilla (x, y) toca (incluidas diagonales) el rectángulo, sin estar dentro? */
export function isAdjacentToRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
  const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  return !inside && x >= r.x - 1 && x <= r.x + r.w && y >= r.y - 1 && y <= r.y + r.h;
}
