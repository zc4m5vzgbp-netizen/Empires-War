import { TEST_TERRAIN } from '../content/config.ts';
import { TerrainKind } from '../content/terrain.ts';
import { createRng, type Rng } from './rng.ts';

// Ruido suave: valores aleatorios en una rejilla gruesa, interpolados.
function createValueNoise(size: number, cell: number, rng: Rng): (x: number, y: number) => number {
  const cells = Math.ceil(size / cell) + 2;
  const values = new Float64Array(cells * cells);
  for (let i = 0; i < values.length; i++) values[i] = rng.next();
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const at = (cx: number, cy: number) => values[cy * cells + cx] ?? 0;
  return (x, y) => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smooth(gx - x0);
    const ty = smooth(gy - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

/** Genera el terreno de prueba. Determinista: la misma semilla produce el mismo mapa. */
export function generateTestTerrain(size: number, seed: number): number[] {
  const rng = createRng(seed);
  const height = createValueNoise(size, TEST_TERRAIN.noiseCell, rng);
  const vegetation = createValueNoise(size, TEST_TERRAIN.noiseCell / 2, rng);
  const center = (size - 1) / 2;
  const terrain = new Array<number>(size * size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let kind: TerrainKind = TerrainKind.Grass;
      const h = height(x, y);
      if (h < TEST_TERRAIN.waterBelow) kind = TerrainKind.Water;
      else if (h > TEST_TERRAIN.dirtAbove) kind = TerrainKind.Dirt;
      else if (vegetation(x, y) > TEST_TERRAIN.forestAbove) kind = TerrainKind.Forest;

      if (Math.hypot(x - center, y - center) <= TEST_TERRAIN.clearRadius) kind = TerrainKind.Grass;
      terrain[y * size + x] = kind;
    }
  }
  return terrain;
}
