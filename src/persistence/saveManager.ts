// Gestor de guardado: copia local en el dispositivo (IndexedDB) + nube (Supabase), con control de revisiones.
// No depende del navegador ni de Supabase: recibe adaptadores, así se prueba con dobles en tests/saveManager.test.ts.
//
// Garantías:
// - Solo se anuncia «Guardado en la nube» cuando la nube confirma una revisión nueva.
// - Antes de subir, el estado se escribe en el dispositivo; si la subida falla, se reintenta y no se pierde al cerrar Safari.
// - Nunca se sobrescribe en silencio una revisión más nueva de otro dispositivo: se detiene y se pregunta (conflicto).
// - Cambiar de imperio, crear uno nuevo o cerrar sesión primero intentan guardar el imperio actual.

export interface SlotMeta {
  id: string;
  title: string;
  revision: number;
  updatedAt: string;
}
export interface SlotFull extends SlotMeta {
  data: string;
}
export interface SaveResult {
  id: string;
  revision: number;
  savedAt: string;
}

/** La nube rechazó el guardado porque la revisión ya no es la esperada (otro dispositivo guardó antes). */
export class ConflictError extends Error {
  constructor(message = 'Conflicto de revisión') {
    super(message);
    this.name = 'ConflictError';
  }
}

export interface CloudApi {
  list(): Promise<SlotMeta[]>;
  fetch(id: string): Promise<SlotFull | null>;
  save(id: string | null, expectedRevision: number, title: string, data: string): Promise<SaveResult>;
}

export interface LocalRecord {
  /** Id del usuario, o 'guest' para progreso sin cuenta. */
  owner: string;
  slotId: string | null;
  /** Revisión de la nube sobre la que se basa este estado. */
  revision: number;
  title: string;
  data: string;
  hash: string;
  savedAt: string;
  /** true si este mismo estado está confirmado en la nube. */
  synced: boolean;
}
export interface LocalApi {
  get(owner: string): Promise<LocalRecord | null>;
  put(record: LocalRecord): Promise<void>;
  remove(owner: string): Promise<void>;
}

export interface GameHost {
  /** Instantánea síncrona del mundo (texto de guardado y su huella). */
  capture(): { data: string; hash: string };
  /** Sustituye el mundo por un guardado; lanza error si no es válido. Devuelve la huella. */
  restore(data: string): string;
  /** Mundo nuevo desde cero. */
  reset(): void;
  /** ¿El mundo está tal como empieza una partida nueva? */
  isPristine(): boolean;
  hash(): string;
  /** Congela el mundo mientras dura `write` (regla §3.8). */
  freeze<T>(write: () => Promise<T>): Promise<T>;
  now(): string;
}

export type Phase = 'guest' | 'connecting' | 'choose' | 'ready' | 'conflict' | 'offline';

export interface ManagerView {
  user: string | null;
  phase: Phase;
  status: string;
  slots: SlotMeta[];
  activeId: string | null;
  activeTitle: string | null;
  revision: number;
  busy: boolean;
  /** Hay cambios que la nube aún no ha confirmado. */
  unsynced: boolean;
  lastCloudSave: string | null;
  lastLocalSave: string | null;
}

export type SaveOutcome =
  | { ok: true; revision: number; id: string }
  | { ok: false; reason: 'no-session' | 'no-slot' | 'conflict' | 'error' | 'busy'; message: string };

interface Active {
  id: string | null;
  title: string;
  revision: number;
}

export const GUEST = 'guest';
export const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000, 120000];

export interface ManagerOptions {
  cloud: CloudApi;
  local: LocalApi;
  host: GameHost;
  onChange(view: ManagerView): void;
  setTimer?(fn: () => void, ms: number): unknown;
  clearTimer?(handle: unknown): void;
}

