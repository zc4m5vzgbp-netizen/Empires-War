import * as Phaser from 'phaser';
import { h, render } from 'preact';
import { TEST_MAP } from './content/config.ts';
import { STARTING_STOCKPILE } from './content/economy.ts';
import { createController } from './input/controller.ts';
import { INPUT } from './input/gestures.ts';
import { bindPointerInput } from './input/pointerInput.ts';
import { cloud, cloudApi, emailLogin, logout, verifyEmailCode } from './persistence/cloudStore.ts';
import { idbLocal } from './persistence/idbStore.ts';
import { createSaveManager, type SaveOutcome } from './persistence/saveManager.ts';
import { decodeSave, encodeSave } from './persistence/saveFormat.ts';
import { withSavePause } from './persistence/savePause.ts';

import { centerCameraOn, createCameraModel, panCamera, worldToScreen, zoomCameraAt } from './render/cameraModel.ts';
import { GameScene } from './render/GameScene.ts';
import { mapBounds, tileToWorld } from './render/iso.ts';
import { findPlacementNear } from './simulation/placement.ts';
import { createWorld, hashWorld, replaceWorld, type WorldState } from './simulation/world.ts';
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
  cloud: {
    user: null,
    phase: 'guest',
    status: 'Comprobando sesión…',
    slots: [],
    activeId: null,
    activeTitle: null,
    revision: 0,
    busy: false,
    unsynced: false,
    lastCloudSave: null,
    lastLocalSave: null,
  },
  toast: null,
  error: null,
});

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
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

// --- Guardado: copia en el dispositivo + nube (src/persistence/saveManager.ts) ---------------------
let lastSavedHash: string | null = null;
let lastLoadedHash: string | null = null;

/** Huella del mundo sin contar el paso del tiempo: sirve para saber si el jugador ya hizo algo. */
const pristineKey = (w: WorldState) => hashWorld({ ...w, tick: 0 });
const initialKey = pristineKey(createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size }));

const afterReplace = () => {
  controller.reset();
  scene?.onWorldReplaced();
  scene?.publishHud();
};

const saves = createSaveManager({
  cloud: cloudApi,
  local: idbLocal,
  onChange: (v) => hud.set({ cloud: v }),
  host: {
    capture: () => {
      const data = encodeSave(world, new Date().toISOString());
      return { data, hash: hashWorld(world) };
    },
    restore: (data) => {
      const decoded = decodeSave(data);
      if (!decoded.ok) throw new Error(decoded.error);
      replaceWorld(world, decoded.save.world);
      lastLoadedHash = hashWorld(world);
      afterReplace();
      return lastLoadedHash;
    },
    reset: () => {
      replaceWorld(world, createWorld({ seed: TEST_MAP.seed, size: TEST_MAP.size }));
      afterReplace();
    },
    isPristine: () => pristineKey(world) === initialKey,
    hash: () => hashWorld(world),
    // Regla §3.8: el mundo se congela mientras se escribe; luego reanuda o sigue en pausa como estaba.
    freeze: (write) => (scene ? withSavePause(scene.clock, write) : write()),
    now: () => new Date().toISOString(),
  },
});

const report = (r: SaveOutcome | { ok: true } | null, okText?: string) => {
  if (!r) return;
  if (r.ok) {
    if ('revision' in r) lastSavedHash = hashWorld(world);
    if (okText) toast(okText);
  } else toast(r.message, 'error');
};

cloud.auth.onAuthStateChange((_event, session) => {
  // Fuera del callback: supabase-js no permite llamar a la API dentro de él.
  const user = session?.user ? { id: session.user.id, label: session.user.email ?? 'Cuenta conectada' } : null;
  setTimeout(() => void saves.setUser(user), 0);
});

