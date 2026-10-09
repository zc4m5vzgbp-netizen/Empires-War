import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ConflictError,
  createSaveManager,
  type CloudApi,
  type GameHost,
  type LocalApi,
  type LocalRecord,
  type ManagerView,
  type SlotFull,
} from '../src/persistence/saveManager.ts';

// Dobles de prueba: nube con control de revisiones idéntico a save_empire, almacenamiento local en memoria
// y un "mundo" reducido a un contador. Esto NO sustituye la prueba real contra Supabase (scripts/cloud-e2e.mjs).

function fakeCloud() {
  const rows = new Map<string, SlotFull & { owner: string }>();
  let seq = 0;
  let clock = 0;
  const c = {
    rows,
    offline: false,
    saves: 0,
    /** Usuario autenticado; simula RLS: cada uno solo ve sus filas. */
    user: 'alice',
    async list() {
      if (c.offline) throw new Error('Load failed');
      return [...rows.values()]
        .filter((r) => r.owner === c.user)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ id, title, revision, updatedAt }) => ({ id, title, revision, updatedAt }));
    },
    async fetch(id: string) {
      if (c.offline) throw new Error('Load failed');
      const r = rows.get(id);
      return r && r.owner === c.user ? { ...r } : null;
    },
    async save(id: string | null, expected: number, title: string, data: string) {
      if (c.offline) throw new Error('Load failed');
      const at = `2026-10-09T10:00:${String(++clock).padStart(2, '0')}Z`;
      if (id === null) {
        if (expected !== 0) throw new Error('bad');
        const nid = `slot-${++seq}`;
        rows.set(nid, { id: nid, title, revision: 1, updatedAt: at, data, owner: c.user });
        c.saves++;
        return { id: nid, revision: 1, savedAt: at };
      }
      const r = rows.get(id);
      if (!r || r.owner !== c.user || r.revision !== expected) throw new ConflictError();
      rows.set(id, { ...r, title, revision: r.revision + 1, updatedAt: at, data });
      c.saves++;
      return { id, revision: r.revision + 1, savedAt: at };
    },
    /** Otro dispositivo guarda una versión nueva. */
    otherDevice(id: string, n: number) {
      const r = rows.get(id)!;
      rows.set(id, { ...r, revision: r.revision + 1, data: JSON.stringify({ n }), updatedAt: `2026-10-09T11:00:${String(++clock).padStart(2, '0')}Z` });
    },
  };
  return c satisfies CloudApi & Record<string, unknown>;
}

function fakeLocal() {
  const m = new Map<string, LocalRecord>();
  const l = {
    m,
    async get(owner: string) {
      return m.get(owner) ?? null;
    },
    async put(r: LocalRecord) {
      m.set(r.owner, { ...r });
    },
    async remove(owner: string) {
      m.delete(owner);
    },
  };
  return l satisfies LocalApi & Record<string, unknown>;
}

function fakeHost(start = 0) {
  const h = {
    n: start,
    frozen: false,
    freezeLog: [] as boolean[],
    capture: () => ({ data: JSON.stringify({ n: h.n }), hash: String(h.n) }),
    restore: (data: string) => {
      const v = JSON.parse(data) as { n: number };
      if (typeof v.n !== 'number') throw new Error('inválido');
      h.n = v.n;
      return String(h.n);
    },
    reset: () => {
      h.n = 0;
    },
    isPristine: () => h.n === 0,
    hash: () => String(h.n),
    async freeze<T>(write: () => Promise<T>) {
      h.frozen = true;
      h.freezeLog.push(true);
      try {
        return await write();
      } finally {
        h.frozen = false;
      }
    },
    now: () => '2026-10-09T10:00:00Z',
  };
  return h satisfies GameHost & Record<string, unknown>;
}

