// Diagnóstico de rendimiento: mide FPS reales (requestAnimationFrame) en cada etapa del ciclo.
import { chromium, devices, webkit } from 'playwright';

const URL = `${process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/'}?test=1`;
const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rafFps = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const start = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - start < 2000) requestAnimationFrame(tick);
          else resolve(Math.round((n * 1000) / (performance.now() - start)));
        };
        requestAnimationFrame(tick);
      }),
  );

async function probe(type, name, env) {
  const browser = await type.launch();
  const page = await (await browser.newContext(env)).newPage();
  const out = [];
  const mark = async (label) => out.push(`${label}=${await rafFps(page)}`);
  await page.goto(URL);
  await page.waitForFunction(() => window.__EW_TEST__ && Number(document.querySelector('.stats dd')?.textContent) > 0);
  await sleep(1000);
  await mark('reposo');
  const w = await T(page, 'world');
  const v = Object.values(w.entities).find((e) => e.id === 4);
  await T(page, 'centerOnTile', v.x, v.y);
  await sleep(150);
  let p = await T(page, 'tileToScreen', v.x, v.y);
  await page.mouse.click(p.x, p.y - 16);
  await mark('seleccionado');
  const bush = Object.values(w.entities).find((e) => e.kind === 'resource');
  await T(page, 'centerOnTile', bush.x, bush.y);
  await sleep(150);
  p = await T(page, 'tileToScreen', bush.x, bush.y);
  await page.mouse.click(p.x, p.y - 6, { button: 'right' });
  await mark('recolectando');
  await page.getByRole('button', { name: /Construir Molino/ }).click();
  const spot = await T(page, 'findPlacement', 27, 18);
  p = await T(page, 'tileToScreen', spot.x, spot.y);
  await page.mouse.move(p.x, p.y);
  await mark('vista-previa');
  await page.keyboard.press('Escape');
  await mark('tras-cancelar');
  await page.getByRole('button', { name: /Construir Molino/ }).click();
  await page.mouse.move(p.x, p.y);
  await page.mouse.click(p.x, p.y);
  await mark('cimiento');
  await T(page, 'setTimeScale', 10);
  await page.waitForFunction(() => Object.values(window.__EW_TEST__.world().entities).some((e) => e.type === 'mill' && e.complete), null, { timeout: 60000 });
  await T(page, 'setTimeScale', 1);
  await mark('molino-terminado');
  await sleep(3000);
  await mark('reposo-final');
  await page.keyboard.press('Escape');
  await mark('sin-seleccion');
  console.log(`::notice title=FPS por etapa ${name}::${out.join(' · ')}`);
  await browser.close();
}

await probe(chromium, 'chromium escritorio', { viewport: { width: 1280, height: 800 } });
await probe(webkit, 'webkit iPhone', { ...devices['iPhone 15 Pro Max'], hasTouch: true });
