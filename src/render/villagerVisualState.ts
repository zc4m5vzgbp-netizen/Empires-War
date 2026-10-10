import type { ResourceType } from '../content/economy.ts';
import type { ResourceNode, Villager } from '../simulation/types.ts';

/** Contrato visual PR #13. No modifica la simulación ni los recursos transportados. */
export type VillagerVisualAction =
  | 'idle' | 'walk' | 'chop' | 'mine' | 'forage' | 'farm' | 'build'
  | 'carry/wood' | 'carry/stone' | 'carry/gold' | 'carry/food'
  | 'carry/wood-idle' | 'carry/stone-idle' | 'carry/gold-idle' | 'carry/food-idle';

export const VILLAGER_ECO_ORIGIN = { x: 0.5, y: 0.6905 } as const;
export const VILLAGER_ECO_BODY_OFFSET = 19;

function carryAction(resource: ResourceType, moving: boolean): VillagerVisualAction {
  return `carry/${resource}${moving ? '' : '-idle'}` as VillagerVisualAction;
}

/** La fase de tarea tiene prioridad sobre una carga parcial al recolectar o construir. */
export function villagerVisualAction(
  villager: Villager,
  moving: boolean,
  target: ResourceNode | undefined,
): VillagerVisualAction {
  const task = villager.task;
  if (task.type === 'gather' && task.phase === 'gathering' && target) {
    if (target.type === 'tree') return 'chop';
    if (target.type === 'berryBush') return 'forage';
    if (target.type === 'goldMine' || target.type === 'stoneMine') return 'mine';
  }
  if (task.type === 'build' && task.phase === 'building') return 'build';
  if (villager.carryAmount > 0 && villager.carryType) return carryAction(villager.carryType, moving);
  return moving ? 'walk' : 'idle';
}
