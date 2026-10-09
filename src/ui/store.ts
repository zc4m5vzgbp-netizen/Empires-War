// Almacén mínimo para que el render informe a la interfaz sin acoplarlas.
export interface HudState {
  fps: number;
  ticksPerSecond: number;
  stepMs: number;
  tick: number;
  zoom: number;
  info: string | null;
  error: string | null;
}

type Listener = (state: HudState) => void;

export function createHudStore(initial: HudState) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch: Partial<HudState>) {
      state = { ...state, ...patch };
      for (const l of listeners) l(state);
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type HudStore = ReturnType<typeof createHudStore>;
