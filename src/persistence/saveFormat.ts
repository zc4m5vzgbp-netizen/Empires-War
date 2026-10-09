import { WORLD_SCHEMA_VERSION, hashWorld, type WorldState } from '../simulation/world.ts';

// Formato de partida guardada, versionado. Define y valida el contenido sin depender del navegador;
// el almacenamiento en IndexedDB vive en idbStore.ts.
export const SAVE_FORMAT = 'empires-war-save';
/** v1: Bloque 0 (solo mapa). v2: Bloque 1 (entidades y reserva común). */
export const SAVE_FORMAT_VERSION = 2;

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  formatVersion: number;
  savedAt: string;
  hash: string;
  world: WorldState;
}

export type DecodeResult = { ok: true; save: SaveFile } | { ok: false; error: string };

export function encodeSave(world: WorldState, savedAt: string): string {
  const save: SaveFile = {
    format: SAVE_FORMAT,
    formatVersion: SAVE_FORMAT_VERSION,
    savedAt,
    hash: hashWorld(world),
    world,
  };
  return JSON.stringify(save);
}

export function decodeSave(text: string): DecodeResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un guardado válido (JSON ilegible).' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'Guardado vacío o con formato desconocido.' };
  const save = data as Partial<SaveFile>;
  if (save.format !== SAVE_FORMAT) return { ok: false, error: 'No es un guardado de Empires-War.' };
  if (save.formatVersion !== SAVE_FORMAT_VERSION) {
    return { ok: false, error: `Versión de guardado ${String(save.formatVersion)} no compatible (se esperaba ${SAVE_FORMAT_VERSION}).` };
  }
  const world = save.world;
  if (
    !world ||
    world.schemaVersion !== WORLD_SCHEMA_VERSION ||
    !Array.isArray(world.map?.terrain) ||
    typeof world.entities !== 'object' ||
    world.entities === null ||
    typeof world.players !== 'object' ||
    world.players === null ||
    !Number.isInteger(world.nextEntityId)
  ) {
    return { ok: false, error: 'El estado del mundo guardado está incompleto.' };
  }
  if (world.map.terrain.length !== world.map.width * world.map.height) {
    return { ok: false, error: 'El mapa guardado no coincide con su tamaño.' };
  }
  if (hashWorld(world) !== save.hash) return { ok: false, error: 'El guardado está dañado (la huella no coincide).' };
  return { ok: true, save: save as SaveFile };
}
