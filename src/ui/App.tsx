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
  emailLogin(email: string): void;
  verifyEmailCode(email: string, code: string): void;
  logout(): void;
  chooseSlot(id: string): void;
  newEmpire(fromCurrent: boolean): void;
  resolveConflict(choice: 'cloud' | 'mine-as-new'): void;
  retry(): void;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const millCost = Object.entries(BUILDINGS.mill.cost)
  .map(([r, n]) => `${n} ${RESOURCE_LABELS[r as keyof typeof RESOURCE_LABELS].toLowerCase()}`)
  .join(', ');

export function App({ store, actions, build, touch }: { store: HudStore; actions: AppActions; build: string; touch: boolean }) {
  const [s, setState] = useState(store.get());
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
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
  const c = s.cloud;
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
          <p class={`menu-status status-${c.phase}`} data-phase={c.phase} role="status">
            {c.busy ? 'Sincronizando… · ' : ''}
            {c.status}
          </p>

          {!c.user ? (
            <div class="menu-actions login">
              <p class="menu-note">Inicia sesión con tu correo para guardar en la nube y seguir en otro dispositivo.</p>
              <label class="menu-note" for="cloud-email">Correo electrónico</label>
              <input id="cloud-email" type="email" autoComplete="email" value={email} onInput={(e) => setEmail(e.currentTarget.value)} placeholder="tu@correo.com" />
              <button type="button" disabled={!email.includes('@')} onClick={() => actions.emailLogin(email)}>Enviar correo de acceso</button>
              <label class="menu-note" for="cloud-code">Abre el enlace del correo, o escribe aquí el código que trae:</label>
              <input id="cloud-code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onInput={(e) => setCode(e.currentTarget.value)} placeholder="Código del correo" />
              <button type="button" disabled={!email.includes('@') || code.trim().length < 6} onClick={() => actions.verifyEmailCode(email, code)}>Confirmar código</button>
            </div>
          ) : (
            <>
              <p class="menu-note">Cuenta: {c.user}</p>
              {c.activeTitle && (
                <p class="menu-note">
                  Imperio actual: <strong>{c.activeTitle}</strong>
                  {c.revision > 0 ? ` · revisión ${c.revision}` : ' · aún no está en la nube'}
                  {c.unsynced ? ' · cambios sin subir' : ''}
                </p>
              )}
              {c.phase === 'conflict' && (
                <div class="menu-actions conflict">
                  <button type="button" onClick={() => actions.resolveConflict('cloud')}>Usar la versión de la nube</button>
                  <button type="button" class="primary" onClick={() => actions.resolveConflict('mine-as-new')}>Guardar la mía como imperio nuevo</button>
                </div>
              )}
              {c.phase === 'offline' && (
                <div class="menu-actions">
                  <button type="button" disabled={c.busy} onClick={actions.retry}>Reintentar ahora</button>
                </div>
              )}
              {c.phase === 'choose' && (
                <div class="menu-actions">
                  <button type="button" class="primary" disabled={c.busy} onClick={() => actions.newEmpire(true)}>Guardar mi progreso como imperio nuevo</button>
                </div>
              )}
            </>
          )}

          <div class="menu-actions">
            <button type="button" onClick={actions.togglePause}>{s.paused ? 'Reanudar' : 'Pausar'}</button>
            <button type="button" class="primary" disabled={c.busy || c.phase === 'conflict'} onClick={actions.save}>
              {c.busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>

          {c.user && c.phase !== 'connecting' && (
            <div class="menu-actions slots">
              <p class="menu-note">Tus imperios</p>
              {c.slots.map((slot) => (
                <button type="button" key={slot.id} disabled={c.busy || slot.id === c.activeId} onClick={() => actions.chooseSlot(slot.id)}>
                  {slot.id === c.activeId ? '▶ ' : ''}
                  {slot.title} · {when(slot.updatedAt)}
                </button>
              ))}
              <button type="button" disabled={c.busy || c.phase === 'conflict'} onClick={() => actions.newEmpire(false)}>Nuevo imperio desde cero</button>
              <button type="button" disabled={c.busy} onClick={actions.logout}>Cerrar sesión</button>
            </div>
          )}

          <p class="menu-note">
            Nube: {when(c.lastCloudSave)} · Este dispositivo: {when(c.lastLocalSave)}
          </p>
          <p class="menu-warning">
            Se guarda solo cada 30 s y al salir del juego. Safari puede cerrar el juego en segundo plano: lo último queda en este
            dispositivo y se sube al volver con conexión. Antes de cambiar de dispositivo, espera a ver «Guardado en la nube».
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
