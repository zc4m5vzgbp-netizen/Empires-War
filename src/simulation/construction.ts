import { ENGINE } from '../content/config.ts';
import { BUILDINGS } from '../content/economy.ts';
import type { EntityId } from './types.ts';
import { getEntity, type WorldState } from './world.ts';

// Construcción progresiva. Con n aldeanos el tiempo es base × 3 / (n + 2)
// (fórmula de referencia de AoE II, provisional): por tick se suman (n + 2) tercios.

/** Progreso necesario para terminar, en tercios de tick-aldeano. */
export function requiredProgress(buildTimeSeconds: number): number {
  return 3 * buildTimeSeconds * ENGINE.tickRate;
}

/** Fracción construida, de 0 a 1. */
export function constructionRatio(type: keyof typeof BUILDINGS, progress: number): number {
  const required = requiredProgress(BUILDINGS[type].buildTimeSeconds);
  return required <= 0 ? 1 : Math.min(1, progress / required);
}

export function advanceConstruction(world: WorldState, builders: Map<EntityId, number>): void {
  for (const [id, n] of builders) {
    const site = getEntity(world, id);
    if (!site || site.kind !== 'building' || site.complete || n <= 0) continue;
    site.buildProgress += n + 2;
    if (site.buildProgress >= requiredProgress(BUILDINGS[site.type].buildTimeSeconds)) {
      site.buildProgress = requiredProgress(BUILDINGS[site.type].buildTimeSeconds);
      site.complete = true;
    }
  }
}
