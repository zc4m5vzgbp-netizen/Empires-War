# Recursos del mapa y transiciones (rama `feat/map-resources-art`, PR #8)

Base: `feat/visual-gameplay-integration` (PR #7). Solo cambian `src/render/`, el atlas, el script del atlas, pruebas
y el workflow de vista previa. No cambia la simulación, la economía, la producción, el combate, la IA ni el guardado.

## Cambios

| Recurso | Antes | Ahora (arte de Unknown Horizons, CC-BY-SA 3.0) |
|---|---|---|
| Madera | Arbusto teñido de verde | Árbol de UH; variante estable por entidad (10 tipos). Se puede tocar también por la copa |
| Oro | Arbusto teñido de amarillo | Montón del yacimiento de piedra de UH con las rocas recoloreadas en oro (derivado) |
| Piedra | Arbusto teñido de gris | Montón central del yacimiento de piedra de UH, con bordes fundidos con la hierba (derivado) |
| Bayas | Dibujo provisional propio | Copa de un arce de UH reducida a arbusto, con bayas dibujadas (derivado) |

- **Transiciones:**
  - Las casillas de UH `ts_grass-beach0` (hierba ↔ arena) y `ts_beach-shallow0` (agua con orilla de arena) se eligen según los vecinos: recta, esquina interior y esquina exterior.
  - Lo decide `src/render/terrainArt.ts`, una función pura con pruebas.
  - Una arena casi rodeada de hierba se dibuja como hierba; es solo aspecto y la casilla sigue siendo transitable.
- **Orillas:** UH dibuja la arena y el agua unos píxeles más abajo que la hierba, con un pequeño escalón, y en su arte siempre hay arena entre la hierba y el agua. Por eso la hierba que toca agua se pinta como arena de orilla (solo aspecto; ambas son transitables) y desaparecen los escalones oscuros.
- **Dirección de los aldeanos:** comprobada sobre los sprites del porteador (0° = derecha, 90° = de espaldas, 270° = de frente). La correspondencia que ya usaba el juego era correcta; ahora la cubre una prueba (`tests/visual.test.ts`).
- **Atlas:** 221 fotogramas, 1024×2048, 812 KB (antes 194 fotogramas, 1024×1024, 700 KB).

## Resultados

- `tsx --test`: 43 pruebas, 42 pasan (incluidas las 3 nuevas de `tests/visual.test.ts`). **La que falla ya fallaba en la rama base del PR #7** («Escenario: … 6 arbustos»: espera 6 recursos y ahora hay 14 por la economía de cuatro recursos). Es del área de simulación y no la he tocado.
  - Por ese fallo, el CI del PR («Comprobar y publicar») se detiene en «Pruebas» y no llega a la prueba de navegador.
- **Prueba de navegador** (workflow «Vista previa aislada», que hace typecheck y la prueba completa):
  - correcta en Chromium y WebKit con perfil de iPhone y en Chromium de escritorio;
  - 403 objetos en escena.
- Capturas: rama `capturas`.

## Pendiente

- Arreglar el test del escenario en el PR #7 (responsabilidad de jugabilidad).
- El oro es un recoloreado. Si se quiere una mina de oro con más carácter, podría renderizarse a partir de 0 A.D.
- Los árboles agotados desaparecen. UH tiene tocones (`as_treestumps`) que podrían mostrarse si la simulación conserva la casilla.
- Falta probar en un iPhone el rendimiento con las transiciones (el suelo se pinta una vez, así que no debería cambiar).
