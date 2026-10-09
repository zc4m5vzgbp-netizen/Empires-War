// Matemática de gestos, pura y probable sin navegador.
export interface Point {
  x: number;
  y: number;
}

export const INPUT = {
  /** Píxeles que puede moverse el dedo y seguir contando como toque. */
  tapSlop: 10,
  keyPanSpeed: 900,
  wheelSensitivity: 0.0015,
  buttonZoomStep: 1.25,
} as const;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Factor de zoom de un pellizco entre dos mediciones. Devuelve 1 si no es fiable. */
export function pinchFactor(prevDistance: number, nextDistance: number): number {
  if (prevDistance < 1 || nextDistance < 1) return 1;
  return nextDistance / prevDistance;
}

/** Factor de zoom para un giro de rueda o gesto de trackpad. */
export function wheelFactor(deltaY: number): number {
  return Math.exp(-deltaY * INPUT.wheelSensitivity);
}

const PAN_KEYS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
};

export function isPanKey(code: string): boolean {
  return code in PAN_KEYS;
}

/** Dirección combinada de las teclas pulsadas, en píxeles de pantalla por segundo. */
export function keyPanVelocity(pressed: Iterable<string>): Point {
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    const dir = PAN_KEYS[code];
    if (dir) {
      x += dir.x * INPUT.keyPanSpeed;
      y += dir.y * INPUT.keyPanSpeed;
    }
  }
  return { x, y };
}