export function createSaveManager(opts: ManagerOptions) {
  const { cloud, local, host } = opts;
  const setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let owner = GUEST;
  let userLabel: string | null = null;
  let phase: Phase = 'guest';
  let status = 'Sin sesión: el progreso solo se guarda en este dispositivo';
  let slots: SlotMeta[] = [];
  let active: Active | null = null;
  /** Huella del último estado confirmado por la nube para el imperio activo. */
  let confirmedHash: string | null = null;
  let lastCloudSave: string | null = null;
  let lastLocalSave: string | null = null;
  let busy = false;
  let retryHandle: unknown = null;
  let retryIndex = 0;
  let startedFromLocal = false;
  let initialized = false;
  let chain: Promise<unknown> = Promise.resolve();

  const view = (): ManagerView => ({
    user: userLabel,
    phase,
    status,
    slots: [...slots],
    activeId: active?.id ?? null,
    activeTitle: active?.title ?? null,
    revision: active?.revision ?? 0,
    busy,
    unsynced: active !== null && host.hash() !== confirmedHash,
    lastCloudSave,
    lastLocalSave,
  });
  const emit = () => opts.onChange(view());
  const setStatus = (p: Phase, s: string) => {
    phase = p;
    status = s;
    emit();
  };

  /** Ejecuta operaciones de una en una para que dos guardados no compitan. */
  function lock<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      busy = true;
      emit();
      try {
        return await fn();
      } finally {
        busy = false;
        emit();
      }
    });
    chain = run.catch(() => undefined);
    return run;
  }

  const localKey = () => (active ? owner : GUEST);
  const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

  async function writeLocal(snap: { data: string; hash: string }, synced: boolean): Promise<boolean> {
    try {
      await local.put({
        owner: localKey(),
        slotId: active?.id ?? null,
        revision: active?.revision ?? 0,
        title: active?.title ?? 'Progreso sin cuenta',
        data: snap.data,
        hash: snap.hash,
        savedAt: host.now(),
        synced,
      });
      lastLocalSave = host.now();
      return true;
    } catch {
      return false; // sin almacenamiento local (modo privado, cuota): la nube sigue siendo la referencia
    }
  }

  function nextTitle(): string {
    let max = 0;
    for (const s of slots) {
      const m = /^Imperio (\d+)$/.exec(s.title);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `Imperio ${Math.max(max, slots.length) + 1}`;
  }

  function cancelRetry() {
    if (retryHandle !== null) clearTimer(retryHandle);
    retryHandle = null;
  }
  function scheduleRetry() {
    cancelRetry();
    const delay = RETRY_DELAYS_MS[Math.min(retryIndex, RETRY_DELAYS_MS.length - 1)]!;
    retryIndex++;
    retryHandle = setTimer(() => {
      retryHandle = null;
      void retryNow();
    }, delay);
  }

  /** Sube la instantánea al imperio activo. Debe llamarse dentro de lock(). */
  async function upload(snap: { data: string; hash: string }): Promise<SaveOutcome> {
    if (!active) return { ok: false, reason: 'no-slot', message: 'Elige o crea un imperio.' };
    try {
      const res = await cloud.save(active.id, active.revision, active.title, snap.data);
      active.id = res.id;
      active.revision = res.revision;
      confirmedHash = snap.hash;
      lastCloudSave = res.savedAt;
      retryIndex = 0;
      cancelRetry();
      await writeLocal(snap, true);
      const meta: SlotMeta = { id: res.id, title: active.title, revision: res.revision, updatedAt: res.savedAt };
      slots = [meta, ...slots.filter((s) => s.id !== res.id)];
      setStatus('ready', `Guardado en la nube (revisión ${res.revision})`);
      return { ok: true, revision: res.revision, id: res.id };
    } catch (e) {
      if (e instanceof ConflictError) {
        cancelRetry();
        setStatus(
          'conflict',
          'Otro dispositivo guardó este imperio después. No se sobrescribió nada: elige qué versión conservar.',
        );
        return { ok: false, reason: 'conflict', message: status };
      }
      setStatus(phase === 'conflict' ? 'conflict' : 'offline', 'Sin conexión con la nube: progreso guardado en este dispositivo; se reintentará');
      scheduleRetry();
      return { ok: false, reason: 'error', message: errText(e) };
    }
  }

  /** Guarda el imperio actual si tiene cambios sin confirmar. Dentro de lock(). */
  async function flushActive(): Promise<SaveOutcome | null> {
    if (!active || phase === 'conflict') return null;
    if (host.hash() === confirmedHash) return null;
    const snap = host.capture();
    await writeLocal(snap, false);
    return upload(snap);
  }

  function adopt(slot: { id: string | null; title: string; revision: number }, hash: string | null) {
    active = { ...slot };
    confirmedHash = hash;
  }

  /** Carga un imperio de la nube; si en el dispositivo hay una versión más avanzada sin subir, la usa. */
  async function restoreSlot(id: string): Promise<boolean> {
    const full = await cloud.fetch(id);
    if (!full) throw new Error('Ese imperio ya no existe en la nube.');
    const rec = await local.get(owner).catch(() => null);
    if (rec && rec.slotId === id && !rec.synced && rec.revision === full.revision) {
      host.restore(rec.data);
      adopt({ id, title: full.title, revision: full.revision }, null);
      return true; // hay cambios locales pendientes de subir
    }
    const hash = host.restore(full.data);
    adopt({ id, title: full.title, revision: full.revision }, hash);
    lastCloudSave = full.updatedAt;
    await writeLocal({ data: full.data, hash }, true);
    return false;
  }

  /** Conecta con la nube y decide qué imperio queda activo. Dentro de lock(). Nunca deja el estado en «Conectando». */
  async function connect(): Promise<void> {
    try {
      await connectInner();
    } catch (e) {
      if (phase === 'connecting') {
        setStatus(active ? 'offline' : 'choose', `No se pudo cargar el imperio: ${errText(e)}`);
        if (active) scheduleRetry();
      }
    }
  }

  async function connectInner(): Promise<void> {
    if (owner === GUEST) return;
    setStatus('connecting', 'Conectando con la nube…');
    // Arranque sin red: si el dispositivo tiene una copia de este usuario, se juega con ella mientras tanto.
    if (!active && host.isPristine() && !startedFromLocal) {
      const rec = await local.get(owner).catch(() => null);
      if (rec) {
        try {
          const hash = host.restore(rec.data);
          adopt({ id: rec.slotId, title: rec.title, revision: rec.revision }, rec.synced ? hash : null);
          startedFromLocal = true;
        } catch {
          /* copia local dañada: se ignora y se usa la nube */
        }
      }
    }
    try {
      slots = await cloud.list();
    } catch (e) {
      setStatus('offline', `No se pudo conectar con la nube (${errText(e)}). Se reintentará.`);
      scheduleRetry();
      return;
    }
    retryIndex = 0;
    cancelRetry();

    if (active) {
      const meta = active.id ? slots.find((s) => s.id === active!.id) : undefined;
      if (active.id && !meta) {
        // Borrado en otro dispositivo: se conserva el progreso como imperio nuevo.
        adopt({ id: null, title: active.title, revision: 0 }, null);
      } else if (meta && meta.revision > active.revision) {
        if (host.hash() === confirmedHash) {
          await restoreSlot(meta.id);
          setStatus('ready', 'Imperio actualizado con la versión más reciente de la nube');
          return;
        }
        setStatus('conflict', 'Este imperio cambió en otro dispositivo y aquí hay progreso sin subir. Elige qué versión conservar.');
        return;
      }
      if (host.hash() !== confirmedHash) {
        await flushActive();
        return;
      }
      setStatus('ready', 'Conectado: imperio al día en la nube');
      return;
    }

    if (slots.length === 0) {
      adopt({ id: null, title: nextTitle(), revision: 0 }, null);
      const snap = host.capture();
      await writeLocal(snap, false);
      await local.remove(GUEST).catch(() => undefined);
      await upload(snap);
      return;
    }
    if (host.isPristine()) {
      const dirty = await restoreSlot(slots[0]!.id);
      if (dirty) await flushActive();
      else setStatus('ready', `Imperio «${slots[0]!.title}» recuperado de la nube`);
      return;
    }
    setStatus('choose', 'Tienes progreso sin cuenta: guárdalo como imperio nuevo o carga uno de tus imperios.');
  }

  async function retryNow(): Promise<void> {
    if (owner === GUEST) return;
    await lock(async () => {
      if (phase === 'offline' || phase === 'connecting') {
        await connect();
      } else if (phase === 'ready') {
        await flushActive();
      }
    });
  }

  return {
    view,

    /** Cambio de sesión (inicio, cierre, otra cuenta). `null` = sin sesión. */
    setUser(user: { id: string; label: string } | null): Promise<void> {
      return lock(async () => {
        const id = user?.id ?? GUEST;
        const first = !initialized;
        initialized = true;
        if (id === owner) {
          userLabel = user?.label ?? null;
          if (first && owner === GUEST) {
            // Arranque sin sesión: se recupera el progreso sin cuenta guardado en este dispositivo.
            const rec = await local.get(GUEST).catch(() => null);
            if (rec && host.isPristine()) {
              try {
                host.restore(rec.data);
                lastLocalSave = rec.savedAt;
              } catch {
                /* copia dañada: se ignora */
              }
            }
          }
          if (owner !== GUEST && (phase === 'offline' || phase === 'connecting')) await connect();
          else emit();
          return;
        }
        cancelRetry();
        retryIndex = 0;
        const hadActive = active !== null;
        if (owner !== GUEST && hadActive) {
          // Otra cuenta o cierre de sesión: el estado se queda en el dispositivo del usuario anterior y no se mezcla.
          await writeLocal(host.capture(), host.hash() === confirmedHash);
          host.reset();
        } else if (owner === GUEST && host.isPristine()) {
          startedFromLocal = false;
        }
        owner = id;
        userLabel = user?.label ?? null;
        active = null;
        confirmedHash = null;
        slots = [];
        lastCloudSave = null;
        if (owner === GUEST) {
          const rec = await local.get(GUEST).catch(() => null);
          if (rec && host.isPristine()) {
            try {
              host.restore(rec.data);
            } catch {
              /* ignorado */
            }
          }
          setStatus('guest', 'Sin sesión: el progreso solo se guarda en este dispositivo');
          return;
        }
        await connect();
      });
    },

    /** Guardado manual: el mundo queda congelado mientras se escribe (local y nube). */
    saveNow(): Promise<SaveOutcome> {
      return lock(() =>
        host.freeze(async (): Promise<SaveOutcome> => {
          if (owner === GUEST) {
            await writeLocal(host.capture(), false);
            return { ok: false, reason: 'no-session', message: 'Sin sesión: guardado solo en este dispositivo.' };
          }
          if (phase === 'conflict') return { ok: false, reason: 'conflict', message: status };
          if (!active) return { ok: false, reason: 'no-slot', message: 'Elige o crea un imperio para guardar en la nube.' };
          const snap = host.capture();
          await writeLocal(snap, false);
          return upload(snap);
        }),
      );
    },

    /**
     * Guardado automático. Solo se congela el mundo mientras se toma la instantánea y se escribe en el dispositivo;
     * la subida usa esa copia fija, así el juego no se detiene esperando a la red.
     */
    autosave(): Promise<SaveOutcome | null> {
      if (busy) return Promise.resolve(null);
      return lock(async () => {
        if (owner === GUEST || !active) {
          await host.freeze(() => writeLocal(host.capture(), false));
          return null;
        }
        if (phase === 'conflict' || host.hash() === confirmedHash) return null;
        const snap = await host.freeze(async () => {
          const s = host.capture();
          await writeLocal(s, false);
          return s;
        });
        return upload(snap);
      });
    },

    /** Al pasar a segundo plano o cerrar: copia local inmediata y un intento de subida (sin garantía en Safari). */
    flushOnHide(): Promise<void> {
      const snap = host.capture();
      const p = writeLocal(snap, active !== null && snap.hash === confirmedHash);
      if (owner === GUEST || !active || phase === 'conflict' || snap.hash === confirmedHash) return p.then(() => emit());
      return lock(async () => {
        await p;
        if (host.hash() === confirmedHash) return;
        await upload(snap);
      }).then(() => undefined);
    },

    retryNow,

    /** Cambia a otro imperio. Primero guarda el actual; si no puede, no cambia. */
    loadSlot(id: string, opts2: { discardGuestProgress?: boolean } = {}): Promise<SaveOutcome | { ok: true }> {
      return lock(async () => {
        if (owner === GUEST) return { ok: false as const, reason: 'no-session' as const, message: 'Inicia sesión primero.' };
        if (phase === 'choose' && !opts2.discardGuestProgress) {
          return { ok: false as const, reason: 'error' as const, message: 'Confirma que quieres dejar el progreso sin cuenta.' };
        }
        if (phase === 'conflict') return { ok: false as const, reason: 'conflict' as const, message: status };
        const flushed = await flushActive();
        if (flushed && !flushed.ok) {
          return { ok: false as const, reason: flushed.reason, message: 'No se pudo guardar el imperio actual; no se cambió de imperio para no perder progreso.' };
        }
        try {
          const dirty = await restoreSlot(id);
          if (dirty) await flushActive();
          else setStatus('ready', `Imperio «${active!.title}» cargado de la nube`);
          return { ok: true as const };
        } catch (e) {
          setStatus(phase === 'choose' ? 'choose' : 'ready', `No se pudo cargar: ${errText(e)}`);
          return { ok: false as const, reason: 'error' as const, message: errText(e) };
        }
      });
    },

    /** Crea un imperio nuevo: desde cero, o con el progreso actual. Primero guarda el actual. */
    newEmpire(fromCurrent: boolean): Promise<SaveOutcome> {
      return lock(async () => {
        if (owner === GUEST) return { ok: false, reason: 'no-session', message: 'Inicia sesión primero.' };
        if (phase === 'conflict') return { ok: false, reason: 'conflict', message: 'Resuelve primero el conflicto del imperio actual.' };
        const flushed = await flushActive();
        if (flushed && !flushed.ok) {
          return { ok: false, reason: flushed.reason, message: 'No se pudo guardar el imperio actual; inténtalo de nuevo con conexión.' };
        }
        const wasGuestProgress = active === null;
        if (!fromCurrent) host.reset();
        adopt({ id: null, title: nextTitle(), revision: 0 }, null);
        const snap = host.capture();
        await writeLocal(snap, false);
        if (wasGuestProgress && fromCurrent) await local.remove(GUEST).catch(() => undefined);
        phase = 'ready';
        return upload(snap);
      });
    },

    /** Resuelve un conflicto: cargar la versión de la nube, o guardar la de este dispositivo como imperio nuevo. */
    resolveConflict(choice: 'cloud' | 'mine-as-new'): Promise<SaveOutcome | { ok: true }> {
      return lock(async () => {
        if (phase !== 'conflict' || !active) return { ok: false as const, reason: 'error' as const, message: 'No hay conflicto.' };
        if (choice === 'cloud') {
          if (!active.id) return { ok: false as const, reason: 'error' as const, message: 'Sin versión en la nube.' };
          const id = active.id;
          await local.remove(owner).catch(() => undefined);
          try {
            await restoreSlot(id);
          } catch (e) {
            return { ok: false as const, reason: 'error' as const, message: errText(e) };
          }
          setStatus('ready', 'Se cargó la versión de la nube');
          return { ok: true as const };
        }
        adopt({ id: null, title: nextTitle(), revision: 0 }, null);
        const snap = host.capture();
        await writeLocal(snap, false);
        phase = 'ready';
        return upload(snap);
      });
    },

    /** Antes de cerrar sesión: intenta guardar. Si falla, el llamador decide (el progreso queda en el dispositivo). */
    prepareLogout(): Promise<SaveOutcome | null> {
      return lock(async () => {
        const r = await flushActive();
        if (r === null || r.ok) cancelRetry();
        return r;
      });
    },

    /** Solo pruebas: estado interno resumido. */
    _debug: () => ({ owner, confirmedHash, active: active ? { ...active } : null, retryIndex }),
  };
}

export type SaveManager = ReturnType<typeof createSaveManager>;
