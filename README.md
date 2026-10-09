# Empires-War

RTS histórico isométrico para navegador, single-player contra IA. Proyecto original inspirado en Age of Empires II: Definitive Edition; no contiene activos, código ni marcas de ese juego.

**Estado:** Bloque 0 — infraestructura y escena de prueba. Todavía no es jugable.

- Juego publicado: https://zc4m5vzgbp-netizen.github.io/Empires-War/
- Diseño: [`docs/MASTER_DESIGN.md`](docs/MASTER_DESIGN.md)
- Requisitos y estado: [`docs/REQUIREMENTS_MATRIX.md`](docs/REQUIREMENTS_MATRIX.md)
- Decisiones: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Hoja de ruta: [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/simulation` | Estado del mundo, reglas y reloj de ticks fijos. Sin Phaser ni navegador |
| `src/content` | Datos de juego tipados, con procedencia y estado (provisional/verificado) |
| `src/render` | Phaser 4: escena, proyección isométrica, cámara y arte provisional |
| `src/ui` | Interfaz Preact sobre el lienzo |
| `src/input` | Gestos táctiles, ratón y teclado |
| `src/persistence` | Formato de partida guardada |
| `tests` | Pruebas automáticas (`node:test`) |

## Comprobaciones

GitHub Actions ejecuta en cada cambio: `npm run typecheck`, `npm test`, `npm run build` y `npm run verify:dist`, y publica en GitHub Pages desde `main`.
