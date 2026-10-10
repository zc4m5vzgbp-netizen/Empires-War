# Receta de integración visual: aldeana y campamentos (Claude, 10 de octubre de 2026)

Esta receta reproduce en la rama de ChatGPT la integración visual que se aprobó en la auditoría. **No es un PR para fusionar.** Es una referencia comprobada: la rama `audit/claude-integration-recipe` aplica exactamente lo que aquí se describe sobre la versión **actual** de #19 (c75b969) y el CI pasa.

## Evidencia de que la receta funciona

| Prueba | Resultado |
|---|---|
| Unitarias en local | 70/70 |
| CI «Comprobar y publicar», ejecución 38076689613, commit 64ee5f0 | Verde: typecheck, 70 pruebas, compilación y smoke |
| Smoke en navegador | Sin errores en WebKit móvil, Chromium móvil (perfil iPhone 15 Pro Max), escritorio y galería |
| Paso 4c del smoke | La aldeana usa el atlas `eco` y anima. La vista previa del campamento usa `camp/lumberCamp`. El campamento terminado se dibuja con su atlas. Un toque sobre el tejado lo selecciona. |
| Capturas, ejecución 38076691119 (rama `capturas`, «Capturas de 64ee5f0») | 15: panel · 16: vista previa · 17: campamento |

## Paso 1. Incorporar el arte: fusionar el PR #20

El PR #20 contiene #18, que a su vez incluye #13 y #11. Fusionarlo en #19 no produce conflictos (comprobado sobre c75b969).

**No copiéis los PNG a mano:** fusionad con git, así se conservan los blobs y su SHA.

Archivos que entran:

| Archivo | Tamaño | Para qué |
|---|---|---|
| `public/assets/0ad-villager/atlas.png` | 2.126.524 B | Atlas de la aldeana: 680 fotogramas de 64×78, ancla (0,5; 0,6905) |
| `public/assets/0ad-villager/atlas.json` | 142.287 B | Fotogramas, anclas y medidas de calidad (`edgeCuts`, `walkDistinct`…) |
| `public/assets/0ad-villager/CREDITS.md`, `LICENSE-0AD.txt` | — | Licencia CC-BY-SA 3.0 (Wildfire Games) |
| `public/assets/0ad-camps/atlas.png` | 38.095 B | `camp/lumberCamp` (151×110, ancla 0,5; 0,6927) y `camp/miningCamp` (134×89, ancla 0,4067; 0,5978) |
| `public/assets/0ad-camps/atlas.json`, `CREDITS.md`, `LICENSE-0AD.txt` | — | Ídem |
| `public/assets/0ad/*` | 1,68 MB | Arte militar: solo se carga en la galería (`?galeria=1`) |
| `src/render/militaryArt.ts`, `src/render/gallery.ts` (cambios) | — | Galería |
| `scripts/art/*` (`zeroad.py`, `build-0ad-atlas.py`, `*.json`), `.github/workflows/render-0ad.yml` | — | Proceso reproducible de render y empaquetado |
| `tests/villager-art.test.ts`, `tests/camps-art.test.ts`, `tests/military-art.test.ts` | — | Contrato de nombres, anclas, recortes y licencias |

