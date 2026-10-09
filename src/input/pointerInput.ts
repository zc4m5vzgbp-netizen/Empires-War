import { INPUT, distance, isPanKey, keyPanVelocity, midpoint, pinchFactor, wheelFactor, type Point } from './gestures.ts';

// Traduce toques, ratón y teclado en intenciones de cámara.
// En el Bloque 1 también producirá órdenes para la simulación (seleccionar, mover).
export interface CameraIntents {
  pan(dx: number, dy: number): void;
  zoomAt(factor: number, sx: number, sy: number): void;
  tap(sx: number, sy: number): void;
}

interface TrackedPointer extends Point {
  startX: number;
  startY: number;
  type: string;
  button: number;
}

const MOUSE_LEFT = 0;

export function bindPointerInput(element: HTMLElement, intents: CameraIntents) {
  const pointers = new Map<number, TrackedPointer>();
  const keys = new Set<string>();
  let gesture: 'none' | 'tap' | 'pan' | 'pinch' = 'none';
  let pinchPrev: { dist: number; mid: Point } | null = null;
  const abort = new AbortController();
  const opts = { signal: abort.signal };

  const local = (e: PointerEvent | WheelEvent): Point => {
    const rect = element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const currentPinch = () => {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return null;
    return { dist: distance(a, b), mid: midpoint(a, b) };
  };

  element.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault();
      element.setPointerCapture(e.pointerId);
      const p = local(e);
      pointers.set(e.pointerId, { ...p, startX: p.x, startY: p.y, type: e.pointerType, button: e.button });
      if (pointers.size === 1) gesture = 'tap';
      else if (pointers.size === 2) {
        gesture = 'pinch';
        pinchPrev = currentPinch();
      }
    },
    opts,
  );

  element.addEventListener(
    'pointermove',
    (e) => {
      const ptr = pointers.get(e.pointerId);
      if (!ptr) return;
      const p = local(e);
      const dx = p.x - ptr.x;
      const dy = p.y - ptr.y;
      ptr.x = p.x;
      ptr.y = p.y;

      if (gesture === 'pinch') {
        const now = currentPinch();
        if (pinchPrev && now) {
          intents.zoomAt(pinchFactor(pinchPrev.dist, now.dist), now.mid.x, now.mid.y);
          intents.pan(now.mid.x - pinchPrev.mid.x, now.mid.y - pinchPrev.mid.y);
        }
        pinchPrev = now;
        return;
      }
      if (gesture === 'tap' && distance(ptr, { x: ptr.startX, y: ptr.startY }) > INPUT.tapSlop) gesture = 'pan';
      if (gesture === 'pan') intents.pan(dx, dy);
    },
    opts,
  );

  const release = (e: PointerEvent, cancelled: boolean) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    pointers.delete(e.pointerId);
    const isTap = !cancelled && gesture === 'tap' && (ptr.type !== 'mouse' || ptr.button === MOUSE_LEFT);
    if (isTap && pointers.size === 0) intents.tap(ptr.x, ptr.y);
    if (pointers.size === 0) {
      gesture = 'none';
      pinchPrev = null;
    } else if (gesture === 'pinch') {
      gesture = 'pan'; // al levantar un dedo, el otro sigue moviendo la cámara
      pinchPrev = null;
    }
  };
  element.addEventListener('pointerup', (e) => release(e, false), opts);
  element.addEventListener('pointercancel', (e) => release(e, true), opts);

  element.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = local(e);
      intents.zoomAt(wheelFactor(e.deltaY), p.x, p.y);
    },
    { ...opts, passive: false },
  );
  element.addEventListener('contextmenu', (e) => e.preventDefault(), opts);

  window.addEventListener(
    'keydown',
    (e) => {
      if (isPanKey(e.code)) keys.add(e.code);
    },
    opts,
  );
  window.addEventListener('keyup', (e) => keys.delete(e.code), opts);
  window.addEventListener('blur', () => keys.clear(), opts);
  // Safari iOS: impedir que el pellizco haga zoom a la página entera.
  document.addEventListener('gesturestart', (e) => e.preventDefault(), opts);

  return {
    /** Desplazamiento continuo con teclado; llamar una vez por frame. */
    update(dtSeconds: number) {
      if (keys.size === 0) return;
      const v = keyPanVelocity(keys);
      intents.pan(-v.x * dtSeconds, -v.y * dtSeconds);
    },
    destroy() {
      abort.abort();
    },
  };
}
