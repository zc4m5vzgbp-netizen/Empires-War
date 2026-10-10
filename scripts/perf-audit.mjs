// Auditoría de rendimiento (Claude): FPS por requestAnimationFrame con y sin cada atlas nuevo.
// 3 ejecuciones por configuración; mediana y peor valor. CI headless: NO equivale a un iPhone físico.
import { chromium, devices, webkit } from 'playwright';

const BASE = `${process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/'}?test=1`;
const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rafFps = (page, ms = 3000) =>
  page.evaluate((ms) => new Promise((resolve) => {
    let n = 0; const start = performance.now();
    const tick = () => { n++; if (performance.now() - start < ms) requestAnimationFrame(tick); else resolve(Math.round((n * 1000) / (performance.now() - start))); };
    requestAnimationFrame(tick);
  }), ms);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function run(type, env, extra) {
  const browser = await type.launch();
  const page = await (await browser.newContext(env)).newPage();
  const t0 = Date.now();
  await page.goto(BASE + extra);
  await page.waitForFunction(() => window.__EW_TEST__ && Number(document.querySelector('.stats dd')?.textContent) > 0, null, { timeout: 30000 });
  const boot = Date.now() - t0;
  await sleep(1000);
  const rest = await rafFps(page);
  // Los 5 aldeanos a recolectar (todos animados) y simulación a x10.
  const w = await T(page, 'world');
  const tex = await T(page, 'textures');
  await T(page, 'setTimeScale', 10);
  await sleep(1500);
  const busy = await rafFps(page);
  await T(page, 'setTimeScale', 1);
  await browser.close();
  return { boot, rest, busy, eco: tex.includes('eco'), camp: tex.includes('camp') };
}

for (const [name, type, env] of [['chromium iPhone', chromium, { ...devices['iPhone 15 Pro Max'] }], ['webkit iPhone', webkit, { ...devices['iPhone 15 Pro Max'] }]]) {
  const lines = [];
  for (const [label, extra] of [['todo', ''], ['sin aldeana eco', '&sinEco=1'], ['sin campamentos', '&sinCamp=1'], ['sin ambos', '&sinEco=1&sinCamp=1']]) {
    const rs = [];
    for (let i = 0; i < 3; i++) rs.push(await run(type, env, extra));
    lines.push(`${label} [eco=${rs[0].eco} camp=${rs[0].camp}]: arranque med ${median(rs.map((r) => r.boot))} ms · FPS reposo med ${median(rs.map((r) => r.rest))} (peor ${Math.min(...rs.map((r) => r.rest))}) · FPS x10 med ${median(rs.map((r) => r.busy))} (peor ${Math.min(...rs.map((r) => r.busy))})`);
  }
  console.log(`::notice title=Auditoría FPS ${name}::${lines.join(' || ')}`);
}