Archivos compartidos que la fusión toca, revisados uno a uno (no pisan nada de #19):
- **`src/ui/App.tsx`:** solo cambia el pie de créditos («Unknown Horizons y 0 A.D.»).
- **`src/main.ts`:** añade los ganchos de prueba `textures`, `militaryAnimCount` y `villagerAnimCount`.
- **`src/render/GameScene.ts`:** precarga de la galería e import de los módulos de arte.
- **`src/render/art.ts`:** `pivot()` admite una textura opcional.
- **`.gitignore`:** añade `__pycache__/` y `*.pyc`.
- **`.github/workflows/preview.yml`:** añade la vista previa de `feat/military-art`; es inofensivo.

`src/render/villagerArt.ts` y `src/render/campArt.ts` ya existen en #16/#19 con un contenido idéntico al de #18. La fusión no da conflicto, pero no los editéis por separado en las dos ramas.

## Paso 2. Cambios de código (122 líneas añadidas y 21 quitadas en 7 archivos; parche adjunto `receta-integracion-visual.patch`)

### 2.1 `src/render/art.ts`: textura por edificio

```ts
import { CAMP, CAMP_DRAWN_TILES, CAMP_FRAMES } from './campArt.ts';

export interface BuildingArt { frame: string; drawnSize: number; anim?: string; /** Textura (atlas); por defecto ART. */ texture?: string }
export const ART_BUILDINGS: Partial<Record<BuildingType, BuildingArt>> = {
  townCenter: { frame: 'bld/townCenter', drawnSize: 3 },
  mill: { frame: 'bld/mill/0', drawnSize: 2, anim: 'bld/mill' },
  lumberCamp: { frame: CAMP_FRAMES.lumberCamp, drawnSize: CAMP_DRAWN_TILES, texture: CAMP },
  miningCamp: { frame: CAMP_FRAMES.miningCamp, drawnSize: CAMP_DRAWN_TILES, texture: CAMP },
};

/** Arte de atlas de un edificio, solo si su textura está cargada; si no, undefined (arte provisional). */
export function buildingArt(scene: Phaser.Scene, type: BuildingType): (BuildingArt & { texture: string }) | undefined {
  const a = ART_BUILDINGS[type];
  const texture = a?.texture ?? ART;
  if (!a || !scene.textures.exists(texture) || !scene.textures.get(texture).has(a.frame)) return undefined;
  return { ...a, texture };
}
```

Si el atlas no llega a cargar, `buildingArt` devuelve `undefined` y el juego usa los dibujos de reserva de #19 (`entityTextures.ts`). No hace falta nada más.

### 2.2 `src/render/entityView.ts`: el edificio usa su textura y su ancla

- **Import:** cambiar `ART_BUILDINGS` por `buildingArt`.
- **En `create()`**, sustituir el bloque `if (this.art && e.type in ART_BUILDINGS)` por:
  ```ts
  const a = this.art ? buildingArt(this.scene, e.type) : undefined;
  if (a) {
    const o = pivot(this.scene, a.frame, a.texture);   // ancla del atlas correcto
    return { kind: e.kind,
      main: add.sprite(0, 0, a.texture, a.frame).setOrigin(o.x, o.y).setScale(size / a.drawnSize),
      foundation: add.image(0, 0, foundationKey(size)), ring: add.image(0, 0, outlineKey(size)).setVisible(false) };
  }
  ```
- **En `sync()`:** `const anim = this.art ? buildingArt(this.scene, e.type)?.anim : undefined;`
- **Gancho de prueba nuevo:** `debugView(id)`, que devuelve `{ texture, frame, anim, depth }`.

La posición y la profundidad no cambian: centro de la huella y esquina delantera (`c.y + size·16`). El ancla del atlas de campamentos es justamente el centro de la huella 2×2, así que encaja sin ajustes. La captura 17 muestra la profundidad correcta frente al Centro urbano.

### 2.3 `src/render/GameScene.ts`: precarga, animaciones y vista previa

- **`preload()`**:
  ```ts
  preloadArt(this);
  preloadVillagerArt(this);   // aldeana: parte de la partida
  preloadCampArt(this);       // campamentos: parte de la partida
  if (galleryEnabled()) preloadMilitary(this);   // militar: sigue perezoso
  ```
- **`create()`:** llamar a `createVillagerAnimations(this)` siempre, no solo con la galería. Sin atlas, la función no crea nada y devuelve 0.
- **`updateGhost()`:** usar `buildingArt(this, placing.building)` y `this.ghost.setTexture(a.texture, a.frame)` con `pivot(this, a.frame, a.texture)`.
- **Ganchos de prueba nuevos:** `debugView(id)` y `debugGhost()`, que devuelve `{ visible, texture, frame }`.

### 2.4 `src/main.ts`: ganchos de prueba (solo con `?test=1`)

```ts
findPlacementFor: (type: BuildingType, x: number, y: number) => findPlacementNear(world, type, x, y),
viewInfo: (id: number) => scene?.debugView(id) ?? null,
ghostInfo: () => scene?.debugGhost() ?? null,
```

Además hay que importar `type BuildingType` desde `./content/economy.ts`.

### 2.5 `src/render/campArt.ts`: solo el comentario

Quitar «De momento solo se cargan con la galería».

### 2.6 Animaciones y anclas de la aldeana: no hay que hacer nada

Lo que ya hizo #16 funciona en cuanto se carga el atlas `eco`:
- `villagerVisualState.ts` traduce cada tarea a su animación;
- `entityView.ts:74-80` y `:153-163` dibujan y animan a la aldeana;
- el centro táctil está en `VILLAGER_BODY_OFFSET = 19`.

El smoke lo confirma: `eco/villager/walk/90` y `idle/315` en la partida normal, y selección de la aldeana con un toque.

## Paso 3. Ajustes de pruebas

| Archivo | Cambio | Motivo |
|---|---|---|
| `scripts/browser-smoke.mjs` | `requested.filter((u) => u.includes('/assets/0ad'))` → `'/assets/0ad/'` | Sin la barra, el filtro también encuentra `0ad-villager` y `0ad-camps`, y falla aunque el arte militar siga sin cargarse. |
| `scripts/browser-smoke.mjs` | Paso **4c**, después de 4b (lo hay en el parche) | Comprueba de verdad la integración visual: textura de la aldeana y su animación, botón de campamento ≥ 44 px y dentro de la pantalla, vista previa con atlas (se **espera** al siguiente fotograma, sin leer una sola vez), cimiento → terminado con el atlas `camp`, y toque en el tejado (40 px por encima del centro) → selección. |
| `scripts/screenshots.mjs` | Capturas 15–17 de iPhone (panel, vista previa, campamento) | Revisión visual |

En el paso 4c, el toque sobre el tejado se hace **después de «Quitar selección»**. Con un aldeano seleccionado, tocar el campamento da una orden en lugar de seleccionarlo; es lo esperado, no un fallo.

Pruebas unitarias: no hay que cambiar ninguna. Las de #18 y #20 entran con la fusión.

## Fallos visuales que siguen abiertos

| ID | Fallo | Evidencia | Responsable |
|---|---|---|---|
| I-5 | Con un aldeano seleccionado, el panel ocupa unos 440 de 932 px (≈47 %) en iPhone: tres botones de construir y «Quitar selección», todos apilados. | Captura 15 de 64ee5f0, a la izquierda en `trio-receta.png` | ChatGPT (UI) |
| I-7 | Arte militar (#11): la animación de muerte corta el cuerpo tumbado en 49 renders, y hay 176 sombras cortadas. No afecta a la partida: el arte militar solo se ve en la galería. | Medición sobre `renders-0ad` (informe de auditoría) | Claude, tras la congelación |
| I-8 | El FPS de un solo smoke en CI no sirve para comparar. En Chromium, el FPS final fue 14 en el PR #20 (donde la partida ni siquiera carga los atlas nuevos), en la rama de auditoría (bcf91af) y en la receta (64ee5f0). En cambio fue 34 en 5109794, que tiene el mismo código de juego que bcf91af (solo cambian ganchos de diagnóstico que el smoke no usa). El A/B de 3 ejecuciones no muestra diferencia con o sin atlas. | Ejecuciones 38074073893, 38075009836 y 38076689613; diagnóstico 38075002179 | Proceso: comparar medianas, no ejecuciones sueltas |
| M-1 | La punta de la azada o del pico roza el encuadre en 16 de 680 fotogramas (≤ 3,5 px en pantalla). | `atlas.json` → `meta.edgeCuts.villager.opaque = 16`; la prueba impide que crezca | Claude (requiere volver a renderizar) |
| M-2 | Al recolectar o construir, la aldeana mira hacia su último paso, no hacia el objetivo. | [INSPECCIÓN] `entityView.ts:156` | Integración. Propuesta sin probar: con `phase === 'gathering'` o `'building'`, `view.dir = dirFromTileDelta(target.x - e.x, target.y - e.y)` |
| M-3 / M-4 | El ancla de la aldeana está duplicada como constante y `VillagerVisualAction` duplica el tipo `VillagerAnim`. | [INSPECCIÓN] `villagerVisualState.ts:5,10` | Integración: usar `pivot(scene, frame, ECO)` y `import type { VillagerAnim }` |
| M-5 | `VILLAGER_BODY_OFFSET = 19` también se aplica al arte de reserva, pensado para 16. | [INSPECCIÓN] `entityTextures.ts:16` | Integración. Solo importa si el atlas no carga |
| M-6 | Los ~11 px por lado en que el dibujo del campamento maderero sobresale de la huella no responden al toque. | [INSPECCIÓN] 151 px de arte frente a 128 px de huella | Aceptable; anotado |
| M-7 | El panel tapa la línea de créditos del pie («… Unknown Horizons y 0 A»). | Capturas 15 y 16 de 64ee5f0 | ChatGPT (UI). La atribución completa sigue en `CREDITS.md` |
| — | El campamento **minero** no se ha probado dentro de la partida: no hay madera para un segundo campamento en el recorrido del smoke. | El smoke 4c solo cubre el maderero | Pendiente |
| — | La mina de piedra queda tapada por `panel-actions` en la cámara inicial. Es el VIS-07 ya conocido, que el panel plegable resuelve. | Diagnóstico del smoke: `stoneMine: "panel-actions"` | Ya conocido |
| — | El color de jugador azul va fijo en el arte. El oro se ve como mineral oscuro. | Contrato de #13 | Pendientes acordados, sin resolver |

## Lo que no está probado

- iPhone físico: FPS, memoria y Safari real.
- La memoria GPU adicional, unos 16 MB, es una **estimación**.
- Guardar y cargar con un campamento construido.
- El depósito real de recursos en los campamentos (lógica de ChatGPT).
- El campamento minero en la partida.


## Actualización del 10 de octubre por la tarde: estabilidad del paso 4c

Al repetir el CI aparecieron dos fallos intermitentes **de la prueba**, no del juego:
- **WebKit:** la vista previa no llegó a ser válida. Causa probable: el aldeano del paso 4b sigue talando y pisa la huella entre la búsqueda del sitio y el toque, y `canPlaceBuilding` rechaza el sitio («Hay una unidad en el sitio»). Ahora la prueba reintenta hasta 3 veces y anota el motivo.
- **Chromium:** el toque seleccionó el Centro Urbano (#1). El campamento había quedado justo detrás del Centro Urbano, y el toque, 40 px por encima, caía sobre el dibujo del Centro Urbano, que está delante. Ahora el campamento se coloca delante (sureste) del Centro Urbano, y el toque va a 24 px sobre el centro de la huella. Si vuelve a fallar, la prueba informa de qué se seleccionó y dónde estaban los aldeanos.

Ejecuciones: 38079686193, en verde en WebKit y Chromium, más una repetición para comprobar estabilidad.
