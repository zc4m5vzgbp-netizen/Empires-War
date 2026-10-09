import { PROVISIONAL_BLOCK0, type Sourced } from './types.ts';

// Tipos de terreno de prueba. El índice es el valor guardado en la cuadrícula del mapa.
export const TerrainKind = {
  Grass: 0,
  Dirt: 1,
  Water: 2,
  Forest: 3,
} as const;
export type TerrainKind = (typeof TerrainKind)[keyof typeof TerrainKind];

export interface TerrainDef extends Sourced {
  kind: TerrainKind;
  name: string;
  walkable: boolean;
}

export const TERRAIN_DEFS: readonly TerrainDef[] = [
  { kind: TerrainKind.Grass, name: 'Hierba', walkable: true, ...PROVISIONAL_BLOCK0 },
  { kind: TerrainKind.Dirt, name: 'Tierra', walkable: true, ...PROVISIONAL_BLOCK0 },
  { kind: TerrainKind.Water, name: 'Agua', walkable: false, ...PROVISIONAL_BLOCK0 },
  { kind: TerrainKind.Forest, name: 'Bosque', walkable: false, ...PROVISIONAL_BLOCK0 },
];

export const TERRAIN_COUNT = TERRAIN_DEFS.length;
