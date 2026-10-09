import type { FixedClock } from '../simulation/clock.ts';

// Regla del documento maestro v2, §3.8: el mundo se congela SOLO mientras se escribe el guardado.
// Al terminar, reanuda si estaba en marcha; si ya estaba en pausa, sigue en pausa.
export async function withSavePause<T>(clock: FixedClock, write: () => Promise<T>): Promise<T> {
  const wasPaused = clock.paused;
  clock.paused = true;
  try {
    return await write();
  } finally {
    clock.paused = wasPaused;
    clock.accumulatorMs = 0; // el tiempo de escritura no se recupera como ticks atrasados
  }
}
