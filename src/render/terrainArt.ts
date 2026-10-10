import { TerrainKind } from '../content/terrain.ts';

// Elección del fotograma de suelo con transiciones (arte de Unknown Horizons). Pura: sin Phaser, probada en tests.
//
// Convención de las casillas de transición de UH, comprobada sobre las imágenes:
// - straight r: el terreno «de borde» ocupa el lado r (45 = arriba-derecha, 135 = arriba-izquierda,
//   225 = abajo-izquierda, 315 = abajo-derecha).
// - curve_in r: ocupa dos lados que se juntan en una esquina (45 = derecha, 135 = arriba, 225 = izquierda, 315 = abajo).
// - curve_out r: ocupa solo la punta de esa esquina.
// «gb» = arena con borde de hierba; «bs» = agua con orilla de arena.

type At = (x: number, y: number) => number | undefined;

const isGreen = (k: number) => k === TerrainKind.Grass || k === TerrainKind.Forest;
const isLand = (k: number) => k !== TerrainKind.Water;

/** Vecino por lado: arriba-derecha (x, y-1), arriba-izquierda (x-1, y), abajo-izquierda (x, y+1), abajo-derecha (x+1, y). */
const SIDES = [
  [45, 0, -1],
  [135, -1, 0],
  [225, 0, 1],
  [315, 1, 0],
] as const;
/** Esquina (curvas): derecha (x+1, y-1), arriba (x-1, y-1), izquierda (x-1, y+1), abajo (x+1, y+1). Lados que la forman. */
const CORNERS = [
  [45, 1, -1, 45, 315],
  [135, -1, -1, 135, 45],
  [225, -1, 1, 225, 135],
  [315, 1, 1, 315, 225],
] as const;

/**
 * Terreno tal como se dibuja: la hierba que toca agua se pinta como arena de orilla (solo aspecto; ambas son
 * transitables). Así entre hierba y agua siempre hay arena, como en el arte de UH, y no aparecen escalones oscuros.
 */
function visual(at: At): At {
  return (x, y) => {
    const k = at(x, y);
    if (k === undefined || !isGreen(k)) return k;
    for (const [, dx, dy] of [...SIDES, ...CORNERS]) if (at(x + dx, y + dy) === TerrainKind.Water) return TerrainKind.Dirt;
    return k;
  };
}

export function groundFrame(rawAt: At, x: number, y: number, grassVariant: number): string {
  const at = visual(rawAt);
  const kind = at(x, y) ?? TerrainKind.Grass;
  const grass = `tile/grass/${grassVariant}`;
  if (kind === TerrainKind.Grass || kind === TerrainKind.Forest) return grass;
  const base = kind === TerrainKind.Water ? 'tile/water/0' : 'tile/dirt/0';
  const prefix = kind === TerrainKind.Water ? 'bs' : 'gb';
  const edge = kind === TerrainKind.Water ? isLand : isGreen;
  // Fuera del mapa cuenta como el mismo terreno (sin transición).
  const test = (nx: number, ny: number) => {
    const k = at(nx, ny);
    return k !== undefined && edge(k);
  };
  const sides = new Map<number, boolean>(SIDES.map(([r, dx, dy]) => [r, test(x + dx, y + dy)]));
  const count = [...sides.values()].filter(Boolean).length;

  if (count === 0) {
    for (const [r, dx, dy] of CORNERS) if (test(x + dx, y + dy)) return `${prefix}/curve_out/${r}`;
    return base;
  }
  const adjacent = CORNERS.find(([, , , a, b]) => sides.get(a) && sides.get(b));
  if (count >= 3 || (count === 2 && !adjacent)) {
    // Arena casi rodeada de hierba: se dibuja como hierba (solo aspecto; la casilla sigue siendo transitable).
    if (kind === TerrainKind.Dirt) return grass;
    // Agua estrecha: se usa la mejor aproximación disponible (una esquina u orilla).
    return adjacent ? `${prefix}/curve_in/${adjacent[0]}` : `${prefix}/straight/${SIDES.find(([r]) => sides.get(r))![0]}`;
  }
  if (count === 2) return `${prefix}/curve_in/${adjacent![0]}`;
  return `${prefix}/straight/${SIDES.find(([r]) => sides.get(r))![0]}`;
}
