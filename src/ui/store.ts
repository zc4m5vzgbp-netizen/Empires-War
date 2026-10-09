import type { Stockpile } from '../content/economy.ts';
import type { PlacementSummary, SelectionSummary } from '../input/controller.ts';

// Almacén mínimo para que el render informe a la interfaz sin acoplarlas.
// La interfaz solo LEE estos datos y envía acciones; nunca modifica la simulación.
export interface HudState {
  fps: number;
  ticksPerSecond: number;
  stepMs: number;
  tick: number;
  zoom: number;
  stockpile: Stockpile;
  selection: SelectionSummary;
  placement: PlacementSummary | null;
  /** ¿La reserva alcanza para un Molino? (lo decide la simulación) */
  canAffordMill: boolean;
  paused: boolean;
  boxMode: boolean;
  /** Recuadro de selección en pantalla mientras se arrastra. */
  box: { x: number; y: number; w: number; h: number } | null;
  saving: boolean;
  lastSavedAt: string | null;
  toast: { id: number; text: string; kind: 'info' | 'error' } | null;
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
