// Comparación visual A/B del suelo: pintado completo anterior (?suelo=horneado) frente a bloques visibles (por defecto).
// Mismo build, misma cámara: compara píxel a píxel la captura del lienzo. Falla si a zoom ≥ 0,5 difiere más del 0,5 %.
// Uso: SMOKE_URL=http://localhost:4173/Empires-War/ node scripts/visual-compare.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, devices, webkit } from 'playwright';

const BASE = `${process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/'}?test=1`;
const T = (page, fn, ...args) => page.evaluate(([f, a]) => window.__EW_TEST__[f](...a), [fn, args]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('visual-compare', { recursive: true });

const SCENES = [
  { map: 48, tile: [26, 22], zoom: 0.8 },
  { map: 48, tile: [20, 30], zoom: 1.6 },
  { map: 160, tile: [80, 80], zoom: 0.8 },
  { map: 160, tile: [40, 120], zoom: 0.6 },
  { map: 160, tile: [100, 60], zoom: 0.35 },
];

async function shot(page, scene, legacy) {
  await page.goto(`${BASE}&mapa=${scene.map}${legacy ? '&suelo=horneado' : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__EW_TEST__ && Number(document.querySelector('.stats dd')?.textContent) > 0, null, { timeout: 60000 });
  await T(page, 'setTimeScale', 0);
  await T(page, 'setZoom', scene.zoom);
  await T(page, 'centerOnTile', scene.tile[0], scene.tile[1]);
  await sleep(2500); // tiempo para pintar los bloques que entran (4 por fotograma)
  return page.locator('#game canvas').screenshot();
}

/** Diferencia en el propio navegador (sin dependencias): fracción de píxeles con algún canal distinto en más de 8. */
async function diff(page, a, b) {
  return page.evaluate(
    async ([a, b]) => {
      const load = async (b64) => createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const w = Math.min(ia.width, ib.width);
      const h = Math.min(ia.height, ib.height);
      const c = new OffscreenCanvas(w, h);
      const g = c.getContext('2d');
      g.drawImage(ia, 0, 0);
      const da = g.getImageData(0, 0, w, h).data;
      g.clearRect(0, 0, w, h);
      g.drawImage(ib, 0, 0);
      const db = g.getImageData(0, 0, w, h).data;
      let n = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8) n++;
      }
      return { pct: Math.round((n / (w * h)) * 10000) / 100, w, h };
    },
    [a.toString('base64'), b.toString('base64')],
  );
}

const rows = ['| Navegador | Mapa | Casilla | Zoom | Píxeles distintos | Resultado |', '|---|---|---|---|---|---|'];
let failed = false;
for (const [name, type, env] of [['Chromium iPhone', chromium, devices['iPhone 15 Pro Max']], ['WebKit iPhone', webkit, devices['iPhone 15 Pro Max']]]) {
  const browser = await type.launch();
  const page = await (await browser.newContext({ ...env })).newPage();
  for (const s of SCENES) {
    const before = await shot(page, s, true);
    const after = await shot(page, s, false);
    const d = await diff(page, before, after);
    const tag = `${name.replace(/\W+/g, '-')}-${s.map}-${s.tile.join('_')}-${s.zoom}`;
    writeFileSync(`visual-compare/${tag}-antes.png`, before);
    writeFileSync(`visual-compare/${tag}-despues.png`, after);
    const limit = s.zoom >= 0.5 ? 0.5 : Infinity; // a zoom bajo el suelo va a media resolución: solo se informa
    const ok = d.pct <= limit;
    if (!ok) failed = true;
    rows.push(`| ${name} | ${s.map} | ${s.tile.join(',')} | ${s.zoom} | ${d.pct} % | ${ok ? (limit === Infinity ? 'informativo (media resolución)' : 'OK') : 'FALLO'} |`);
  }
  await browser.close();
}
console.log(rows.join('\n'));
if (failed) process.exit(1);
