import { useEffect, useState } from 'preact/hooks';
import { BUILDINGS, RESOURCE_LABELS, RESOURCE_TYPES } from '../content/economy.ts';
import type { HudStore } from './store.ts';

export interface AppActions {
  zoomIn(): void;
  zoomOut(): void;
  recenter(): void;
  startBuildMill(): void;
  confirmPlacement(): void;
  cancelPlacement(): void;
  deselect(): void;
  togglePause(): void;
  toggleBoxMode(): void;
  save(): void;
  load(): void;
}

const millCost = Object.entries(BUILDINGS.mill.cost)
  .map(([r, n]) => `${n} ${RESOURCE_LABELS[r as keyof typeof RESOURCE_LABELS].toLowerCase()}`)
  .join(', ');

export function App({ store, actions, build, touch }: { store: HudStore; actions: AppActions; build: string; touch: boolean }) {
  const [s, setState] = useState(store.get());
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, [store]);

  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(`${s.error ?? ''}\nBuild: ${build}\n${navigator.userAgent}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const sel = s.selection;
  const place = s.placement;

  return (
    <>
      <header class="bar">
        <div class="brand">
          <span class="title">Empires-War</span>
          <span class="stage">Bloque 1 · IA no implementada · datos provisionales</span>
        </div>
        <ul class="resources" aria-label="Reserva común">
          {RESOURCE_TYPES.map((r) => (
            <li key={r} class={`res res-${r}`} data-resource={r}>
              <span class="res-label">{RESOURCE_LABELS[r]}</span>
              <span class="res-value">{s.stockpile[r]}</span>
            </li>
          ))}
        </ul>
        <dl class="stats" aria-label="Rendimiento">
          <div><dt>FPS</dt><dd>{s.fps}</dd></div>
          <div><dt>Ticks/s</dt><dd>{s.ticksPerSecond}</dd></div>
          <div><dt>Tick</dt><dd>{s.stepMs.toFixed(2)} ms</dd></div>
          <div><dt>Zoom</dt><dd>{s.zoom.toFixed(2)}</dd></div>
        </dl>
      </header>

      {s.paused && <div class="paused-banner">En pausa</div>}

      {s.box && <div class="select-box" style={{ left: `${s.box.x}px`, top: `${s.box.y}px`, width: `${s.box.w}px`, height: `${s.box.h}px` }} />}

      {s.toast && (
        <div key={s.toast.id} class={`toast toast-${s.toast.kind}`} role="status">
          {s.toast.text}
        </div>
      )}

      <section class="panel" aria-label="Selección">
        {place ? (
          <div class="placing">
            <p class="panel-title">Construir {place.name}</p>
            <p class="panel-line">
              {!place.hasTile
                ? touch
                  ? 'Toca el mapa donde quieres el edificio.'
                  : 'Mueve el ratón y haz clic donde quieres el edificio. Clic derecho cancela.'
                : place.valid
                  ? touch
                    ? 'Sitio válido. Pulsa Confirmar.'
                    : 'Sitio válido. Haz clic para colocarlo.'
                  : place.reason}
            </p>
            <div class="panel-actions">
              {touch && (
                <button type="button" class="primary" disabled={!place.valid} onClick={actions.confirmPlacement}>
                  Confirmar
                </button>
              )}
              <button type="button" onClick={actions.cancelPlacement}>Cancelar</button>
            </div>
          </div>
        ) : sel.kind === 'none' ? (
          <p class="panel-line hint">
            {touch
              ? 'Toca un aldeano para seleccionarlo. Luego toca un arbusto de bayas para recolectar o el suelo para moverlo.'
              : 'Clic izquierdo selecciona (arrastra para un recuadro). Clic derecho da la orden: bayas = recolectar, suelo = mover.'}
          </p>
        ) : (
          <div>
            <p class="panel-title">{sel.title}</p>
            {sel.lines.map((line) => (
              <p class="panel-line" key={line}>{line}</p>
            ))}
            <div class="panel-actions">
              {sel.canOrderBuild && (
                <button type="button" class="primary" disabled={!s.canAffordMill} onClick={actions.startBuildMill}>
                  Construir Molino · {millCost}
                </button>
              )}
              <button type="button" onClick={actions.deselect} aria-label="Quitar selección">Quitar selección</button>
            </div>
          </div>
        )}
      </section>

      <nav class="controls" aria-label="Cámara y partida">
        <button type="button" onClick={actions.zoomIn} aria-label="Acercar">+</button>
        <button type="button" onClick={actions.zoomOut} aria-label="Alejar">−</button>
        <button type="button" class="small" onClick={actions.recenter}>Centrar</button>
        {touch && (
          <button type="button" class={`small ${s.boxMode ? 'active' : ''}`} aria-pressed={s.boxMode} onClick={actions.toggleBoxMode}>
            Recuadro
          </button>
        )}
        <button type="button" class="small" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
          Partida
        </button>
      </nav>

      {menuOpen && (
        <div class="menu" role="dialog" aria-label="Partida">
          <p class="panel-title">Partida</p>
          <div class="menu-actions">
            <button type="button" onClick={actions.togglePause}>{s.paused ? 'Reanudar' : 'Pausar'}</button>
            <button type="button" class="primary" disabled={s.saving} onClick={actions.save}>
              {s.saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" disabled={s.saving} onClick={actions.load}>Cargar</button>
          </div>
          <p class="menu-note">{s.lastSavedAt ? `Último guardado: ${s.lastSavedAt}` : 'Aún no hay partida guardada en esta sesión.'}</p>
          <p class="menu-warning">
            Las partidas se guardan solo en este navegador. Si borras los datos de Safari o de este sitio, se pierden.
          </p>
          <button type="button" class="menu-close" onClick={() => setMenuOpen(false)}>Cerrar</button>
        </div>
      )}

      <footer class="build">Versión {build} · arte y datos provisionales</footer>

      {s.error && (
        <div class="error" role="alert">
          <h2>Se produjo un error</h2>
          <pre>{s.error}</pre>
          <button type="button" onClick={copyError}>{copied ? 'Copiado' : 'Copiar error'}</button>
        </div>
      )}
    </>
  );
}
