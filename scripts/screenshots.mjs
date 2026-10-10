// Capturas de revisión visual (iPhone 15 Pro Max con WebKit y escritorio con Chromium).
// Las guarda en ./capturas para que el workflow las publique en la rama «capturas».
import { mkdirSync } from 'node:fs';
import { chromium, devices, webkit } from 'playwright';

const URL = `${process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/'}?test=1`;
const OUT = 'capturas';
mkdirSync(OUT, { recursive: true });
const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(page) {
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => Number(document.querySelector('.stats dd')?.textContent) > 0 && window.__EW_TEST__, null, { timeout: 20000 });
  await sleep(800);
}
async function tapTile(page, x, y, lift = 0) {
  await T(page, 'centerOnTile', x, y);
  await sleep(150);
  const p = await T(page, 'tileToScreen', x, y);
  await page.touchscreen.tap(p.x, p.y - lift);
  await sleep(250);
}

// iPhone (WebKit)
{
  const browser = await webkit.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 15 Pro Max'] })).newPage();
  await boot(page);
  await page.screenshot({ path: `${OUT}/01-iphone-inicio.png` });
  let w = await T(page, 'world');
  const v = Object.values(w.entities).find((e) => e.kind === 'villager' && e.id === 4);
  await tapTile(page, v.x, v.y, 16);
  await page.screenshot({ path: `${OUT}/02-iphone-aldeano-seleccionado.png` });
  const bush = Object.values(w.entities).find((e) => e.kind === 'resource');
  await tapTile(page, bush.x, bush.y, 6);
  await T(page, 'setTimeScale', 10);
  await sleep(4000);
  await T(page, 'setTimeScale', 1);
  await T(page, 'centerOnTile', 28, 21);
  await sleep(200);
  await page.screenshot({ path: `${OUT}/03-iphone-recolectando.png` });
  w = await T(page, 'world');
  const ve = w.entities[4];
  await tapTile(page, ve.x, ve.y, 16);
  await page.getByRole('button', { name: /Construir Molino/ }).tap();
  const spot = await T(page, 'findPlacement', 27, 18);
  await tapTile(page, spot.x, spot.y);
  await page.screenshot({ path: `${OUT}/04-iphone-vista-previa-molino.png` });
  await page.getByRole('button', { name: 'Confirmar' }).tap();
  await T(page, 'setTimeScale', 10);
  await sleep(2500);
  await T(page, 'setTimeScale', 1);
  await page.screenshot({ path: `${OUT}/05-iphone-molino-en-construccion.png` });
  await T(page, 'setTimeScale', 10);
  await page.waitForFunction(() => Object.values(window.__EW_TEST__.world().entities).some((e) => e.type === 'mill' && e.complete), null, { timeout: 60000 });
  await T(page, 'setTimeScale', 1);
  await sleep(300);
  await page.screenshot({ path: `${OUT}/06-iphone-molino-terminado.png` });
  await page.getByRole('button', { name: 'Partida' }).tap();
  await sleep(200);
  await page.screenshot({ path: `${OUT}/07-iphone-menu-partida.png` });
  await browser.close();
}

// Escritorio (Chromium)
{
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await boot(page);
  await page.screenshot({ path: `${OUT}/08-escritorio-inicio.png` });
  await page.mouse.move(420, 360);
  await page.mouse.down();
  await page.mouse.move(820, 560, { steps: 8 });
  await page.screenshot({ path: `${OUT}/09-escritorio-recuadro.png` });
  await page.mouse.up();
  await sleep(200);
  await page.screenshot({ path: `${OUT}/10-escritorio-seleccion.png` });
  await browser.close();
}
// Galería de estilo (?galeria=1): arte del atlas que la partida aún no usa (soldados, piedra, edificios).
{
  const browser = await webkit.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 15 Pro Max'] })).newPage();
  await page.goto(URL + '&galeria=1', { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__EW_TEST__), null, { timeout: 20000 });
  await page.evaluate(() => window.__EW_TEST__.centerOnTile(19, 29));
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/11-iphone-galeria.png` });
  const desk = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await desk.goto(URL + '&galeria=1', { waitUntil: 'load' });
  await desk.waitForFunction(() => Boolean(window.__EW_TEST__), null, { timeout: 20000 });
  await desk.evaluate(() => window.__EW_TEST__.centerOnTile(21, 27));
  await sleep(1500);
  await desk.screenshot({ path: `${OUT}/12-escritorio-galeria.png` });
  // Aldeanas haciendo cada tarea (fila de la galería).
  await desk.evaluate(() => window.__EW_TEST__.centerOnTile(13, 21));
  await desk.evaluate(() => window.__EW_TEST__.setPaused?.(false));
  await sleep(1200);
  await desk.screenshot({ path: `${OUT}/13-escritorio-aldeano-tareas.png` });
  await browser.close();
}
console.log('Capturas listas');
