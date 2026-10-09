// Prueba REAL del guardado en la nube contra Supabase (no usa dobles): sesiones reales, guardados reales.
// La lanza .github/workflows/cloud-e2e.yml con dos usuarios de prueba temporales (se borran después).
// Uso: E2E_URL=http://localhost:4173/Empires-War/ E2E_EMAIL_A=… E2E_PASS_A=… E2E_EMAIL_B=… E2E_PASS_B=… node scripts/cloud-e2e.mjs
import { writeFileSync } from 'node:fs';
import { chromium, devices, webkit } from 'playwright';

const BASE = process.env.E2E_URL ?? 'http://localhost:4173/Empires-War/';
const URL = `${BASE}?test=1`;
const A = { email: process.env.E2E_EMAIL_A, pass: process.env.E2E_PASS_A };
const B = { email: process.env.E2E_EMAIL_B, pass: process.env.E2E_PASS_B };
if (!A.email || !A.pass || !B.email || !B.pass) {
  console.error('Faltan credenciales de prueba (E2E_EMAIL_A/E2E_PASS_A/E2E_EMAIL_B/E2E_PASS_B).');
  process.exit(2);
}
const phone = devices['iPhone 15 Pro Max'];

const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const C = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__.cloud[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, timeoutMs, what) {
  const start = Date.now();
  let last;
  for (;;) {
    last = await check();
    if (last) return last;
    if (Date.now() - start > timeoutMs) throw new Error(`tiempo agotado esperando: ${what}`);
    await sleep(250);
  }
}

