import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pinchFactor, keyPanVelocity, wheelFactor } from '../src/input/gestures.ts';
import { createCameraModel, panCamera, screenToWorld, zoomCameraAt } from '../src/render/cameraModel.ts';
import { mapBounds, tileToWorld, worldToTile } from '../src/render/iso.ts';

test('Isométrico: casilla → pantalla → casilla vuelve a la misma casilla', () => {
  for (let y = 0; y < 48; y += 5) {
    for (let x = 0; x < 48; x += 7) {
      const w = tileToWorld(x, y);
      const t = worldToTile(w.x, w.y);
      assert.ok(Math.abs(t.x - x) < 1e-9 && Math.abs(t.y - y) < 1e-9);
    }
  }
});

test('Isométrico: las cuatro esquinas del mapa caen dentro de sus límites', () => {
  const b = mapBounds(48, 48);
  for (const [x, y] of [[0, 0], [47, 0], [0, 47], [47, 47]] as const) {
    const p = tileToWorld(x, y);
    assert.ok(p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY);
  }
});

test('Cámara: el zoom respeta los límites y mantiene fijo el punto bajo el dedo', () => {
  const cam = createCameraModel(mapBounds(48, 48), { minZoom: 0.35, maxZoom: 2.5, zoom: 1 });
  const before = screenToWorld(cam, 100, 200, 390, 844);
  zoomCameraAt(cam, 1.5, 100, 200, 390, 844);
  const after = screenToWorld(cam, 100, 200, 390, 844);
  assert.ok(Math.abs(before.x - after.x) < 1e-6 && Math.abs(before.y - after.y) < 1e-6);
  zoomCameraAt(cam, 100, 0, 0, 390, 844);
  assert.equal(cam.zoom, 2.5);
  zoomCameraAt(cam, 0.0001, 0, 0, 390, 844);
  assert.equal(cam.zoom, 0.35);
});

test('Cámara: arrastrar mueve en sentido contrario y no sale del mapa', () => {
  const b = mapBounds(48, 48);
  const cam = createCameraModel(b, { minZoom: 0.35, maxZoom: 2.5, zoom: 1 });
  const cx = cam.cx;
  panCamera(cam, 50, 0);
  assert.equal(cam.cx, cx - 50);
  panCamera(cam, -1e7, 1e7);
  assert.equal(cam.cx, b.maxX);
  assert.equal(cam.cy, b.minY);
});

test('Gestos: pellizco, rueda y teclado', () => {
  assert.equal(pinchFactor(100, 150), 1.5);
  assert.equal(pinchFactor(0, 150), 1);
  assert.ok(wheelFactor(100) < 1 && wheelFactor(-100) > 1);
  assert.deepEqual(keyPanVelocity(['KeyD', 'ArrowUp']), { x: 900, y: -900 });
});
