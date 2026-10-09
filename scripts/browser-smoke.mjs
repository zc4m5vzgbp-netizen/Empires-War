// Prueba en navegador real del Bloque 1: ciclo económico completo.
// Móvil (Chromium y WebKit con perfil iPhone 15 Pro Max, toques reales) y escritorio (Chromium con ratón).
// Uso: SMOKE_URL=http://localhost:4173/Empires-War/ node scripts/browser-smoke.mjs
import { chromium, devices, webkit } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/';
const URL = `${BASE}?test=1`;
const phone = devices['iPhone 15 Pro Max'] ?? { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, timeoutMs, what) {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - start > timeoutMs) throw new Error(`Tiempo agotado esperando: ${what}`);
    await sleep(150);
  }
}

async function readStockpileUi(page) {
  const out = {};
  for (const r of ['food', 'wood', 'gold', 'stone']) out[r] = Number(await page.locator(`.res-${r} .res-value`).textContent());
  return out;
}

async function open(page) {
  const started = Date.now();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('#game canvas', { timeout: 15000 });
  await page.waitForFunction(() => Number(document.querySelector('.stats dd')?.textContent) > 0 && window.__EW_TEST__, null, { timeout: 20000 });
  return Date.now() - started;
}

/** Arrastre táctil con eventos Pointer de tipo «touch» (Playwright no tiene arrastre táctil nativo). */
async function touchDrag(page, from, to) {
  await page.evaluate(([a, b]) => {
    const el = document.getElementById('game');
    const base = { pointerId: 77, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...base, clientX: a.x, clientY: a.y, button: 0 }));
    for (let i = 1; i <= 10; i++) {
      el.dispatchEvent(new PointerEvent('pointermove', { ...base, clientX: a.x + ((b.x - a.x) * i) / 10, clientY: a.y + ((b.y - a.y) * i) / 10 }));
    }
    el.dispatchEvent(new PointerEvent('pointerup', { ...base, clientX: b.x, clientY: b.y, button: 0 }));
  }, [from, to]);
}

async function screenOfTile(page, x, y, lift = 0) {
  await T(page, 'centerOnTile', x, y);
  await sleep(120);
  const p = await T(page, 'tileToScreen', x, y);
  return { x: p.x, y: p.y - lift };
}

const villagers = (w) => Object.values(w.entities).filter((e) => e.kind === 'villager');
const bushes = (w) => Object.values(w.entities).filter((e) => e.kind === 'resource');
const mills = (w) => Object.values(w.entities).filter((e) => e.kind === 'building' && e.type === 'mill');

