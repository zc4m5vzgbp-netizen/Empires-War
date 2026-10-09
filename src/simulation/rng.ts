// Generador aleatorio con semilla (mulberry32). Misma semilla = misma secuencia.
// La simulación nunca usa el aleatorio del navegador: así las partidas son reproducibles.
export interface Rng {
  next(): number;
  /** Estado interno actual, serializable. */
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get state() {
      return s;
    },
  };
}
