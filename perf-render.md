| Perfil | Suelo | Mapa | Arranque (ms) | Texturas suelo (MB) | Objetos | Árboles | FPS reposo | FPS desplazando (peor frame ms) | FPS zoom 0,35 (peor) | Texturas suelo tras zoom (MB) | Heap JS (MB) | Fallos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Chromium iPhone | antes (horneado) | 160 | 4820 | 213 | 5305 | 5168 | 14 | 12 (100) | 8 (183) | 213 | 26 | 0/3 |
| Chromium iPhone | después (bloques) | 160 | 2164 | 19 | 584 | 514 | 20 | 17 (83) | 14 (100) | 17 | 23 | 0/3 |
| WebKit iPhone | antes (horneado) | 160 | 2319 | 213 | 5305 | 5168 | 26 | 27 (47) | 25 (43) | 213 | NaN | 0/3 |
| WebKit iPhone | después (bloques) | 160 | 1848 | 19 | 584 | 514 | 27 | 25 (53) | 24 (47) | 21 | NaN | 0/3 |
| Chromium escritorio | antes (horneado) | 160 | 8145 | 213 | 5305 | 5168 | 6 | 4 (317) | 3 (567) | 213 | 28 | 0/3 |
| Chromium escritorio | después (bloques) | 160 | 5400 | 24 | 746 | 667 | 7 | 6 (233) | 4 (367) | 12 | 23 | 0/3 |

Ejecuciones: 3 por fila (1 en mapas ≥ 320). Navegador headless en GitHub Actions, sin GPU: no equivale a un iPhone físico.
