# Campamentos maderero y minero (rama `feat/economy-camps-art`, PR #18)

Solo es arte. Las reglas de depósito, los costes y la construcción son de la simulación (ChatGPT). No se ha tocado `main` ni la rama candidata.

## Comprobación previa de huella y escala

- **Huella 2×2:** encaja. Los almacenes de 0 A.D. miden unas 12–18 unidades y se escalan para caber en 8 unidades (2 casillas de 4).
- **Escala respecto a la aldeana:** la aldeana mide 40 px y los campamentos, 134–151 px de ancho de imagen (128 px de rombo de huella). La proporción figura/edificio es de 0,31, frente a unos 0,26 en AoE II. No hay incompatibilidad.

## Contrato gráfico

| Fotograma | Huella | Tamaño | Ancla (fracción del fotograma) | Origen 0 A.D. |
|---|---|---|---|---|
| `camp/lumberCamp` | 2×2 | 151×110 px | (0,5 ; 0,6927) | `structures/celts/storehouse.xml` + montones de troncos |
| `camp/miningCamp` | 2×2 | 134×89 px | (0,4067 ; 0,5978) | `structures/britons/storehouse.xml` (con su mineral) + bloques de piedra |

- El ancla es el **centro de la huella**, igual que el cuartel.
- Atlas: `public/assets/0ad-camps/` (512×128 px, 37 KB, unos 0,25 MB de memoria gráfica). Créditos en su `CREDITS.md`.
- Código: `src/render/campArt.ts` (`CAMP`, `CAMP_FRAMES`, `CAMP_DRAWN_TILES`, `preloadCampArt`). Se carga solo con la galería.

## Cambios en el proceso de render (comunes)

- Los accesorios anclados a «root» conservan su posición real. Antes heredaban la escala de unidades del edificio: el tejado del silo celta flotaba. El cuartel se volvió a renderizar y no cambió.
- Accesorios extra por edificio (`extra_props`, con posición, giro y escala).
- Solo se renderizan las configuraciones cambiadas en el último commit, salvo que cambie el renderizador: unos 4 minutos en lugar de unos 25.
- El empaquetador detecta imágenes **recortadas por cualquier borde** (`touchesEdge`). Con los dos primeros renders (marco de 256 px) da `true` en ambos campamentos; con el actual (320 px), `false`.
- Se descartó `props/special/eyecandy/stone_pile.xml`: es un COLLADA 1.4.0 con eje Y arriba y no aparecía bien.
- Se quitó `scripts/art/__pycache__/…pyc`, que había entrado por error en el PR #11.

## Pruebas ejecutadas

- `npm test` en local: **60/60**, de las cuales 5 son de este PR (`tests/camps-art.test.ts`):
  - contrato;
  - escala de 2×2 y anclas;
  - sin recortes (regresión: la métrica marcaba `true` con los renders defectuosos);
  - tamaño del atlas;
  - licencia.
- Prueba de navegador y capturas: en GitHub Actions (ver el PR).

## Pendiente o a decidir

- **Parecido entre los dos:** ambos son almacenes de 0 A.D. El maderero también tiene unos bloques claros de su propio modelo. Se distinguen por los troncos frente al mineral y la grúa, pero no tanto como en AoE II.
- **Color de jugador:** las zonas de color van fijas en azul (pendiente general).
- **Sin estado «en construcción»:** la base actual (cimientos) sirve mientras tanto.
- **Sin probar en un iPhone físico.**
