# Arte militar: prototipo con 0 A.D. (rama `feat/military-art`, PR #11)

Solo es arte. No hay combate, daño, IA ni producción: esas mecánicas son de ChatGPT. Por eso el prototipo se ve en la galería (`?galeria=1`) y no en la partida normal.

## Fuentes y licencias

| Fuente | Licencia (verificada) | Uso |
|---|---|---|
| **0 A.D.**, Wildfire Games, https://github.com/0ad/0ad | CC-BY-SA 3.0 (`binaries/data/mods/public/art/LICENSE.txt`, copiado como `public/assets/0ad/LICENSE-0AD.txt`) | Espadachín, arquero y cuartel |
| Unknown Horizons | CC-BY-SA 3.0 | Se descartó para el ejército: su «soldado» (`as_groundunit0`) es el mismo porteador con otro nombre, sin armas ni armadura |

Los créditos están en `public/assets/0ad/CREDITS.md` y en el pie de la pantalla («arte: Unknown Horizons y 0 A.D.»).

## Cómo se genera (reproducible)

1. `scripts/art/zeroad.py fetch`: lee el actor XML de 0 A.D. y descarga solo los ficheros necesarios (161) desde un clon parcial. Recoge la malla con esqueleto, las texturas, los accesorios (cabeza, casco, arma, escudo, carcaj…) y las animaciones (Idle, Walk, attack_*, Death).
2. Workflow «Renderizar arte de 0 A.D.»: Blender 4.2 LTS en GitHub Actions, con Cycles en CPU.
   - Proyección ortográfica 2:1, la misma de nuestra cuadrícula.
   - 8 direcciones y sombra sobre el suelo.
   - Resultado: 401 imágenes en la rama `renders-0ad`.
3. `scripts/art/build-0ad-atlas.py`: reduce las imágenes a escala de juego y las recorta con un mismo rectángulo por unidad, para que los pies no salten.
   - Las empaqueta en `public/assets/0ad/atlas.png` y `atlas.json`, con el ancla de cada fotograma.
   - El atlas mide 2048×2048 y ocupa 1,6 MB.
4. `src/render/militaryArt.ts`: carga el atlas y crea las animaciones. Solo se carga con la galería.

## Qué funciona (comprobado)

- **Espadachín** (britano): quieto, andar, atacar (espada y escudo) y morir, en 8 direcciones, con 8 fotogramas por animación.
- **Arquero** (ateniense): quieto, andar, disparar con el arco y morir, en 8 direcciones.
- **Cuartel** (britano, tejado de paja) a la escala de 3×3 casillas.
- **Tamaño:** la figura queda cerca del tamaño del aldeano de Unknown Horizons, algo mayor.
- **Galería:** espadachines contra arqueros, una marcha en las 8 direcciones, muertes en bucle y unidades quietas.

## Pruebas

- `tests/military-art.test.ts` (6 pruebas):
  - fotogramas completos (2 unidades × 4 animaciones × 8 direcciones);
  - anclas;
  - escala de juego;
  - licencia y créditos.
- Tres son pruebas de regresión. Cada una falló con el atlas defectuoso antes de su arreglo:
  - **andar estático:** se tomaba el esqueleto equivocado;
  - **tamaño distinto entre animaciones:** las curvas del objeto cambiaban la escala;
  - **figura cortada por arriba:** el arco tocaba el borde del render.
- **Prueba de navegador, paso «galería militar»** (WebKit con perfil de iPhone):
  - el atlas carga;
  - existen las 64 animaciones;
  - no hay errores en la página;
  - FPS de la galería en CI: 60.
- `npm test`: 49 de 49 pruebas correctas.

## Problemas encontrados y corregidos durante el render

- Blender escalaba por la etiqueta `<unit>` de COLLADA, que 0 A.D. ignora: los accesorios salían diminutos y el cuartel gigante.
- Algunos ficheros traían una luz propia que proyectaba sombras enormes.
- El arco tiene esqueleto propio y se dejaba en una pose errónea. Ahora se usa en su pose de reposo.
- Las capas se omiten: tienen su propio esqueleto animado y quedarían rígidas.

## Pendiente

- **Colores de jugador:** van «horneados» en azul. Para el rival hace falta un segundo render (rojo) o una máscara para teñir.
- **Recibir daño:** 0 A.D. no tiene esa animación. Propuesta: un destello rojo de 0,15 s en el sprite, que se hará cuando exista el daño.
- **Faltan unidades y edificios:** milicia, lancero, caballería, arquería y establo. El proceso ya está listo: basta con añadir sus actores a `scripts/art/zeroad-config.json`. Lanceros britanos: `units/britons/infantry_spearman_*`. Caballería: `units/britons/cavalry_swordsman_*`, que necesita el esqueleto del caballo. Arquería y establo: `structures/britons/range.xml` y `structures/britons/stable.xml`.
- **Estilo:** 0 A.D. es Antigüedad (celtas, griegos), no medieval estricto. Para unidades más medievales habría que elegir otros actores o mods.
- **Tamaño del atlas:** 1,6 MB en PNG. Se podría reducir con WebP o bajando a 6 fotogramas por animación cuando sepamos cuáles hacen falta.
