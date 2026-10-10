import { BERRY_BUSH, BLOCK1_SCENARIO, PLAYER_ID, STARTING_STOCKPILE } from '../content/economy.ts';
import { generateTestTerrain } from './terrainGen.ts';
import type { Building, Entity, EntityId, PlayerState, ResourceNode, Villager } from './types.ts';
import { updateVillagers } from './villager.ts';

// Estado completo del mundo: solo datos simples (sin funciones ni clases),
// para que se pueda guardar, comparar y, en el futuro, mover a un Web Worker.
export const WORLD_SCHEMA_VERSION = 2;

export interface WorldMap {
  width: number;
  height: number;
  /** Índices de terreno (ver content/terrain.ts), fila por fila. */
  terrain: number[];
}

export interface WorldState {
  schemaVersion: typeof WORLD_SCHEMA_VERSION;
  seed: number;
  tick: number;
  /** Próximo identificador de entidad. Los IDs nunca se reutilizan. */
  nextEntityId: number;
  map: WorldMap;
  players: Record<string, PlayerState>;
  /** Entidades por ID. Las claves numéricas se recorren siempre en orden ascendente. */
  entities: Record<string, Entity>;
}

export function createEmptyWorld(options: { seed: number; size: number }): WorldState {
  const { seed, size } = options;
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    seed,
    tick: 0,
    nextEntityId: 1,
    map: { width: size, height: size, terrain: generateTestTerrain(size, seed) },
    players: {
      [PLAYER_ID]: { name: 'Jugador', stockpile: { ...STARTING_STOCKPILE.value } },
    },
    entities: {},
  };
}

/** Crea el mundo con el escenario de prueba del Bloque 1. */
export function createWorld(options: { seed: number; size: number }): WorldState {
  const world = createEmptyWorld(options);
  const s = BLOCK1_SCENARIO;
  addEntity(world, {
    kind: 'building',
    type: 'townCenter',
    owner: PLAYER_ID,
    x: s.townCenter.x,
    y: s.townCenter.y,
    complete: true,
    buildProgress: 0,
  });
  for (const v of s.villagers) addEntity(world, newVillager(v.x, v.y));
  for (const b of s.berryBushes) {
    addEntity(world, { kind: 'resource', type: 'berryBush', resource: 'food', x: b.x, y: b.y, amount: BERRY_BUSH.food });
  }
  // Fuentes iniciales de los cuatro recursos: primera etapa del ciclo económico.
  // Son provisionales y se sustituirán por distribución generada en el mapa definitivo.
  for (const [type, resource, amount, positions] of [
    ['tree', 'wood', 150, [[17, 17], [18, 17], [17, 18], [18, 18]]],
    ['goldMine', 'gold', 500, [[35, 25], [36, 25]]],
    ['stoneMine', 'stone', 500, [[34, 31], [35, 31]]],
  ] as const) {
    for (const [x, y] of positions) {
      addEntity(world, { kind: 'resource', type, resource, x, y, amount });
    }
  }
  return world;
}

export function newVillager(x: number, y: number, owner = PLAYER_ID): Omit<Villager, 'id'> {
  return {
    kind: 'villager',
    owner,
    x,
    y,
    path: [],
    task: { type: 'idle' },
    carryType: null,
    carryAmount: 0,
    gatherProgress: 0,
  };
}

type NewEntity = Omit<Villager, 'id'> | Omit<Building, 'id'> | Omit<ResourceNode, 'id'>;

/** Añade una entidad con el siguiente ID estable y devuelve ese ID. */
export function addEntity(world: WorldState, entity: NewEntity): EntityId {
  const id = world.nextEntityId++;
  world.entities[id] = { ...entity, id } as Entity;
  return id;
}

export function getEntity(world: WorldState, id: EntityId): Entity | undefined {
  return world.entities[id];
}

export function removeEntity(world: WorldState, id: EntityId): void {
  delete world.entities[id];
}

/** Entidades en orden de ID ascendente (orden determinista). */
export function entityList(world: WorldState): Entity[] {
  return Object.values(world.entities);
}

/** Sustituye el contenido de `target` por el de `source` (carga de partida) conservando el mismo objeto. */
export function replaceWorld(target: WorldState, source: WorldState): void {
  const copy = JSON.parse(JSON.stringify(source)) as WorldState;
  for (const key of Object.keys(target) as (keyof WorldState)[]) delete target[key];
  Object.assign(target, copy);
}

/** Avanza la simulación un tick fijo. */
export function stepWorld(state: WorldState): void {
  state.tick += 1;
  updateVillagers(state);
}

export function terrainAt(map: WorldMap, x: number, y: number): number | undefined {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return map.terrain[y * map.width + x];
}

/** Huella del estado completo (FNV-1a de 32 bits sobre el JSON). Sirve para comparar estados. */
export function hashWorld(state: WorldState): string {
  const text = JSON.stringify(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
