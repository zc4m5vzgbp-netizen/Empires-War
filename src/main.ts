import * as Phaser from 'phaser';
import { h, render } from 'preact';
import { TEST_MAP } from './content/config.ts';
import { STARTING_STOCKPILE } from './content/economy.ts';
import { createController } from './input/controller.ts';
import { INPUT } from './input/gestures.ts';
import { bindPointerInput } from './input/pointerInput.ts';
import { cloud, emailLogin, verifyEmailCode, listCloudSaves, login, logout, saveCloud, signedIn } from './persistence/cloudStore.ts';
import { decodeSave, encodeSave } from './persistence/saveFormat.ts';

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
  cloudUser: null,
  cloudStatus: 'Conecta tu cuenta para guardar',
  cloudSlots: [],
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
let lastSavedHash: string | null = null;
let lastLoadedHash: string | null = null;

let activeSlot: string | null = null;
let activeRevision = 0;
let pending = false;
let cloudBusy = false;
let cloudReady = false;
let currentUserId: string | null = null;
let slotChosen = false;
let lastConfirmedHash: string | null = null;
const initialWorldHash = hashWorld(world);

async function refreshSlots() {
  const slots = await listCloudSaves();
  hud.set({ cloudSlots: slots.map(({ id, title, updated_at }) => ({ id, title, updated_at })) });
  return slots;
}
async function initCloud() {
  const user = await signedIn();
  if ((user?.id ?? null) === currentUserId) return;
  currentUserId = user?.id ?? null;
  cloudReady = Boolean(user);
  activeSlot = null;
  activeRevision = 0;
  lastConfirmedHash = null;
  slotChosen = false;
  hud.set({ cloudUser: user?.email ?? (user ? 'Cuenta conectada' : null), cloudStatus: user ? 'Conectado; selecciona o crea un imperio' : 'Sin sesión; inicia sesión para guardar' });
  if (user) {
    try {
      const slots = await refreshSlots();
      if (slots.length === 1) {
        if (hashWorld(world) === initialWorldHash) await loadSlot(slots[0]!.id);
        else hud.set({ cloudStatus: 'Hay progreso local sin guardar: elige un imperio o guarda uno nuevo' });
      }
      else if (slots.length === 0) { slotChosen = true; hud.set({ cloudStatus: 'Imperio nuevo: se guardará automáticamente' }); }
    } catch (e) { hud.set({ cloudStatus: 'No se pudo consultar la nube' }); toast(String(e), 'error'); }
  } else {
    activeSlot = null;
    activeRevision = 0;
    lastConfirmedHash = null;
    slotChosen = false;
  }
}
async function save(): Promise<void> {
  if (!scene || !cloudReady || !slotChosen) {
    toast('Inicia sesión y selecciona un imperio para guardar.', 'error');
    return;
  }
  if (cloudBusy) { pending = true; return; }
  cloudBusy = true;
  hud.set({ saving: true, cloudStatus: 'Sincronizando…' });
  try {
    const savedAt = new Date().toISOString();
    const data = encodeSave(world, savedAt);
    const hash = hashWorld(world);
    const result = await saveCloud(activeSlot, activeRevision, 'Mi imperio', data);
    activeSlot = result.save_id;
    activeRevision = result.new_revision;
    lastConfirmedHash = hash;
    lastSavedHash = hash;
    hud.set({ lastSavedAt: new Date(result.saved_at).toLocaleString('es'), cloudStatus: 'Guardado en la nube' });
    await refreshSlots();
  } catch (e) {
    hud.set({ cloudStatus: 'Error: cambios no sincronizados' });
    toast('No se guardó en la nube: ' + String(e), 'error');
  } finally {
    cloudBusy = false;
    hud.set({ saving: false });
    scene.publishHud();
    if (pending) { pending = false; if (hashWorld(world) !== lastConfirmedHash) void save(); }
  }
}
async function loadSlot(id: string): Promise<void> {
  if (cloudBusy || !scene) return;
  if ((lastConfirmedHash !== null && hashWorld(world) !== lastConfirmedHash) || (lastConfirmedHash === null && hashWorld(world) !== initialWorldHash && !slotChosen)) {
    toast('Hay cambios sin guardar. Guarda antes de cambiar de imperio.', 'error');
    return;
  }
  try {
    const slot = (await refreshSlots()).find(s => s.id === id);
    if (!slot) throw new Error('Partida no encontrada.');
    const decoded = decodeSave(JSON.stringify(slot.state));
    if (!decoded.ok) throw new Error(decoded.error);
    replaceWorld(world, decoded.save.world);
    activeSlot = slot.id;
    slotChosen = true;
    activeRevision = slot.revision;
    lastLoadedHash = hashWorld(world);
    lastConfirmedHash = lastLoadedHash;
    controller.reset();
    scene.onWorldReplaced();
    hud.set({ cloudStatus: 'Partida recuperada de la nube', lastSavedAt: new Date(slot.updated_at).toLocaleString('es') });
    toast('Imperio recuperado de la nube.');
  } catch (e) { toast('Error al cargar: ' + String(e), 'error'); }
}
async function load(): Promise<void> {
  if (!cloudReady) { toast('Inicia sesión para cargar.', 'error'); return; }
  const slots = await refreshSlots();
  if (!slots.length) { toast('No hay partidas en la nube.', 'error'); return; }
  await loadSlot(activeSlot ?? slots[0]!.id);
}
void initCloud();
cloud.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') setTimeout(() => void initCloud(), 0); });
setInterval(() => {
  if (cloudReady && slotChosen && !cloudBusy && hashWorld(world) !== lastConfirmedHash) void save();
}, 30000);
window.addEventListener('online', () => {
  if (cloudReady && slotChosen && hashWorld(world) !== lastConfirmedHash) void save();
});

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
      login: (provider) => void login(provider).catch(e => toast(String(e), 'error')),
      emailLogin: (email) => void emailLogin(email).then(() => toast('Revisa tu correo para acceder.')).catch(e => toast(String(e), 'error')),
      verifyEmailCode: (email, code) => void verifyEmailCode(email, code).then(() => void initCloud()).catch(e => toast(String(e), 'error')),
      logout: () => void logout().catch(e => toast(String(e), 'error')),
      chooseSlot: (id) => void loadSlot(id),
      newSlot: () => {
        if (!cloudReady) { toast('Inicia sesión primero.', 'error'); return; }
        if ((lastConfirmedHash !== null && hashWorld(world) !== lastConfirmedHash) || (lastConfirmedHash === null && hashWorld(world) !== initialWorldHash && slotChosen)) { toast('Guarda los cambios antes de crear otro imperio.', 'error'); return; }
        activeSlot = null;
        activeRevision = 0;
        slotChosen = true;
        lastConfirmedHash = null;
        replaceWorld(world, createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size }));
        controller.reset();
        scene?.onWorldReplaced();
        hud.set({ cloudStatus: 'Nuevo imperio pendiente de guardar', lastSavedAt: null });
        void save();
      },
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
  };
}
