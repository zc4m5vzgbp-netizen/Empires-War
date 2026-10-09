import { useEffect, useState } from 'preact/hooks';
import type { HudStore } from './store.ts';

export interface AppActions {
  zoomIn(): void;
  zoomOut(): void;
  recenter(): void;
}

export function App({ store, actions, build }: { store: HudStore; actions: AppActions; build: string }) {
  const [state, setState] = useState(store.get());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, [store]);

  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(`${state.error ?? ''}\nBuild: ${build}\n${navigator.userAgent}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <header class="bar">
        <div class="brand">
          <span class="title">Empires-War</span>
          <span class="stage">Bloque 0 · escena de prueba, no es gameplay</span>
        </div>
        <dl class="stats" aria-label="Rendimiento">
          <div><dt>FPS</dt><dd>{state.fps}</dd></div>
          <div><dt>Ticks/s</dt><dd>{state.ticksPerSecond}</dd></div>
          <div><dt>Tick</dt><dd>{state.stepMs.toFixed(2)} ms</dd></div>
          <div><dt>Zoom</dt><dd>{state.zoom.toFixed(2)}</dd></div>
        </dl>
      </header>

      <p class="info" role="status">
        {state.info ?? 'Arrastra para mover el mapa, pellizca para hacer zoom y toca una casilla para inspeccionarla.'}
      </p>

      <nav class="controls" aria-label="Cámara">
        <button type="button" onClick={actions.zoomOut} aria-label="Alejar">−</button>
        <button type="button" onClick={actions.zoomIn} aria-label="Acercar">+</button>
        <button type="button" class="wide" onClick={actions.recenter}>Centrar</button>
      </nav>

      <footer class="build">Versión {build} · arte y terreno provisionales</footer>

      {state.error && (
        <div class="error" role="alert">
          <h2>Se produjo un error</h2>
          <pre>{state.error}</pre>
          <button type="button" onClick={copyError}>{copied ? 'Copiado' : 'Copiar error'}</button>
        </div>
      )}
    </>
  );
}
