import { BUILDINGS, type BuildingType } from '../content/economy.ts';
import { buildOccupancy, inBounds, isTerrainWalkable } from './grid.ts';
import type { Tile } from './types.ts';
import { entityList, type WorldState } from './world.ts';

export type PlacementCheck = { ok: true } | { ok: false; reason: string };

/** ¿Se puede colocar el edificio con su esquina superior izquierda en (x, y)? */
export function canPlaceBuilding(world: WorldState, type: BuildingType, x: number, y: number): PlacementCheck {
  const def = BUILDINGS[type];
  if (!def.constructible) return { ok: false, reason: `${def.name} no se puede construir.` };
  const occ = buildOccupancy(world);
  const villagerTiles = new Set(
    entityList(world)
      .filter((e) => e.kind === 'villager')
      .map((v) => `${Math.round(v.x)},${Math.round(v.y)}`),
  );
  for (let ty = y; ty < y + def.size; ty++) {
    for (let tx = x; tx < x + def.size; tx++) {
      if (!inBounds(occ, tx, ty)) return { ok: false, reason: 'Fuera del mapa.' };
      if (!isTerrainWalkable(world, tx, ty)) return { ok: false, reason: 'El terreno no permite construir aquí.' };
      if (occ.blocked[ty * occ.width + tx]) return { ok: false, reason: 'Hay un edificio o un recurso en el sitio.' };
      if (villagerTiles.has(`${tx},${ty}`)) return { ok: false, reason: 'Hay una unidad en el sitio.' };
    }
  }
  return { ok: true };
}

/** Busca, en espiral desde (cx, cy), la primera posición válida para un edificio. */
export function findPlacementNear(world: WorldState, type: BuildingType, cx: number, cy: number, maxRadius = 10): Tile | null {
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (canPlaceBuilding(world, type, cx + dx, cy + dy).ok) return { x: cx + dx, y: cy + dy };
      }
    }
  }
  return null;
}