async function mobileFlow(browserType, name) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ ...phone });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  const r = { flow: `móvil ${name}`, steps: [] };
  const step = (s) => r.steps.push(s);
  try {
    r.bootMs = await open(page);
    await sleep(1500);
    r.fps = Number((await page.locator('.stats dd').allTextContents())[0]);
    r.objectsStart = await T(page, 'objectCount');
    const ui0 = await readStockpileUi(page);
    if (ui0.food !== 200 || ui0.wood !== 200) throw new Error(`reserva inicial inesperada ${JSON.stringify(ui0)}`);
    step('reserva inicial 200/200/100/200');

    // Bloque 0: el arrastre táctil mueve la cámara y el botón + acerca.
    const shotA = await page.screenshot();
    await touchDrag(page, { x: 200, y: 450 }, { x: 290, y: 360 });
    await sleep(250);
    if (shotA.equals(await page.screenshot())) throw new Error('el arrastre táctil no movió la cámara');
    const z0 = Number((await page.locator('.stats dd').allTextContents())[3]);
    await page.getByRole('button', { name: 'Acercar' }).tap();
    await waitFor(async () => Number((await page.locator('.stats dd').allTextContents())[3]) > z0, 3000, 'zoom con +');
    step('arrastre táctil y zoom +');

    // 1. Seleccionar un aldeano con un toque.
    let w = await T(page, 'world');
    const v = villagers(w)[2];
    let p = await screenOfTile(page, v.x, v.y, 16);
    await page.touchscreen.tap(p.x, p.y);
    await waitFor(async () => (await T(page, 'selection')).includes(v.id), 3000, 'selección del aldeano');
    await page.getByText(`Aldeano #${v.id}`).waitFor({ timeout: 3000 });
    step(`aldeano #${v.id} seleccionado con un toque`);

    // 2. Tocar un arbusto: orden de recolectar.
    const bush = bushes(w)[0];
    p = await screenOfTile(page, bush.x, bush.y, 6);
    await page.touchscreen.tap(p.x, p.y);
    await waitFor(async () => (await T(page, 'world')).entities[v.id].task.type === 'gather', 3000, 'orden de recolectar');
    step('orden de recolectar bayas');

    // 3. La comida sube solo al depositar.
    await T(page, 'setTimeScale', 10);
    let sawCarryWithoutGain = false;
    await waitFor(async () => {
      const s = await T(page, 'world');
      const ve = s.entities[v.id];
      if (ve.carryAmount > 0 && s.players['1'].stockpile.food === 200) sawCarryWithoutGain = true;
      return s.players['1'].stockpile.food > 200;
    }, 40000, 'depósito de comida');
    w = await T(page, 'world');
    if (!sawCarryWithoutGain) throw new Error('no se observó carga antes del depósito');
    if (w.players['1'].stockpile.food !== 210) throw new Error(`comida esperada 210, hay ${w.players['1'].stockpile.food}`);
    // La interfaz se refresca cada 0,1 s: se espera a que muestre el nuevo valor.
    await waitFor(async () => (await readStockpileUi(page)).food >= 210, 3000, 'contador de comida en pantalla');
    step('la reserva solo sube al depositar (+10 comida)');
    await T(page, 'setTimeScale', 1);

    // 4. Construir un Molino: botón, vista previa, confirmar.
    p = await screenOfTile(page, w.entities[v.id].x, w.entities[v.id].y, 16);
    await page.touchscreen.tap(p.x, p.y);
    await waitFor(async () => (await T(page, 'selection')).includes(v.id), 3000, 'reselección');
    await page.getByRole('button', { name: /Construir Molino/ }).tap();
    const spot = await T(page, 'findPlacement', 27, 18);
    p = await screenOfTile(page, spot.x, spot.y);
    await page.touchscreen.tap(p.x, p.y);
    const confirm = page.getByRole('button', { name: 'Confirmar' });
    await waitFor(async () => !(await confirm.isDisabled()), 3000, 'vista previa válida');
    await confirm.tap();
    await waitFor(async () => mills(await T(page, 'world')).length === 1, 3000, 'cimiento del Molino');
    w = await T(page, 'world');
    if (w.players['1'].stockpile.wood !== 100) throw new Error(`madera esperada 100, hay ${w.players['1'].stockpile.wood}`);
    step('Molino colocado y pagado de la reserva (madera 200 → 100)');
    await T(page, 'setTimeScale', 10);
    const t0 = Date.now();
    const millTick0 = (await T(page, 'world')).tick;
    try {
      await waitFor(async () => mills(await T(page, 'world'))[0]?.complete, 60000, 'Molino terminado');
    } catch (e) {
      const s = await T(page, 'world');
      const m = mills(s)[0];
      const ve = s.entities[v.id];
      const fps = (await page.locator('.stats dd').allTextContents())[0];
      throw new Error(`${e.message} · ticks ${s.tick - millTick0} en ${Date.now() - t0} ms · FPS ${fps} · Molino ${JSON.stringify(m)} · aldeano ${JSON.stringify({ x: ve.x, y: ve.y, task: ve.task, path: ve.path.length })}`);
    }
    r.millBuildTicksPerSecond = Math.round((((await T(page, 'world')).tick - millTick0) * 1000) / (Date.now() - t0));
    await T(page, 'setTimeScale', 1);
    step('Molino construido por el aldeano');

    // 5. Guardar.
    await page.getByRole('button', { name: 'Partida' }).tap();
    await page.getByRole('button', { name: 'Guardar' }).tap();
    await page.getByText('Partida guardada.').waitFor({ timeout: 8000 });
    const savedHash = await T(page, 'lastSavedHash');
    if (!savedHash) throw new Error('no se registró la huella del guardado');
    if (await T(page, 'paused')) throw new Error('el juego quedó en pausa tras guardar');
    step('partida guardada; el juego sigue en marcha');

    // 6. Cargar en la misma sesión: el estado vuelve exactamente al guardado.
    await sleep(600);
    if ((await T(page, 'hash')) === savedHash) throw new Error('el mundo no avanzó tras guardar');
    await page.getByRole('button', { name: 'Cargar' }).tap();
    await page.getByText(/Partida cargada/).waitFor({ timeout: 8000 });
    if ((await T(page, 'lastLoadedHash')) !== savedHash) throw new Error('la carga no restauró el estado guardado');
    step('carga en la misma sesión: huella idéntica');

    // 7. Recargar la página y cargar: persiste en IndexedDB.
    await open(page);
    w = await T(page, 'world');
    if (mills(w).length !== 0) throw new Error('la página recargada debería empezar sin Molino');
    await page.getByRole('button', { name: 'Partida' }).tap();
    await page.getByRole('button', { name: 'Cargar' }).tap();
    await page.getByText(/Partida cargada/).waitFor({ timeout: 8000 });
    if ((await T(page, 'lastLoadedHash')) !== savedHash) throw new Error('tras recargar, la partida no coincide');
    w = await T(page, 'world');
    if (mills(w).length !== 1 || !mills(w)[0].complete || w.players['1'].stockpile.wood !== 100) throw new Error('estado cargado incompleto');
    await waitFor(async () => {
      const ui2 = await readStockpileUi(page);
      return ui2.wood === 100 && ui2.food >= 210;
    }, 3000, 'reserva cargada en pantalla');
    step('recarga de la página + Cargar: Molino, madera y comida restaurados (IndexedDB)');

    // 8. Guardar con el juego en pausa: sigue en pausa.
    await page.getByRole('button', { name: 'Pausar' }).tap();
    const tick0 = (await T(page, 'world')).tick;
    await page.getByRole('button', { name: 'Guardar' }).tap();
    await page.getByText('Partida guardada.').waitFor({ timeout: 8000 });
    await sleep(600);
    if (!(await T(page, 'paused')) || (await T(page, 'world')).tick !== tick0) throw new Error('guardar quitó la pausa');
    await page.getByRole('button', { name: 'Reanudar' }).tap();
    await waitFor(async () => (await T(page, 'world')).tick > tick0, 3000, 'reanudar');
    step('guardar en pausa conserva la pausa');

    // FPS en reposo al final del ciclo (sin capturas ni consultas durante la medición).
    await sleep(2500);
    r.fpsAfter = Number((await page.locator('.stats dd').allTextContents())[0]);
    await sleep(5000);
    r.fpsAfter2 = Number((await page.locator('.stats dd').allTextContents())[0]);
    // Tras el ciclo hay exactamente un objeto más (el Molino) y un arbusto menos o igual: no debe crecer sin control.
    r.objectsEnd = await T(page, 'objectCount');

    r.errors = errors;
    r.ok = errors.length === 0;
  } catch (e) {
    r.errors = [...errors, `prueba: ${e.message}`];
    r.ok = false;
    try {
      r.screenshot = 'smoke-fallo-' + name + '.png';
      await page.screenshot({ path: r.screenshot });
    } catch {}
  }
  await browser.close();
  return r;
}

