import { generateTestTerrain } from './terrainGen.ts';

// Estado completo del mundo: solo datos simples (sin funciones ni clases),
// para que se pueda guardar, comparar y, en el futuro, mover a un Web Worker.
export const WORLD_SCHEMA_VERSION = 1;

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
  /** Próximo identificador estable para entidades (aún no hay entidades en el Bloque 0). */
  nextEntityId: number;
  map: WorldMap;
}

export function createWorld(options: { seed: number; size: number }): WorldState {
  const { seed, size } = options;
  return {
    schemaVersion: WORLD_SCHEMA_VERSION,
    seed,
    tick: 0,
    nextEntityId: 1,
    map: { width: size, height: size, terrain: generateTestTerrain(size, seed) },
  };
}

/** Avanza la simulación un tick fijo. */
export function stepWorld(state: WorldState): void {
  state.tick += 1;
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
