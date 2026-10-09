import { PROVISIONAL_BLOCK0, type Sourced } from './types.ts';

// Configuración técnica del motor (no es balance de juego).
export const ENGINE = {
  /** Ticks de simulación por segundo (documento maestro v2, §9 y §10). */
  tickRate: 20,
  /** Máximo de ticks recuperados en un frame, para que un dispositivo lento no se bloquee. */
  maxTicksPerFrame: 5,
} as const;

// Mapa de la escena de prueba del Bloque 0.
export const TEST_MAP: { size: number; seed: number } & Sourced = {
  size: 48,
  seed: 20261009,
  ...PROVISIONAL_BLOCK0,
};

// Generación del terreno de prueba (valores provisionales del Bloque 0).
export const TEST_TERRAIN = {
  /** Tamaño de celda del ruido, en casillas. */
  noiseCell: 8,
  waterBelow: 0.27,
  dirtAbove: 0.7,
  forestAbove: 0.68,
  /** Radio despejado (en casillas) alrededor del centro, reservado para el Bloque 1. */
  clearRadius: 6,
} as const;