function setup(opts: { cloud?: ReturnType<typeof fakeCloud>; local?: ReturnType<typeof fakeLocal>; n?: number } = {}) {
  const cloud = opts.cloud ?? fakeCloud();
  const local = opts.local ?? fakeLocal();
  const host = fakeHost(opts.n ?? 0);
  const timers: { fn: () => void; ms: number }[] = [];
  let last: ManagerView | null = null;
  const mgr = createSaveManager({
    cloud,
    local,
    host,
    onChange: (v) => (last = v),
    setTimer: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length;
    },
    clearTimer: () => {
      timers.length = 0;
    },
  });
  return { cloud, local, host, mgr, timers, view: () => last ?? mgr.view() };
}

const ALICE = { id: 'alice', label: 'alice@x' };
const BOB = { id: 'bob', label: 'bob@x' };

test('login sin imperios: crea el primero y solo confirma tras la respuesta de la nube', async () => {
  const s = setup({ n: 5 });
  await s.mgr.setUser(ALICE);
  assert.equal(s.cloud.rows.size, 1);
  const row = [...s.cloud.rows.values()][0]!;
  assert.equal(row.revision, 1);
  assert.equal(JSON.parse(row.data).n, 5, 'el progreso jugado sin cuenta se conserva');
  assert.equal(s.view().phase, 'ready');
  assert.match(s.view().status, /Guardado en la nube \(revisión 1\)/);
  assert.equal(s.local.m.get('alice')?.synced, true);
  assert.equal(s.local.m.has('guest'), false);
});

test('guardado manual: congela el mundo durante toda la escritura y aumenta la revisión', async () => {
  const s = setup();
  await s.mgr.setUser(ALICE);
  s.host.n = 9;
  let frozenDuringSave = false;
  const orig = s.cloud.save;
  s.cloud.save = async (...a) => {
    frozenDuringSave = s.host.frozen;
    return orig(...a);
  };
  const r = await s.mgr.saveNow();
  assert.deepEqual(r.ok && r.revision, 2);
  assert.equal(frozenDuringSave, true);
  assert.equal(s.host.frozen, false, 'se reanuda al terminar');
});

test('autoguardado: no congela el mundo mientras espera a la red y no sube si no hay cambios', async () => {
  const s = setup();
  await s.mgr.setUser(ALICE);
  s.host.n = 3;
  let frozenDuringUpload = true;
  const orig = s.cloud.save;
  s.cloud.save = async (...a) => {
    frozenDuringUpload = s.host.frozen;
    return orig(...a);
  };
  const r = await s.mgr.autosave();
  assert.equal(r?.ok, true);
  assert.equal(frozenDuringUpload, false);
  const before = s.cloud.saves;
  assert.equal(await s.mgr.autosave(), null);
  assert.equal(s.cloud.saves, before);
});

test('fallo de conexión: guarda en el dispositivo, no anuncia éxito y reintenta hasta lograrlo', async () => {
  const s = setup();
  await s.mgr.setUser(ALICE);
  s.host.n = 7;
  s.cloud.offline = true;
  const r = await s.mgr.saveNow();
  assert.equal(r.ok, false);
  assert.equal(s.view().phase, 'offline');
  assert.doesNotMatch(s.view().status, /Guardado en la nube/);
  assert.equal(s.view().unsynced, true);
  assert.equal(s.local.m.get('alice')?.synced, false);
  assert.equal(JSON.parse(s.local.m.get('alice')!.data).n, 7);
  assert.equal(s.timers.length, 1, 'reintento programado');
  s.cloud.offline = false;
  await s.mgr.retryNow();
  assert.equal(s.view().phase, 'ready');
  assert.equal(s.view().revision, 2);
  assert.equal(s.view().unsynced, false);
  assert.equal(s.local.m.get('alice')?.synced, true);
});

test('arranque sin red la primera vez: initCloud se recupera al volver la conexión', async () => {
  const cloud = fakeCloud();
  cloud.offline = true;
  const s = setup({ cloud });
  await s.mgr.setUser(ALICE);
  assert.equal(s.view().phase, 'offline');
  cloud.offline = false;
  await s.mgr.retryNow();
  assert.equal(s.view().phase, 'ready');
  assert.equal(cloud.rows.size, 1);
});

