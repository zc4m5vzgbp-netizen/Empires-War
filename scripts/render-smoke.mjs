// Prueba de navegador del render (rama feat/claude-render-performance), perfil iPhone 15 Pro Max en Chromium y WebKit:
//  1. Selección por toque entre edificios solapados (DEF-PICK-01) con toques reales y captura del área interactiva.
//  2. Suelo por bloques en un mapa de 224×224: memoria acotada al desplazar la cámara y con el zoom mínimo.
//  3. Pérdida y recuperación del contexto WebGL (iOS en segundo plano): el suelo se repinta sin errores.
// No es un iPhone físico. Uso: SMOKE_URL=http://localhost:4173/Empires-War/ node scripts/render-smoke.mjs
import { mkdirSync } from 'node:fs';
import { chromium, devices, webkit } from 'playwright';

const BASE = `${process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/'}?test=1`;
const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('render-smoke', { recursive: true });

async function open(page, extra) {
  await page.goto(`${BASE}${extra}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__EW_TEST__ && Number(document.querySelector('.stats dd')?.textContent) > 0, null, { timeout: 60000 });
  await T(page, 'setTimeScale', 0);
}

async function tapAt(page, tile, lift) {
  await T(page, 'centerOnTile', tile[0], tile[1]);
  await sleep(150);
  const p = await T(page, 'tileToScreen', tile[0], tile[1]);
  await page.touchscreen.tap(p.x, p.y - lift);
  await sleep(250);
  return T(page, 'selection');
}

async function flow(type, name) {
  const browser = await type.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 15 Pro Max'] })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const steps = [];
  try {
    // 1. Selección entre edificios solapados.
    await open(page, '&areas=1');
    await T(page, 'setZoom', 1.2);
    // Un segundo Centro Urbano lejos de los aldeanos (que tienen prioridad al tocar), con un campamento justo delante:
    // la misma disposición que reproducía DEF-PICK-01 en la prueba unitaria (CU en x,y; campamento en x+4,y+4).
    const zoom = 1.2;
    const tc = { x: 29, y: 29 };
    tc.id = await T(page, 'debugAddBuilding', 'townCenter', tc.x, tc.y);
    const camp = await T(page, 'debugAddBuilding', 'lumberCamp', tc.x + 4, tc.y + 4);
    const mine = await T(page, 'debugAddBuilding', 'miningCamp', tc.x - 3, tc.y + 1); // a la izquierda, delante
    let sel = await tapAt(page, [tc.x + 4.5, tc.y + 4.5], 40 * zoom); // tejado del campamento, dibujado sobre el CU
    if (!sel.includes(camp)) throw new Error(`tejado del campamento → seleccionado ${JSON.stringify(sel)} (esperado #${camp})`);
    steps.push('tejado del campamento delante del CU → campamento');
    await page.getByRole('button', { name: 'Quitar selección' }).tap().catch(() => {});
    sel = await tapAt(page, [tc.x + 1.5, tc.y + 1.5], 90 * zoom); // parte alta del CU, que no tapa nada
    if (!sel.includes(tc.id)) throw new Error(`parte alta del CU → seleccionado ${JSON.stringify(sel)} (esperado #${tc.id})`);
    steps.push('parte alta del CU → CU');
    await page.getByRole('button', { name: 'Quitar selección' }).tap().catch(() => {});
    sel = await tapAt(page, [tc.x - 2.5, tc.y + 1.5], 20 * zoom);
    if (!sel.includes(mine)) throw new Error(`campamento minero → seleccionado ${JSON.stringify(sel)} (esperado #${mine})`);
    steps.push('campamento minero → campamento minero');
    await page.getByRole('button', { name: 'Quitar selección' }).tap().catch(() => {});
    await T(page, 'centerOnTile', tc.x + 1.5, tc.y + 2.5);
    await sleep(300);
    await page.screenshot({ path: `render-smoke/${name}-areas-interactivas.png` });

    // 2. Mapa de 224×224: memoria del suelo acotada.
    await open(page, '&mapa=224');
    const s0 = await T(page, 'renderStats');
    let worst = s0.terrain.chunkTextureMB;
    for (let i = 0; i <= 10; i++) {
      await T(page, 'centerOnTile', 10 + i * 20, 112);
      await sleep(200);
      worst = Math.max(worst, (await T(page, 'renderStats')).terrain.chunkTextureMB);
    }
    await T(page, 'setZoom', 0.35);
    for (let i = 0; i <= 5; i++) {
      await T(page, 'centerOnTile', 30 + i * 30, 30 + i * 30);
      await sleep(400);
      worst = Math.max(worst, (await T(page, 'renderStats')).terrain.chunkTextureMB);
    }
    const s1 = await T(page, 'renderStats');
    if (s1.terrain.level !== 1) throw new Error(`a zoom 0,35 el suelo debería ir a media resolución: ${JSON.stringify(s1.terrain)}`);
    if (worst > 64) throw new Error(`memoria del suelo ${worst} MB > 64 MB`);
    steps.push(`224×224: suelo ≤ ${worst} MB (de ${s0.terrain.chunks} bloques, activos ${s1.terrain.activeChunks}); árboles mostrados ${s1.terrain.treesShown}/${s1.terrain.treesTotal}`);
    await page.screenshot({ path: `render-smoke/${name}-224-zoom-minimo.png` });

    // 3. Pérdida del contexto WebGL.
    await T(page, 'setZoom', 0.8);
    await sleep(600);
    const before = (await T(page, 'renderStats')).terrain.paintedTotal;
    const lost = await T(page, 'loseWebGL');
    if (lost) {
      await sleep(500);
      const after = (await T(page, 'renderStats')).terrain.paintedTotal;
      if (after <= before) throw new Error(`tras recuperar WebGL no se repintó el suelo (${before} → ${after})`);
      steps.push(`WebGL perdido y recuperado: ${after - before} bloques repintados`);
      await page.screenshot({ path: `render-smoke/${name}-tras-webgl.png` });
    } else steps.push('WebGL: la extensión WEBGL_lose_context no está disponible (sin probar)');
    if (errors.length) throw new Error(`errores: ${errors.join(' | ')}`);
    return { name, ok: true, steps };
  } catch (e) {
    await page.screenshot({ path: `render-smoke/${name}-fallo.png` }).catch(() => {});
    return { name, ok: false, steps, error: String(e.message ?? e) };
  } finally {
    await browser.close();
  }
}

const results = [await flow(chromium, 'chromium'), await flow(webkit, 'webkit')];
for (const r of results) console.log(`::notice title=Render ${r.name}::${r.ok ? 'OK' : 'FALLO: ' + r.error} · ${r.steps.join(' | ')}`);
if (results.some((r) => !r.ok)) process.exit(1);
