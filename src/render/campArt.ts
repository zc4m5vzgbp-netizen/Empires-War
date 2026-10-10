import type * as Phaser from 'phaser';

// Campamentos maderero y minero de 0 A.D. (Wildfire Games, CC-BY-SA 3.0). Atlas: public/assets/0ad-camps/.
// CONTRATO GRÁFICO: fotogramas «camp/lumberCamp» y «camp/miningCamp», dibujados para una huella de 2×2 casillas;
// el ancla de cada fotograma (en atlas.json) es el centro de la huella. Solo arte: las reglas de depósito y los costes
// son de la simulación (ChatGPT). Se precargan en la escena principal y se usan en el juego cuando están disponibles.

export const CAMP = 'camp';
export const CAMP_FRAMES = { lumberCamp: 'camp/lumberCamp', miningCamp: 'camp/miningCamp' } as const;
export type CampType = keyof typeof CAMP_FRAMES;
/** Huella (casillas) para la que se renderizó el dibujo. */
export const CAMP_DRAWN_TILES = 2;

export function preloadCampArt(scene: Phaser.Scene): void {
  const base = `${import.meta.env.BASE_URL}assets/0ad-camps/`;
  scene.load.atlas(CAMP, `${base}atlas.png`, `${base}atlas.json`);
}

/** Respeta el pivot del atlas de campamentos, sin consultar el atlas UH. */
export function campPivot(scene: Phaser.Scene, frame: string): { x: number; y: number } {
  const f = scene.textures.getFrame(CAMP, frame) as Phaser.Textures.Frame & { pivotX?: number; pivotY?: number; customPivot?: boolean };
  return f?.customPivot ? { x: f.pivotX ?? 0.5, y: f.pivotY ?? 0.5 } : { x: 0.5, y: 0.8 };
}