test('Safari cerrado con cambios sin subir: al volver a abrir se recupera la copia local y se sube', async () => {
  const cloud = fakeCloud();
  const local = fakeLocal();
  const a = setup({ cloud, local });
  await a.mgr.setUser(ALICE);
  a.host.n = 11;
  cloud.offline = true;
  await a.mgr.flushOnHide(); // pasa a segundo plano sin red y Safari se cierra
  cloud.offline = false;
  const b = setup({ cloud, local }); // nueva apertura del juego, mundo recién creado
  await b.mgr.setUser(ALICE);
  assert.equal(b.host.n, 11);
  assert.equal(b.view().phase, 'ready');
  const row = [...cloud.rows.values()][0]!;
  assert.equal(row.revision, 2);
  assert.equal(JSON.parse(row.data).n, 11);
});

test('abrir en otro dispositivo carga el imperio más reciente', async () => {
  const cloud = fakeCloud();
  const a = setup({ cloud });
  await a.mgr.setUser(ALICE);
  a.host.n = 21;
  await a.mgr.saveNow();
  const b = setup({ cloud }); // otro dispositivo, almacenamiento local vacío
  await b.mgr.setUser(ALICE);
  assert.equal(b.host.n, 21);
  assert.equal(b.view().revision, 2);
});

test('conflicto entre dispositivos: no sobrescribe y ofrece elegir', async () => {
  const cloud = fakeCloud();
  const a = setup({ cloud });
  await a.mgr.setUser(ALICE);
  const id = a.view().activeId!;
  cloud.otherDevice(id, 50); // el otro dispositivo guarda revisión 2
  a.host.n = 4;
  const r = await a.mgr.saveNow();
  assert.equal(r.ok, false);
  assert.equal(a.view().phase, 'conflict');
  assert.equal(JSON.parse(cloud.rows.get(id)!.data).n, 50, 'la versión del otro dispositivo sigue intacta');
  assert.equal(await a.mgr.autosave(), null, 'el autoguardado se detiene durante el conflicto');
  // Opción: guardar la mía como imperio nuevo
  const r2 = await a.mgr.resolveConflict('mine-as-new');
  assert.equal(r2.ok, true);
  assert.equal(cloud.rows.size, 2);
  assert.equal(JSON.parse(cloud.rows.get(id)!.data).n, 50);
  assert.notEqual(a.view().activeId, id);
});

test('conflicto: elegir la versión de la nube la carga', async () => {
  const cloud = fakeCloud();
  const a = setup({ cloud });
  await a.mgr.setUser(ALICE);
  const id = a.view().activeId!;
  cloud.otherDevice(id, 50);
  a.host.n = 4;
  await a.mgr.saveNow();
  const r = await a.mgr.resolveConflict('cloud');
  assert.equal(r.ok, true);
  assert.equal(a.host.n, 50);
  assert.equal(a.view().phase, 'ready');
});

test('conflicto detectado al reconectar (otro dispositivo guardó mientras este estaba sin red)', async () => {
  const cloud = fakeCloud();
  const a = setup({ cloud });
  await a.mgr.setUser(ALICE);
  const id = a.view().activeId!;
  cloud.offline = true;
  a.host.n = 8;
  await a.mgr.saveNow();
  cloud.offline = false;
  cloud.otherDevice(id, 70);
  await a.mgr.retryNow();
  assert.equal(a.view().phase, 'conflict');
  assert.equal(JSON.parse(cloud.rows.get(id)!.data).n, 70);
});