const AUTOSAVE_MS = 30000;
setInterval(() => {
  if (!document.hidden) void saves.autosave().then((r) => r?.ok && (lastSavedHash = hashWorld(world)));
}, AUTOSAVE_MS);
window.addEventListener('online', () => void saves.retryNow());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) void saves.flushOnHide();
  else void saves.retryNow();
});
window.addEventListener('pagehide', () => void saves.flushOnHide());

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
      save: () => void saves.saveNow().then((r) => report(r, 'Guardado en la nube.')),
      emailLogin: (email) =>
        void emailLogin(email)
          .then(() => toast('Correo enviado. Abre el enlace o escribe el código aquí.'))
          .catch((e) => toast(`No se pudo enviar el correo: ${errorText(e)}`, 'error')),
      verifyEmailCode: (email, code) =>
        void verifyEmailCode(email, code)
          .then(() => toast('Sesión iniciada.'))
          .catch((e) => toast(`Código no válido: ${errorText(e)}`, 'error')),
      logout: () =>
        void (async () => {
          const r = await saves.prepareLogout();
          if (r && !r.ok) {
            const go = window.confirm(
              'No se pudo subir el último progreso a la nube. Queda guardado en este dispositivo y se subirá la próxima vez que inicies sesión aquí. ¿Cerrar sesión igualmente?',
            );
            if (!go) return;
          }
          await logout().catch((e) => toast(errorText(e), 'error'));
        })(),
      chooseSlot: (id) => {
        const v = saves.view();
        if (v.phase === 'choose' && !window.confirm('Cargar este imperio sustituye lo que jugaste sin cuenta. ¿Continuar?')) return;
        void saves.loadSlot(id, { discardGuestProgress: true }).then((r) => report(r, 'Imperio cargado.'));
      },
      newEmpire: (fromCurrent) => {
        const v = saves.view();
        if (!fromCurrent && v.phase === 'choose' && !window.confirm('Empezar desde cero descarta lo que jugaste sin cuenta. ¿Continuar?')) return;
        void saves.newEmpire(fromCurrent).then((r) => report(r, 'Imperio nuevo guardado en la nube.'));
      },
      resolveConflict: (choice) => void saves.resolveConflict(choice).then((r) => report(r, 'Conflicto resuelto.')),
      retry: () => void saves.retryNow(),
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
    // Solo para la prueba real contra Supabase (scripts/cloud-e2e.mjs): usuarios de prueba temporales con contraseña.
    cloud: {
      signIn: async (email: string, password: string) => {
        const { error } = await cloud.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      },
      view: () => saves.view(),
      saveNow: () => saves.saveNow(),
      autosave: () => saves.autosave(),
      flushOnHide: () => saves.flushOnHide(),
      retryNow: () => saves.retryNow(),
      newEmpire: (fromCurrent: boolean) => saves.newEmpire(fromCurrent),
      loadSlot: (id: string) => saves.loadSlot(id, { discardGuestProgress: true }),
      resolveConflict: (c: 'cloud' | 'mine-as-new') => saves.resolveConflict(c),
      readOther: async (id: string) => {
        const { data, error } = await cloud.from('game_saves').select('id').eq('id', id);
        return { rows: data?.length ?? 0, error: error?.message ?? null };
      },
      writeOther: async (id: string, revision: number) => {
        const { data, error } = await cloud.rpc('save_empire', { p_id: id, p_expected_revision: revision, p_title: 'intruso', p_save_format: 2, p_state: { x: 1 } });
        return { ok: !error && Array.isArray(data) && data.length > 0, error: error?.message ?? null, code: error?.code ?? null };
      },
      directUpdate: async (id: string) => {
        const { data, error } = await cloud.from('game_saves').update({ title: 'directo' }).eq('id', id).select('id');
        return { rows: data?.length ?? 0, error: error?.message ?? null, code: error?.code ?? null };
      },
      fetchSlot: async (id: string) => {
        const full = await cloudApi.fetch(id);
        return full ? { revision: full.revision, title: full.title, hash: (JSON.parse(full.data) as { hash: string }).hash } : null;
      },
      signOut: () => logout(),
    },
    setPaused: (p: boolean) => {
      if (scene) scene.clock.paused = p;
      scene?.publishHud();
    },
  };
}
