import { INPUT, distance, isPanKey, keyPanVelocity, midpoint, pinchFactor, wheelFactor, type Point } from './gestures.ts';

// Traduce toques, ratón y teclado en intenciones. No conoce el juego: solo gestos.
//
// Táctil (iPhone): un dedo arrastra = mover cámara (o recuadro si el modo Recuadro está activo);
//   dos dedos = zoom; un toque = acción principal.
// Ratón (PC): clic izquierdo = acción principal; arrastre izquierdo = recuadro de selección;
//   clic derecho = orden; arrastre derecho o central = mover cámara; rueda = zoom.
export interface PointerIntents {
  pan(dx: number, dy: number): void;
  zoomAt(factor: number, sx: number, sy: number): void;
  tap(sx: number, sy: number, info: { secondary: boolean; shift: boolean; touch: boolean }): void;
  box(phase: 'move' | 'end' | 'cancel', from: Point, to: Point, shift: boolean): void;
  hover(sx: number, sy: number): void;
}

interface TrackedPointer extends Point {
  startX: number;
  startY: number;
  touch: boolean;
  button: number;
}

const BUTTON_LEFT = 0;
const BUTTON_MIDDLE = 1;
const BUTTON_RIGHT = 2;

export function bindPointerInput(element: HTMLElement, intents: PointerIntents, options: { isBoxMode(): boolean }) {
  const pointers = new Map<number, TrackedPointer>();
  const keys = new Set<string>();
  let gesture: 'none' | 'tap' | 'pan' | 'pinch' | 'box' = 'none';
  let shift = false;
  let pinchPrev: { dist: number; mid: Point } | null = null;
  const abort = new AbortController();
  const opts = { signal: abort.signal };

  const local = (e: PointerEvent | WheelEvent | MouseEvent): Point => {
    const rect = element.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const currentPinch = () => {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return null;
    return { dist: distance(a, b), mid: midpoint(a, b) };
  };

  /** Qué hace arrastrar con este puntero. */
  const dragKind = (p: TrackedPointer): 'pan' | 'box' => {
    if (p.touch) return options.isBoxMode() ? 'box' : 'pan';
    return p.button === BUTTON_LEFT ? 'box' : 'pan';
  };

  element.addEventListener(
    'pointerdown',
    (e) => {
      e.preventDefault();
      try {
        element.setPointerCapture(e.pointerId);
      } catch {
        // Algunos navegadores rechazan la captura de punteros sintéticos; el gesto sigue funcionando.
      }
      const p = local(e);
      shift = e.shiftKey;
      pointers.set(e.pointerId, { ...p, startX: p.x, startY: p.y, touch: e.pointerType !== 'mouse', button: e.button });
      if (pointers.size === 1) gesture = 'tap';
      else if (pointers.size === 2) {
        if (gesture === 'box') {
          const first = [...pointers.values()][0]!;
          intents.box('cancel', { x: first.startX, y: first.startY }, first, shift);
        }
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
      const p = local(e);
      if (!ptr) {
        if (e.pointerType === 'mouse' && pointers.size === 0) intents.hover(p.x, p.y);
        return;
      }
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
      if (gesture === 'tap' && distance(ptr, { x: ptr.startX, y: ptr.startY }) > INPUT.tapSlop) gesture = dragKind(ptr);
      if (gesture === 'pan') intents.pan(dx, dy);
      else if (gesture === 'box') intents.box('move', { x: ptr.startX, y: ptr.startY }, ptr, shift);
    },
    opts,
  );

  const release = (e: PointerEvent, cancelled: boolean) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      if (gesture === 'tap' && !cancelled && ptr.button !== BUTTON_MIDDLE) {
        intents.tap(ptr.x, ptr.y, { secondary: !ptr.touch && ptr.button === BUTTON_RIGHT, shift, touch: ptr.touch });
      } else if (gesture === 'box') {
        intents.box(cancelled ? 'cancel' : 'end', { x: ptr.startX, y: ptr.startY }, ptr, shift);
      }
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
