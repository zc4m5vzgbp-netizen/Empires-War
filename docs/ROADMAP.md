# Hoja de ruta — Empires-War

Bloques del documento maestro v2 (§11). Un bloque solo se da por terminado si el usuario puede realizar las acciones en el juego publicado y ver el resultado; nunca por una pantalla estática.

Criterios comunes a todos los bloques: lista de requisitos de `REQUIREMENTS_MATRIX.md` actualizada, typecheck, pruebas y build en verde en GitHub Actions, URL publicada comprobada, prueba manual en iPhone y PC, errores conocidos y riesgos documentados.

## Bloque 0 — Infraestructura y publicación (aceptado por el usuario el 9 de octubre de 2026)

Entrega: repositorio, Vite + TypeScript + Phaser 4 + Preact, módulos separados, pruebas de humo, GitHub Actions y GitHub Pages bajo `/Empires-War/`, escena isométrica de prueba con cámara táctil y de PC.

Criterios de aceptación:
- El workflow pasa typecheck, pruebas, build y verificación de rutas.
- La URL publicada carga en iPhone y PC.
- Se puede mover el mapa (arrastre, teclado) y hacer zoom (pellizco, rueda, botones).
- La pantalla dice claramente que es una escena de prueba.
- La simulación compila y se prueba sin Phaser ni navegador.

## Bloque 1 — Primer vertical slice jugable (entregado; pendiente de aceptación del usuario)

Entrega: mapa isométrico pequeño, selección, órdenes de movimiento, un aldeano, un recurso recolectable, un edificio de depósito, reserva común, una construcción de prueba, guardado y carga. IA ausente o dummy rotulada.

Criterios de aceptación:
- Tocar el aldeano lo selecciona; tocar el suelo lo mueve, rodeando obstáculos.
- Tocar el recurso con el aldeano seleccionado inicia el ciclo recolectar → transportar → depositar, y el contador global sube solo al depositar.
- Construir el edificio de prueba descuenta la reserva común y funciona como depósito al terminar.
- Guardar y cargar devuelve exactamente la misma partida; el mundo no avanza mientras se escribe; si estaba en pausa, sigue en pausa.
- Todos los valores numéricos rotulados como provisionales.
- Pruebas automáticas de la simulación para cada acción anterior.

Estado de la entrega: todos los criterios anteriores tienen prueba automática y prueba en navegador (Chromium y WebKit con perfil de iPhone, Chromium de escritorio). Informe: `docs/reports/BLOQUE_1.md`.

## Bloque 2 — Economía clásica completa

Cuatro recursos, tareas de aldeanos, granjas y resembrado, edificios de depósito, construcciones, población, producción, costes reales validados con versión documentada y rutas.

## Bloque 3 — Edades y tecnologías

Cuatro edades, edificios y requisitos, árbol de la primera civilización y pruebas de balance; cancelaciones según AoE II DE.

## Bloque 4 — Combate terrestre y niebla

Unidades, órdenes, formaciones, combate, visión propia y de IA, minimapa con «Ver por relación», daños y reparación, reacción de aldeanos.

## Bloque 5 — IA y partida completa

Economía de IA, defensa y ataque, dificultad, configuración de partida, victoria y derrota con las excepciones del §3, diplomacia clásica y comercio terrestre.

## Bloque 6 — Contenido y acabado

Más civilizaciones, datos completos verificables, gráficos originales optimizados, accesibilidad, rendimiento, guardados robustos, QA de dispositivos y matriz de fidelidad.

Los bloques pueden subdividirse si el trabajo lo requiere, conservando requisitos y dependencias.
