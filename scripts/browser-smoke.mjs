// Prueba de humo en navegador real (Chromium y WebKit, el motor de Safari) con pantalla de iPhone.
// Comprueba que la escena se dibuja, que la simulación avanza y que la cámara responde.
// Uso: SMOKE_URL=http://localhost:4173/Empires-War/ node scripts/browser-smoke.mjs
import { chromium, devices, webkit } from 'playwright';

const URL = process.env.SMOKE_URL ?? 'http://localhost:4173/Empires-War/';
const phone = devices['iPhone 15 Pro Max'] ?? {
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function distinctColors(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    for (let i = 0; i < data.length; i += 4 * 97) seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return seen.size;
  }, png.toString('base64'));
}

async function run(browserType, name) {
  const browser = await browserType.launch();
  const context = await browser.newContext({ ...phone });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  const result = { browser: name, ok: false };
  try {
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForSelector('#game canvas', { timeout: 15000 });
    await page.waitForTimeout(2500);

    const stats = await page.locator('.stats dd').allTextContents();
    result.fps = Number(stats[0]);
    result.ticksPerSecond = Number(stats[1]);
    result.zoomStart = Number(stats[3]);

    const canvasBox = await page.locator('#game canvas').boundingBox();
    result.canvas = canvasBox ? `${Math.round(canvasBox.width)}x${Math.round(canvasBox.height)}` : 'ninguno';

    const shotA = await page.screenshot();
    result.colors = await distinctColors(page, shotA);

    // Arrastre (pan): mover el mapa debe cambiar la imagen.
    await page.mouse.move(200, 500);
    await page.mouse.down();
    await page.mouse.move(280, 420, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const shotB = await page.screenshot();
    result.panChangedImage = !shotA.equals(shotB);

    // Botón de acercar.
    await page.getByRole('button', { name: 'Acercar' }).click();
    await page.waitForTimeout(700);
    result.zoomAfterButton = Number((await page.locator('.stats dd').allTextContents())[3]);

    // Toque para inspeccionar una casilla en el centro.
    await page.mouse.click(phone.viewport.width / 2, phone.viewport.height / 2);
    await page.waitForTimeout(300);
    result.info = (await page.locator('.info').textContent())?.trim();
    result.errorPanel = await page.locator('.error').count();
  } catch (e) {
    errors.push(`prueba: ${e.message}`);
  }
  result.errors = errors;
  result.ok =
    errors.length === 0 &&
    result.fps > 0 &&
    result.ticksPerSecond >= 15 &&
    result.ticksPerSecond <= 25 &&
    result.colors > 8 &&
    result.panChangedImage === true &&
    result.zoomAfterButton > result.zoomStart &&
    /casilla/.test(result.info ?? '') &&
    result.errorPanel === 0;
  await browser.close();
  return result;
}

const results = [];
for (const [type, name] of [
  [chromium, 'chromium'],
  [webkit, 'webkit'],
]) {
  const r = await run(type, name);
  results.push(r);
  console.log(JSON.stringify(r));
  const summary = `${r.ok ? 'OK' : 'FALLO'} · lienzo ${r.canvas} · FPS ${r.fps} · ticks/s ${r.ticksPerSecond} · colores ${r.colors} · pan ${r.panChangedImage} · zoom ${r.zoomStart}→${r.zoomAfterButton} · info «${r.info}» · errores ${r.errors.length ? r.errors.join(' | ') : 0}`;
  console.log(`::${r.ok ? 'notice' : 'error'} title=Navegador ${name} (iPhone 15 Pro Max)::${summary.replace(/\n/g, ' ').slice(0, 1500)}`);
}
if (!results.every((r) => r.ok)) process.exit(1);
