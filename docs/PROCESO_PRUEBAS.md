# Proceso de pruebas de Empires-War

Objetivo: que los errores los detecte el CI antes que el iPhone. Se amplía lo que ya existe; no hay herramientas nuevas.

## Lo que ya tenemos (y cuándo usar cada cosa)

| Capa | Herramienta existente | Qué detecta | Cuándo añadir una prueba |
|---|---|---|---|
| Lógica pura | `tests/*.test.ts` (node:test + tsx, `npm test`) | Simulación, economía, rutas, guardado, elección de sprites/transiciones, toque→entidad (`picking`) | Siempre que se cambie una regla o una función sin navegador |
| Integración (simulación + gráficos + toques) | `scripts/browser-smoke.mjs` (Playwright): **WebKit con perfil iPhone 15 Pro Max**, Chromium móvil y Chromium escritorio | El recorrido real del jugador: tocar → orden → efecto en la simulación → cambio en la interfaz | Cada acción nueva que haga el jugador (p. ej. paso 4b: oro, piedra y madera) |
| Visual | `screenshots.yml` → rama `capturas` | Fallos de dibujo (bordes, solapes, tamaños) | Al cambiar el arte; revisión por imagen |
| Vista previa | `preview.yml` → vista previa aislada | Prueba en iPhone sin tocar `main` | Antes de pedir una prueba manual |

El gancho `window.__EW_TEST__` (solo con `?test=1`) permite leer el mundo, centrar la cámara y convertir casillas en
coordenadas de pantalla. Para una prueba nueva normalmente basta con una función más en ese gancho.

## Reglas

1. **Función nueva:** debe tener una prueba automática de su comportamiento, no solo de que compile.
2. **Error corregido:** debe tener una prueba de regresión que falle sin el arreglo, con el nombre «regresión: …».
3. **Integración:** cada orden táctil nueva tiene un paso en la prueba de navegador. El paso toca el **dibujo** del objetivo (no el centro de la casilla), comprueba la orden en la simulación y el resultado (p. ej. +10 en la reserva). Si falla, el mensaje incluye la tarea, el aviso y la selección.
4. **PR terminado:** solo con CI en verde, o con cada fallo explicado en el PR. Ver `.github/pull_request_template.md`.
5. **Registro:** `docs/REQUIREMENTS_MATRIX.md` es el registro único de funciones terminadas, pendientes y comprobadas. «probado» exige citar la prueba; «iPhone» indica comprobación manual.
6. **Integración entre ramas:**
   - Antes de pedir revisión, se actualiza la rama con su rama base (p. ej. PR #8 con `feat/visual-gameplay-integration`) y se repiten las pruebas.
   - El CI de los PR prueba ya la combinación con la rama base.

## Mejora pequeña propuesta para el CI (sin implementar)

Hoy, si falla `npm test`, el CI se detiene y no ejecuta la prueba de navegador, así que se pierde información.
Propuesta: marcar el paso del navegador con `if: always()` tras la compilación, para que siempre se vean ambos resultados.
Es un cambio de una línea en `deploy.yml`; se deja para decidirlo en común porque afecta a todas las ramas.
