# Evaluación técnica: Age of AI como base de Empires-War

Fecha: 2026-10-09. **Estado: inspección estática; prueba de ejecución aún pendiente.**

## Fuente y licencia
- Original: https://github.com/alexvilelabah/age-of-ai
- Licencia MIT (copyright 2026 alexvilelabah). Si reutilizamos partes, conservar aviso de licencia y copyright.
- Archivos inspeccionados directamente en GitHub: README.md, LICENSE, package.json, shared/package.json, server/package.json, client/package.json, server/src/index.ts, server/src/game/{room,ai,mapgen,path,state}.ts, client/src/main.ts, DEPLOY.md.

## Hallazgos comprobados en el código
- `server/src/game/path.ts`: cuadrícula y A*; no importa Node ni WebSocket. **Candidato de extracción directa.**
- `server/src/game/mapgen.ts`: generación de mapa con PRNG de semilla y dependencias de `@age/shared`, `path`, `state`. **Candidato de extracción.**
- `server/src/game/state.ts`: tipos/constructores de entidades con dependencia de `@age/shared`. **Candidato de extracción.**
- `server/src/game/ai.ts`: IA que usa `Game` de `room.ts` como tipo y módulos de simulación; **requiere trasladar contrato de Game**.
- `server/src/game/room.ts`: clase exportada `Game` y dependencias de shared/ai/mapgen/path/state; no importa `node:*` ni `ws`, pero contiene `setInterval` y coordina comandos, ticks, callbacks y snapshots. **Posible ejecución en navegador, no probada.**
- `server/src/index.ts`: HTTP/WebSocket, lobby y distribución de mensajes; **no portar para modo local de un jugador**.
- `client/src/main.ts`: flujo de pantallas ligado a `Net`, lobby y mensajes; **no sustituir nuestra UI sin evaluación adicional**.
- `DEPLOY.md`: el producto original necesita servidor Node para su arquitectura multijugador.

## Decisión de arquitectura propuesta
Portar primero la **simulación**, no el juego entero. Mantener render, controles táctiles y persistencia de Empires-War hasta tener una demostración comparativa. Ejecutar `Game` localmente con un adaptador que reemplace transporte de mensajes por callbacks en memoria; separar temporizador de ticks de lógica de partida. No modificar el sistema de guardado de Claude.

## Prueba de aceptación pendiente (obligatoria antes de migrar)
1. Compilar los módulos `shared` + `server/src/game` en un proyecto Vite aislado, sin imports de Node en el bundle.
2. Crear una partida con jugador humano y bot, generar mapa, ejecutar >=1000 ticks y validar que no hay excepciones.
3. Enviar comandos de selección/órdenes (movimiento, recolectar, construir), comprobar economía e IA.
4. Serializar y restaurar un estado; comparar resultados tras otros 100 ticks para evaluar guardado persistente.
5. Ejecutar en Safari iPhone, medir FPS, memoria, controles y pausa al cambiar de aplicación.
6. Comparar esfuerzo real de integración frente al motor actual; **solo entonces decidir migración**.

## Riesgos
- La clase `Game` concentra mucha lógica (~86 KB de fuente); desacoplarla puede costar más que reutilizar módulos selectivos.
- La IA tiene dependencia del contrato `Game`.
- La simulación original avanza en servidor y no está demostrado que su estado sea restaurable sin trabajo adicional.
- Las mecánicas y reglas de Empires-War (imperios persistentes, varios guardados, cuatro edades con evolución visual, móvil) no quedan resueltas por copiar el repositorio.
- El entorno de ejecución local de esta evaluación no logró resolver github.com; **no se ejecutó ni se compiló código externo**.

## Regla de protección
No fusionar esta rama, no tocar `feat/cloud-save-auth` ni PR #3 y no sustituir código del juego hasta completar la prueba funcional.