test('cambiar de imperio guarda antes el actual; sin red no cambia', async () => {
  const cloud = fakeCloud();
  const a = setup({ cloud });
  await a.mgr.setUser(ALICE);
  const first = a.view().activeId!;
  a.host.n = 2;
  await a.mgr.newEmpire(false);
  assert.equal(a.host.n, 0, 'nuevo desde cero');
  assert.equal(JSON.parse(cloud.rows.get(first)!.data).n, 2, 'el anterior se guardó antes de crear el nuevo');
  const second = a.view().activeId!;
  assert.equal(a.view().activeTitle, 'Imperio 2');
  a.host.n = 6;
  const r = await a.mgr.loadSlot(first);
  assert.equal(r.ok, true);
  assert.equal(a.host.n, 2);
  assert.equal(JSON.parse(cloud.rows.get(second)!.data).n, 6);
  a.host.n = 3;
  cloud.offline = true;
  const r2 = await a.mgr.loadSlot(second);
  assert.equal(r2.ok, false);
  assert.equal(a.host.n, 3, 'no se perdió el progreso actual');
});

test('login con progreso sin cuenta y con imperios existentes: no reemplaza sin confirmar', async () => {
  const cloud = fakeCloud();
  const a = setup({ cloud });
  await a.mgr.setUser(ALICE);
  a.host.n = 30;
  await a.mgr.saveNow();
  const b = setup({ cloud, n: 0 });
  await b.mgr.setUser(null);
  b.host.n = 12; // juega sin cuenta
  await b.mgr.autosave();
  assert.equal(JSON.parse(b.local.m.get('guest')!.data).n, 12, 'el progreso sin cuenta se guarda en el dispositivo');
  await b.mgr.setUser(ALICE);
  assert.equal(b.view().phase, 'choose');
  assert.equal(b.host.n, 12);
  const refused = await b.mgr.loadSlot(a.view().activeId!);
  assert.equal(refused.ok, false);
  assert.equal(b.host.n, 12);
  const r = await b.mgr.newEmpire(true);
  assert.equal(r.ok, true);
  assert.equal(cloud.rows.size, 2);
  assert.equal(b.local.m.has('guest'), false);
});

test('sin sesión: el progreso se recupera tras cerrar el navegador (solo en el dispositivo)', async () => {
  const local = fakeLocal();
  const a = setup({ local });
  await a.mgr.setUser(null);
  a.host.n = 14;
  await a.mgr.flushOnHide();
  const b = setup({ local });
  await b.mgr.setUser(null);
  assert.equal(b.host.n, 14);
  assert.equal(b.view().phase, 'guest');
});

test('cerrar sesión o cambiar de cuenta no mezcla imperios entre usuarios', async () => {
  const cloud = fakeCloud();
  const local = fakeLocal();
  const a = setup({ cloud, local });
  await a.mgr.setUser(ALICE);
  a.host.n = 40;
  const pre = await a.mgr.prepareLogout();
  assert.equal(pre?.ok, true);
  await a.mgr.setUser(null);
  assert.equal(a.host.n, 0, 'tras cerrar sesión el mundo vuelve a empezar');
  cloud.user = 'bob';
  await a.mgr.setUser(BOB);
  const bobRow = [...cloud.rows.values()].find((r) => r.owner === 'bob');
  assert.ok(bobRow);
  assert.equal(JSON.parse(bobRow.data).n, 0, 'Bob no recibe el imperio de Alice');
  // Cambio directo de cuenta sin cerrar sesión
  a.host.n = 9;
  cloud.user = 'alice';
  await a.mgr.setUser(ALICE);
  assert.equal(a.host.n, 40, 'Alice recupera su imperio');
  assert.equal(JSON.parse(local.m.get('bob')!.data).n, 9, 'el progreso de Bob queda en su copia local');
});

test('reintentos con espera creciente', async () => {
  const cloud = fakeCloud();
  cloud.offline = true;
  const s = setup({ cloud });
  await s.mgr.setUser(ALICE);
  const delays: number[] = [];
  for (let i = 0; i < 6; i++) {
    delays.push(s.timers.at(-1)!.ms);
    await s.mgr.retryNow();
  }
  assert.deepEqual(delays, [5000, 15000, 30000, 60000, 120000, 120000]);
});
