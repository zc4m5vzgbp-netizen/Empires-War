// Rendimiento gráfico por tamaño de mapa (rama feat/claude-render-performance).
// Mide en navegadores headless de CI: arranque, memoria reservada por las texturas del suelo, objetos en escena,
// FPS en reposo, FPS desplazando la cámara y FPS con el zoom mínimo. **No es un iPhone físico.**
// Uso: SMOKE_URL=http://localhost:4173/Empires-War/ node scripts/perf-render.mjs [tamaños] [ejecuciones]
import { chromium, devices, webkit } from 'playwright';

const BASE = `${process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/'}?test=1`;
const SIZES = (process.argv[2] ?? '48,160,224,320,480').split(',').map(Number);
const RUNS = Number(process.argv[3] ?? 3);
const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : NaN);

/** FPS por requestAnimationFrame durante `ms`; `onFrame` mueve la cámara en cada fotograma si se indica. */
const rafFps = (page, ms, pan, w = 48) =>
  page.evaluate(
    ([ms, pan, w]) =>
      new Promise((resolve) => {
        let n = 0;
        let worst = 0;
        let last = performance.now();
        const start = last;
        const tick = (now) => {
          n++;
          worst = Math.max(worst, now - last);
          last = now;
          if (pan) {
            // Recorrido diagonal del mapa: obliga a pintar o mostrar zonas nuevas.
            const t = (now - start) / ms;
            window.__EW_TEST__.centerOnTile(Math.round(8 + t * (w - 16)), Math.round(w / 2));
          }
          if (now - start < ms) requestAnimationFrame(tick);
          else resolve({ fps: Math.round((n * 1000) / (now - start)), worstFrameMs: Math.round(worst) });
        };
        requestAnimationFrame(tick);
      }),
    [ms, pan, w],
  );

async function measure(type, env, size) {
  const browser = await type.launch();
  const context = await browser.newContext(env);
  const page = await context.newPage();
  const out = { size, crashed: false, errors: [] };
  page.on('crash', () => (out.crashed = true));
  page.on('pageerror', (e) => out.errors.push(e.message));
  try {
    const t0 = Date.now();
    await page.goto(`${BASE}&mapa=${size}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => window.__EW_TEST__ && Number(document.querySelector('.stats dd')?.textContent) > 0, null, { timeout: 180000 });
    out.bootMs = Date.now() - t0;
    await sleep(1000);
    out.stats = await T(page, 'renderStats');
    out.rest = await rafFps(page, 3000, false);
    out.pan = await rafFps(page, 4000, true, size);
    out.statsAfterPan = await T(page, 'renderStats');
    await T(page, 'setZoom', 0.35);
    await sleep(500);
    out.zoomMin = await rafFps(page, 3000, true, size);
    out.statsZoomMin = await T(page, 'renderStats');
    out.jsHeapMB = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
  } catch (e) {
    out.errors.push(String(e.message ?? e).slice(0, 200));
  }
  await browser.close().catch(() => {});
  return out;
}

const PROFILES = [
  ['Chromium iPhone', chromium, { ...devices['iPhone 15 Pro Max'] }],
  ['WebKit iPhone', webkit, { ...devices['iPhone 15 Pro Max'] }],
  ['Chromium escritorio', chromium, { viewport: { width: 1280, height: 800 } }],
];
const lines = ['| Perfil | Mapa | Arranque (ms) | Texturas suelo (MB) | Objetos | Árboles | FPS reposo | FPS desplazando (peor frame ms) | FPS zoom 0,35 (peor) | Texturas suelo tras zoom (MB) | Heap JS (MB) | Fallos |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const [name, type, env] of PROFILES) {
  for (const size of SIZES) {
    const runs = [];
    for (let i = 0; i < (size >= 320 ? 1 : RUNS); i++) runs.push(await measure(type, env, size));
    const ok = runs.filter((r) => r.rest);
    const m = (f) => median(ok.map(f).filter((v) => v != null));
    const fails = runs.filter((r) => r.crashed || !r.rest).length;
    lines.push(
      `| ${name} | ${size} | ${m((r) => r.bootMs)} | ${m((r) => r.stats?.renderTextureMB)} | ${m((r) => r.stats?.objects)} | ${m((r) => r.stats?.trees)} | ${m((r) => r.rest?.fps)} | ${m((r) => r.pan?.fps)} (${m((r) => r.pan?.worstFrameMs)}) | ${m((r) => r.zoomMin?.fps)} (${m((r) => r.zoomMin?.worstFrameMs)}) | ${m((r) => r.statsZoomMin?.renderTextureMB)} | ${m((r) => r.jsHeapMB)} | ${fails}/${runs.length}${runs.some((r) => r.crashed) ? ' (pestaña caída)' : ''}${runs.flatMap((r) => r.errors).length ? ' · ' + runs.flatMap((r) => r.errors)[0] : ''} |`,
    );
    console.error(lines.at(-1));
  }
}
console.log(lines.join('\n'));
console.log(`\nEjecuciones: ${RUNS} por fila (1 en mapas ≥ 320). Navegador headless en GitHub Actions, sin GPU: no equivale a un iPhone físico.`);
