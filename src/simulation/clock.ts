// Reloj de ticks fijos: convierte el tiempo real de cada frame en un número entero de ticks.
// La simulación siempre avanza en pasos iguales, sin importar los FPS del dispositivo.
export interface FixedClock {
  tickRate: number;
  maxTicksPerFrame: number;
  accumulatorMs: number;
  paused: boolean;
  /** Multiplicador de velocidad. 1 = normal. Solo lo usan las pruebas automáticas; no se guarda. */
  timeScale: number;
}

export function createFixedClock(tickRate: number, maxTicksPerFrame: number): FixedClock {
  return { tickRate, maxTicksPerFrame, accumulatorMs: 0, paused: false, timeScale: 1 };
}

/** Suma el tiempo del frame y devuelve cuántos ticks deben ejecutarse ahora. */
export function advanceClock(clock: FixedClock, deltaMs: number): number {
  if (clock.paused) return 0;
  const stepMs = 1000 / clock.tickRate;
  clock.accumulatorMs += Math.max(0, deltaMs) * clock.timeScale;
  let ticks = Math.floor(clock.accumulatorMs / stepMs);
  if (ticks > clock.maxTicksPerFrame) {
    // El dispositivo se quedó atrás: se descarta el retraso en lugar de intentar recuperarlo todo.
    ticks = clock.maxTicksPerFrame;
    clock.accumulatorMs = 0;
  } else {
    clock.accumulatorMs -= ticks * stepMs;
  }
  return ticks;
}
