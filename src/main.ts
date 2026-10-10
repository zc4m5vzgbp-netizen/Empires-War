import * as Phaser from 'phaser';
import { h, render } from 'preact';
import { TEST_MAP } from './content/config.ts';
import { STARTING_STOCKPILE } from './content/economy.ts';
import { createController } from './input/controller.ts';
import { INPUT } from './input/gestures.ts';
import { bindPointerInput } from './input/pointerInput.ts';
import { DEFAULT_SLOT, readSave, writeSave } from './persistence/idbStore.ts';
import { decodeSave, encodeSave } from './persistence/saveFormat.ts';
import { withSavePause } from './persistence/savePause.ts';
import { centerCameraOn, createCameraModel, panCamera, worldToScreen, zoomCameraAt } from './render/cameraModel.ts';
import { GameScene } from './render/GameScene.ts';
import { mapBounds, tileToWorld } from './render/iso.ts';
import { findPlacementNear } from './simulation/placement.ts';
import { createWorld, hashWorld, replaceWorld } from './simulation/world.ts';
import { App } from './ui/App.tsx';
import { createHudStore } from './ui/store.ts';
import './ui/styles.css';

const BUILD = `${__BUILD_ID__} (${__BUILD_TIME__.slice(0, 16).replace('T', ' ')} UTC)`;
const TOUCH = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const hud = createHudStore({
  fps: 0,
  ticksPerSecond: 0,
  stepMs: 0,
  tick: 0,
  zoom: 0,
  stockpile: { ...STARTING_STOCKPILE.value },
  selection: { kind: 'none', title: '', lines: [], canOrderBuild: false },
  placement: null,
  canAffordMill: true,
  paused: false,
  boxMode: false,
  box: null,
  saving: false,
  lastSavedAt: null,
  toast: null,
  error: null,
});