const results = { steps: [], ids: {}, ok: false };
const step = (text, data) => {
  results.steps.push(data ? `${text} · ${JSON.stringify(data)}` : text);
  console.log(`✔ ${text}${data ? ' ' + JSON.stringify(data) : ''}`);
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function openGame(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(URL, { waitUntil: 'load' });
  await waitFor(() => page.evaluate(() => Boolean(window.__EW_TEST__)), 20000, 'juego cargado');
  page.errors = errors;
  return page;
}
const view = (page) => C(page, 'view');
async function ready(page, what) {
  try {
    return await waitFor(async () => {
      const v = await view(page);
      return v.phase === 'ready' && !v.busy ? v : null;
    }, 30000, what);
  } catch (e) {
    const v = await view(page).catch(() => null);
    throw new Error(`${e.message} · estado: ${v ? `${v.phase} «${v.status}»` : '?'} · errores: ${page.errors.join(' | ')}`);
  }
}

/** Avanza el mundo de verdad y lo deja en pausa para comparar huellas sin que cambie. */
async function playABit(page, ms = 1500) {
  await T(page, 'setPaused', false);
  await T(page, 'setTimeScale', 10);
  await sleep(ms);
  await T(page, 'setTimeScale', 1);
  await T(page, 'setPaused', true);
  return T(page, 'hash');
}

const browsers = [];
try {
  const wk = await webkit.launch();
  const cr = await chromium.launch();
  browsers.push(wk, cr);

  // 1. Dispositivo 1 (WebKit, perfil iPhone): iniciar sesión real → se crea el primer imperio en Supabase.
  const ctxA = await wk.newContext({ ...phone });
  const a = await openGame(ctxA);
  await C(a, 'signIn', A.email, A.pass);
  let v = await ready(a, 'primer imperio creado en la nube');
  expect(v.user === A.email, `usuario inesperado ${v.user}`);
  expect(v.activeId && v.revision === 1, `se esperaba revisión 1, hay ${v.revision}`);
  const id1 = v.activeId;
  results.ids.A1 = id1;
  step('1. sesión real iniciada y primer imperio creado en Supabase', { revision: v.revision, title: v.activeTitle });

  // 2-5. Modificar el mundo, guardar, confirmar revisión y estado almacenado.
  const hash2 = await playABit(a);
  let r = await C(a, 'saveNow');
  expect(r.ok && r.revision === 2, `guardado manual falló: ${JSON.stringify(r)}`);
  let row = await C(a, 'fetchSlot', id1);
  expect(row.revision === 2 && row.hash === hash2, `la nube no tiene el estado guardado: ${JSON.stringify(row)} vs ${hash2}`);
  expect((await T(a, 'paused')) === true, 'regla §3.8: estaba en pausa al guardar y debía seguir en pausa');
  step('2-5. mundo modificado, guardado y confirmado en la nube (misma huella)', { revision: row.revision, hash: row.hash });

  // 6-8. Recargar el navegador (mismo dispositivo) y comparar el estado restaurado.
  await a.reload({ waitUntil: 'load' });
  await waitFor(() => a.evaluate(() => Boolean(window.__EW_TEST__)), 20000, 'juego tras recargar');
  v = await ready(a, 'imperio restaurado tras recargar');
  await T(a, 'setPaused', true);
  expect(v.activeId === id1 && v.revision === 2, `tras recargar: ${JSON.stringify(v)}`);
  // El reloj puede avanzar algún tick antes de pausar; se compara el guardado restaurado.
  expect((await T(a, 'lastLoadedHash')) === hash2, 'el estado restaurado no coincide con el guardado');
  step('6-8. recarga: sesión conservada y estado restaurado idéntico', { revision: v.revision });

  // 9. Otro dispositivo (contexto nuevo, sin datos locales) con la misma cuenta: carga desde la nube.
  const ctxC = await wk.newContext({ ...phone });
  const c = await openGame(ctxC);
  await C(c, 'signIn', A.email, A.pass);
  v = await ready(c, 'otro dispositivo conectado');
  await T(c, 'setPaused', true);
  expect(v.activeId === id1 && v.revision === 2, `otro dispositivo: ${JSON.stringify(v)}`);
  expect((await T(c, 'lastLoadedHash')) === hash2, 'otro dispositivo no recibió el mismo estado');
  step('9. otro dispositivo sin datos locales recupera el mismo imperio desde la nube');

  // Fallo de conexión real (sin red): no se anuncia guardado; al volver la red se sube.
  await ctxA.setOffline(true);
  const hash3 = await playABit(a, 800);
  r = await C(a, 'saveNow');
  v = await view(a);
  expect(!r.ok && v.phase === 'offline' && v.unsynced, `sin red debía fallar sin confirmar: ${JSON.stringify(r)} ${v.phase}`);
  expect(!v.status.includes('Guardado en la nube'), 'anunció guardado en la nube sin red');
  await ctxA.setOffline(false);
  await C(a, 'retryNow');
  v = await ready(a, 'reintento tras volver la red');
  row = await C(a, 'fetchSlot', id1);
  expect(row.revision === 3 && row.hash === hash3, `tras reconectar: ${JSON.stringify(row)}`);
  step('fallo de red: no confirma; al volver la conexión sube la copia del dispositivo', { revision: row.revision });

  // Autoguardado verificable: avanza el mundo y el autoguardado sube una revisión nueva.
  const hash4 = await playABit(a, 600);
  r = await C(a, 'autosave');
  expect(r && r.ok && r.revision === 4, `autoguardado: ${JSON.stringify(r)}`);
  row = await C(a, 'fetchSlot', id1);
  expect(row.hash === hash4, 'el autoguardado no subió el estado actual');
  step('autoguardado: sube una revisión nueva con el estado actual', { revision: row.revision });

  // Conflicto: el otro dispositivo sigue en la revisión 2 e intenta guardar → no sobrescribe.
  await playABit(c, 500);
  r = await C(c, 'saveNow');
  v = await view(c);
  expect(!r.ok && r.reason === 'conflict' && v.phase === 'conflict', `se esperaba conflicto: ${JSON.stringify(r)}`);
  row = await C(c, 'fetchSlot', id1);
  expect(row.revision === 4 && row.hash === hash4, 'el conflicto sobrescribió la nube');
  r = await C(c, 'resolveConflict', 'mine-as-new');
  expect(r.ok, `resolver conflicto: ${JSON.stringify(r)}`);
  v = await view(c);
  expect(v.activeId !== id1 && v.slots.length === 2, `imperio nuevo tras conflicto: ${JSON.stringify(v)}`);
  results.ids.A2 = v.activeId;
  step('conflicto entre dispositivos: no sobrescribe; la versión local se guarda como imperio nuevo', { imperios: v.slots.length });

  // Varios imperios: cambiar entre ellos guarda y restaura cada uno.
  r = await C(c, 'loadSlot', id1);
  expect(r.ok, `cambiar de imperio: ${JSON.stringify(r)}`);
  await T(c, 'setPaused', true);
  expect((await T(c, 'lastLoadedHash')) === hash4, 'al cambiar de imperio no se cargó el estado correcto');
  step('varios imperios: cambio entre imperios correcto');

  // 10. Aislamiento: otra cuenta no puede leer ni escribir partidas ajenas.
  const ctxB = await cr.newContext({ viewport: { width: 1280, height: 800 } });
  const b = await openGame(ctxB);
  await C(b, 'signIn', B.email, B.pass);
  v = await ready(b, 'cuenta B conectada');
  expect(!v.slots.some((s) => s.id === id1 || s.id === results.ids.A2), 'la cuenta B ve imperios de A');
  results.ids.B1 = v.activeId;
  const readOther = await C(b, 'readOther', id1);
  expect(readOther.rows === 0, `B pudo leer el imperio de A: ${JSON.stringify(readOther)}`);
  const fetchOther = await C(b, 'fetchSlot', id1);
  expect(fetchOther === null, 'B pudo descargar el imperio de A');
  const writeOther = await C(b, 'writeOther', id1, 4);
  expect(!writeOther.ok, `B pudo escribir en el imperio de A: ${JSON.stringify(writeOther)}`);
  const directOther = await C(b, 'directUpdate', id1);
  expect(directOther.rows === 0, `B pudo modificar directamente el imperio de A: ${JSON.stringify(directOther)}`);
  row = await C(a, 'fetchSlot', id1);
  expect(row.revision === 4 && row.hash === hash4 && row.title !== 'intruso', 'el imperio de A cambió tras los intentos de B');
  step('10. aislamiento: B no ve, no lee y no modifica partidas de A', { writeOther: writeOther.code ?? writeOther.error });

  // Seguridad: ¿el dueño puede saltarse save_empire con una escritura directa? (debe estar bloqueado tras endurecer permisos)
  const directOwn = await C(a, 'directUpdate', id1);
  results.directWriteBlocked = directOwn.rows === 0;
  step('escritura directa del propio dueño (sin control de revisión)', { bloqueada: results.directWriteBlocked, detalle: directOwn.code ?? directOwn.error });

  // Cierre de sesión: el mundo no queda asociado a la cuenta.
  await C(a, 'signOut');
  await waitFor(async () => (await view(a)).phase === 'guest', 15000, 'sesión cerrada');
  step('cierre de sesión correcto');

  const pageErrors = [...a.errors, ...b.errors, ...c.errors];
  expect(pageErrors.length === 0, `errores de página: ${pageErrors.join(' | ')}`);
  results.ok = true;
} catch (e) {
  results.error = e.message;
  console.error(`✘ ${e.message}`);
} finally {
  for (const br of browsers) await br.close().catch(() => {});
  writeFileSync('cloud-e2e-result.json', JSON.stringify(results, null, 2));
}
process.exit(results.ok ? 0 : 1);
