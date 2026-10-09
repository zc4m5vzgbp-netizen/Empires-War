import type { Sourced } from './types.ts';

// Datos económicos del Bloque 1.
// IMPORTANTE: son valores de referencia de AoE II DE recordados, NO verificados contra una versión de
// balance concreta. Están marcados como provisionales y no deben presentarse como datos confirmados.
const AOE2_UNVERIFIED: Sourced = {
  sourceVersion: 'AoE II DE (versión de balance sin determinar)',
  sourceNote: 'Valor de referencia recordado, sin verificar. Pendiente de validar en el Bloque 2.',
  status: 'provisional',
};

export const RESOURCE_TYPES = ['food', 'wood', 'gold', 'stone'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type Stockpile = Record<ResourceType, number>;

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  food: 'Comida',
  wood: 'Madera',
  gold: 'Oro',
  stone: 'Piedra',
};

/** Reserva común inicial del imperio. */
export const STARTING_STOCKPILE: { value: Stockpile } & Sourced = {
  value: { food: 200, wood: 200, gold: 100, stone: 200 },
  ...AOE2_UNVERIFIED,
};

export const VILLAGER = {
  /** Casillas por segundo. */
  speed: 0.8,
  /** Unidades de recurso que transporta como máximo. */
  carryCapacity: 10,
  /** Comida por segundo al recolectar bayas. */
  forageRatePerSecond: 0.31,
  ...AOE2_UNVERIFIED,
} as const;

export const BERRY_BUSH = {
  food: 125,
  ...AOE2_UNVERIFIED,
} as const;

export type BuildingType = 'townCenter' | 'mill';

export interface BuildingDef extends Sourced {
  type: BuildingType;
  name: string;
  /** Lado de la huella cuadrada, en casillas. */
  size: number;
  cost: Partial<Stockpile>;
  /** Tiempo de construcción con un solo aldeano, en segundos. */
  buildTimeSeconds: number;
  /** Recursos que acepta como depósito una vez terminado. */
  accepts: readonly ResourceType[];
  constructible: boolean;
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  townCenter: {
    type: 'townCenter',
    name: 'Centro Urbano',
    size: 4,
    cost: {},
    buildTimeSeconds: 0,
    accepts: RESOURCE_TYPES,
    constructible: false,
    sourceVersion: 'n/a',
    sourceNote: 'Edificio provisional del Bloque 1: solo recibe recursos. Sin producción ni vida todavía.',
    status: 'provisional',
  },
  mill: {
    type: 'mill',
    name: 'Molino',
    size: 2,
    cost: { wood: 100 },
    buildTimeSeconds: 35,
    accepts: ['food'],
    constructible: true,
    ...AOE2_UNVERIFIED,
  },
};

/**
 * Velocidad de construcción con varios aldeanos: tiempo = base × 3 / (n + 2).
 * Fórmula de referencia de AoE II recordada, sin verificar.
 */
export const BUILDERS_FORMULA: Sourced = AOE2_UNVERIFIED;

/** Escenario de prueba del Bloque 1 (posiciones en casillas, provisional). */
export const BLOCK1_SCENARIO = {
  townCenter: { x: 22, y: 22 },
  villagers: [
    { x: 21, y: 26 },
    { x: 23, y: 27 },
    { x: 26, y: 26 },
  ],
  berryBushes: [
    { x: 30, y: 19 },
    { x: 31, y: 19 },
    { x: 30, y: 20 },
    { x: 31, y: 20 },
    { x: 32, y: 20 },
    { x: 31, y: 21 },
  ],
  sourceVersion: 'n/a',
  sourceNote: 'Distribución de prueba del Bloque 1, no es un mapa de partida real.',
  status: 'provisional',
} as const;

export const PLAYER_ID = 1;