const reportError = (message: string) => hud.set({ error: message });
window.addEventListener('error', (e) => reportError(`${e.message}\n${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => reportError(String(e.reason)));

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toast = (text: string, kind: 'info' | 'error' = 'info') => {
  hud.set({ toast: { id: ++toastId, text, kind } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hud.set({ toast: null }), 3500);
};

const gameEl = document.getElementById('game');
const uiEl = document.getElementById('ui');
if (!gameEl || !uiEl) throw new Error('Faltan los contenedores #game o #ui en index.html');

const world = createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size });
const startZoom = Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.8 : 1.1;
const camera = createCameraModel(mapBounds(world.map.width, world.map.height), { minZoom: 0.35, maxZoom: 2.5, zoom: startZoom });
// La cámara empieza sobre el Centro Urbano y los arbustos.
const home = (() => {
  const p = tileToWorld(26, 22);
  return { cx: p.x, cy: p.y, zoom: startZoom };
})();
centerCameraOn(camera, home.cx, home.cy);
hud.set({ zoom: camera.zoom });

const viewSize = () => ({ w: gameEl.clientWidth, h: gameEl.clientHeight });
let scene: GameScene | null = null;

const controller = createController({
  world,
  camera,
  viewSize,
  events: {
    toast,
    marker: (tile) => scene?.showMarker(tile),
  },
});

let boxMode = false;
const input = bindPointerInput(
  gameEl,
  {
    pan: (dx, dy) => panCamera(camera, dx, dy),
    zoomAt: (factor, sx, sy) => {
      const { w, h: hgt } = viewSize();
      zoomCameraAt(camera, factor, sx, sy, w, hgt);
    },
    tap: (sx, sy, info) => {
      if (info.secondary) controller.secondaryTap(sx, sy);
      else controller.primaryTap(sx, sy, { shift: info.shift, touch: info.touch });
      scene?.publishHud();
    },
    box: (phase, from, to, shift) => {
      if (phase === 'move') {
        hud.set({ box: { x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), w: Math.abs(to.x - from.x), h: Math.abs(to.y - from.y) } });
        return;
      }
      hud.set({ box: null });
      if (phase === 'end') controller.boxSelect(from.x, from.y, to.x, to.y, { shift });
      scene?.publishHud();
    },
    hover: (sx, sy) => controller.hover(sx, sy),
  },
  { isBoxMode: () => boxMode },
);

scene = new GameScene({ world, camera, hud, controller, onFrame: (dt) => input.update(dt) });

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

// --- Guardado y carga -------------------------------------------------------
let saving = false;
let lastSavedHash: string | null = null;
let lastLoadedHash: string | null = null;

async function save(): Promise<void> {
  if (saving || !scene) return;
  saving = true;
  hud.set({ saving: true });
  try {
    // La pausa se activa antes de copiar el estado: nada cambia hasta que la escritura termina.
    await withSavePause(scene.clock, async () => {
      const savedAt = new Date().toISOString();
      const data = encodeSave(world, savedAt);
      const hash = hashWorld(world);
      await writeSave({ slot: DEFAULT_SLOT, savedAt, data });
      lastSavedHash = hash;
      hud.set({ lastSavedAt: new Date(savedAt).toLocaleString('es') });
    });
    toast('Partida guardada.');
  } catch (e) {
    toast(`No se pudo guardar: ${e instanceof Error ? e.message : String(e)}`, 'error');
  } finally {
    saving = false;
    hud.set({ saving: false });
    scene.publishHud();
  }
}

async function load(): Promise<void> {
  if (saving || !scene) return;
  try {
    const stored = await readSave(DEFAULT_SLOT);
    if (!stored) {
      toast('No hay ninguna partida guardada en este navegador.', 'error');
      return;
    }
    const result = decodeSave(stored.data);
    if (!result.ok) {
      toast(result.error, 'error');
      return;
    }
    replaceWorld(world, result.save.world);
    lastLoadedHash = hashWorld(world);
    controller.reset();
    scene.onWorldReplaced();
    toast(`Partida cargada (guardada el ${new Date(stored.savedAt).toLocaleString('es')}).`);
  } catch (e) {
    toast(`No se pudo cargar: ${e instanceof Error ? e.message : String(e)}`, 'error');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (controller.placing) controller.cancelPlacing();
    else controller.deselect();
    scene?.publishHud();
  }
});

render(
  h(App, {
    store: hud,
    build: BUILD,
    touch: TOUCH,
    actions: {
      zoomIn: () => zoomCentered(INPUT.buttonZoomStep),
      zoomOut: () => zoomCentered(1 / INPUT.buttonZoomStep),
      recenter: () => Object.assign(camera, home),
      startBuildMill: () => {
        controller.startPlacing('mill');
        scene?.publishHud();
      },
      confirmPlacement: () => {
        controller.confirmPlacement();
        scene?.publishHud();
      },
      cancelPlacement: () => {
        controller.cancelPlacing();
        scene?.publishHud();
      },
      deselect: () => {
        controller.deselect();
        scene?.publishHud();
      },
      togglePause: () => {
        if (!scene) return;
        scene.clock.paused = !scene.clock.paused;
        scene.publishHud();
      },
      toggleBoxMode: () => {
        boxMode = !boxMode;
        hud.set({ boxMode });
      },
      save: () => void save(),
      load: () => void load(),
    },
  }),
  uiEl,
);

// Gancho de pruebas automáticas: solo existe con ?test=1 en la URL. No cambia las reglas del juego.
if (new URLSearchParams(location.search).has('test')) {
  const tileToScreen = (x: number, y: number) => {
    const p = tileToWorld(x, y);
    const { w, h: hgt } = viewSize();
    return worldToScreen(camera, p.x, p.y, w, hgt);
  };
  (window as unknown as Record<string, unknown>).__EW_TEST__ = {
    world: () => JSON.parse(JSON.stringify(world)),
    hash: () => hashWorld(world),
    lastSavedHash: () => lastSavedHash,
    lastLoadedHash: () => lastLoadedHash,
    selection: () => [...controller.selection],
    tileToScreen,
    centerOnTile: (x: number, y: number) => {
      const p = tileToWorld(x, y);
      centerCameraOn(camera, p.x, p.y);
    },
    setTimeScale: (n: number) => {
      if (scene) scene.clock.timeScale = n;
    },
    findPlacement: (x: number, y: number) => findPlacementNear(world, 'mill', x, y),
    paused: () => scene?.clock.paused ?? false,
    objectCount: () => scene?.children.list.length ?? 0,
    textures: () => scene?.textures.getTextureKeys() ?? [],
    animCount: (prefix: string) => (scene ? [...scene.anims.anims.keys()].filter((k: string) => k.startsWith(prefix)).length : 0),
  };
}
