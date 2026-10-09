import * as Phaser from 'phaser';
import { h, render } from 'preact';
import { TEST_MAP } from './content/config.ts';
import { INPUT } from './input/gestures.ts';
import { bindPointerInput } from './input/pointerInput.ts';
import { createCameraModel, panCamera, zoomCameraAt } from './render/cameraModel.ts';
import { mapBounds } from './render/iso.ts';
import { TestScene } from './render/TestScene.ts';
import { createWorld } from './simulation/world.ts';
import { App } from './ui/App.tsx';
import { createHudStore } from './ui/store.ts';
import './ui/styles.css';

const BUILD = `${__BUILD_ID__} (${__BUILD_TIME__.slice(0, 16).replace('T', ' ')} UTC)`;

const hud = createHudStore({ fps: 0, ticksPerSecond: 0, stepMs: 0, tick: 0, zoom: 0, info: null, error: null });

const reportError = (message: string) => hud.set({ error: message });
window.addEventListener('error', (e) => reportError(`${e.message}\n${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => reportError(String(e.reason)));

const gameEl = document.getElementById('game');
const uiEl = document.getElementById('ui');
if (!gameEl || !uiEl) throw new Error('Faltan los contenedores #game o #ui en index.html');

const world = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
const startZoom = Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.7 : 1;
const camera = createCameraModel(mapBounds(world.map.width, world.map.height), {
  minZoom: 0.35,
  maxZoom: 2.5,
  zoom: startZoom,
});
const home = { cx: camera.cx, cy: camera.cy, zoom: camera.zoom };
hud.set({ zoom: camera.zoom });

const viewSize = () => ({ w: gameEl.clientWidth, h: gameEl.clientHeight });

let scene: TestScene | null = null;
const input = bindPointerInput(gameEl, {
  pan: (dx, dy) => panCamera(camera, dx, dy),
  zoomAt: (factor, sx, sy) => {
    const { w, h: hgt } = viewSize();
    zoomCameraAt(camera, factor, sx, sy, w, hgt);
  },
  tap: (sx, sy) => scene?.inspect(sx, sy),
});

scene = new TestScene({ world, camera, hud, onFrame: (dt) => input.update(dt) });

new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameEl,
  backgroundColor: '#1d2318',
  banner: false,
  // La entrada la gestiona src/input (gestos táctiles propios); Phaser solo dibuja.
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  scale: { mode: Phaser.Scale.RESIZE, width: gameEl.clientWidth, height: gameEl.clientHeight },
  scene: [scene],
});

const zoomCentered = (factor: number) => {
  const { w, h: hgt } = viewSize();
  zoomCameraAt(camera, factor, w / 2, hgt / 2, w, hgt);
};

render(
  h(App, {
    store: hud,
    build: BUILD,
    actions: {
      zoomIn: () => zoomCentered(INPUT.buttonZoomStep),
      zoomOut: () => zoomCentered(1 / INPUT.buttonZoomStep),
      recenter: () => Object.assign(camera, home),
    },
  }),
  uiEl,
);