async function desktopFlow() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`));
  const r = { flow: 'escritorio chromium', steps: [] };
  const step = (s) => r.steps.push(s);
  try {
    r.bootMs = await open(page);
    await sleep(1000);
    r.fps = Number((await page.locator('.stats dd').allTextContents())[0]);
    let w = await T(page, 'world');
    const vs = villagers(w);

    // Recuadro con el botón izquierdo alrededor de los tres aldeanos.
    await T(page, 'centerOnTile', 23, 26);
    await sleep(120);
    const pts = [];
    for (const v of vs) pts.push(await T(page, 'tileToScreen', v.x, v.y));
    const minX = Math.min(...pts.map((p) => p.x)) - 40;
    const maxX = Math.max(...pts.map((p) => p.x)) + 40;
    const minY = Math.min(...pts.map((p) => p.y)) - 60;
    const maxY = Math.max(...pts.map((p) => p.y)) + 20;
    await page.mouse.move(minX, minY);
    await page.mouse.down();
    await page.mouse.move(maxX, maxY, { steps: 12 });
    await page.mouse.up();
    const sel = await T(page, 'selection');
    if (sel.length !== 3) throw new Error(`el recuadro seleccionó ${sel.length} aldeanos`);
    step('recuadro con el ratón: 3 aldeanos');

    // Clic derecho en el suelo: los tres se mueven, a casillas distintas.
    const ground = await screenOfTile(page, 18, 27);
    await page.mouse.click(ground.x, ground.y, { button: 'right' });
    await waitFor(async () => villagers(await T(page, 'world')).every((v) => v.task.type === 'move'), 3000, 'orden de mover');
    await T(page, 'setTimeScale', 10);
    await waitFor(async () => villagers(await T(page, 'world')).every((v) => v.task.type === 'idle'), 20000, 'llegada');
    await T(page, 'setTimeScale', 1);
    w = await T(page, 'world');
    if (new Set(villagers(w).map((v) => `${v.x},${v.y}`)).size !== 3) throw new Error('los aldeanos acabaron en la misma casilla');
    step('clic derecho: movimiento en grupo con destinos distintos');

    // Arrastre con el botón derecho: mueve la cámara.
    const shotA = await page.screenshot();
    await page.mouse.move(640, 400);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(540, 330, { steps: 10 });
    await page.mouse.up({ button: 'right' });
    await sleep(200);
    if (shotA.equals(await page.screenshot())) throw new Error('el arrastre derecho no movió la cámara');
    step('arrastre derecho mueve la cámara');

    // Clic izquierdo en un aldeano + clic derecho en un arbusto.
    const v = villagers(w)[0];
    let p = await screenOfTile(page, v.x, v.y, 16);
    await page.mouse.click(p.x, p.y);
    if ((await T(page, 'selection')).join() !== String(v.id)) throw new Error('el clic no seleccionó un aldeano');
    const bush = bushes(w)[1];
    p = await screenOfTile(page, bush.x, bush.y, 6);
    await page.mouse.click(p.x, p.y, { button: 'right' });
    await waitFor(async () => (await T(page, 'world')).entities[v.id].task.type === 'gather', 3000, 'recolectar con clic derecho');
    step('clic izquierdo selecciona; clic derecho en bayas = recolectar');

    // Construir con ratón: botón, mover la vista previa y clic.
    await page.getByRole('button', { name: /Construir Molino/ }).click();
    const spot = await T(page, 'findPlacement', 18, 22);
    p = await screenOfTile(page, spot.x, spot.y);
    await page.mouse.move(p.x, p.y);
    await page.mouse.click(p.x, p.y);
    await waitFor(async () => mills(await T(page, 'world')).length === 1, 3000, 'Molino con ratón');
    if ((await T(page, 'world')).players['1'].stockpile.wood !== 100) throw new Error('no se cobró el Molino');
    step('Molino colocado con el ratón');

    // Clic en suelo vacío: quita la selección y describe la casilla.
    p = await screenOfTile(page, 16, 30);
    await page.mouse.click(p.x, p.y);
    if ((await T(page, 'selection')).length !== 0) throw new Error('el clic en el suelo no quitó la selección');
    await page.getByText(/Casilla 16, 30/).waitFor({ timeout: 3000 });
    step('clic en el suelo: quita la selección e inspecciona la casilla');

    r.errors = errors;
    r.ok = errors.length === 0;
  } catch (e) {
    r.errors = [...errors, `prueba: ${e.message}`];
    r.ok = false;
    try {
      await page.screenshot({ path: 'smoke-fallo-escritorio.png' });
    } catch {}
  }
  await browser.close();
  return r;
}

const results = [await mobileFlow(chromium, 'chromium'), await mobileFlow(webkit, 'webkit'), await desktopFlow()];
for (const r of results) {
  console.log(JSON.stringify(r));
  const summary = `${r.ok ? 'OK' : 'FALLO'} · arranque ${r.bootMs} ms · FPS inicio ${r.fps} · FPS final ${r.fpsAfter ?? '-'} y ${r.fpsAfter2 ?? '-'} · objetos ${r.objectsStart ?? '-'}→${r.objectsEnd ?? '-'} · ticks/s a x10 ${r.millBuildTicksPerSecond ?? '-'} · pasos: ${r.steps.join(' | ')} · errores: ${r.errors.length ? r.errors.join(' | ') : 0}`;
  console.log(`::${r.ok ? 'notice' : 'error'} title=Navegador ${r.flow}::${summary.replace(/\n/g, ' ').slice(0, 3000)}`);
}
if (!results.every((r) => r.ok)) process.exit(1);
