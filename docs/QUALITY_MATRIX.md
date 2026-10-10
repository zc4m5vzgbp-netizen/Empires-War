# Matriz de calidad — Empires-War

Estados: **Por verificar** = no hay evidencia suficiente en esta rama; **Pendiente** = no implementado; **Confirmado** = probado con comando/resultado documentado. No confundir existencia de código con prueba satisfactoria.

| Área | Criterio de aceptación | Prueba / ubicación | Estado |
| --- | --- | --- | --- |
| Mundo | Misma semilla, mismo mapa y hash | `tests/simulation.test.ts` | Por verificar |
| Recursos | Existen comida, madera, oro y piedra | `tests/economy.test.ts` | Por verificar |
| Recolección | Orden → ruta → carga → depósito correcto para cada recurso | `tests/economy.test.ts`; añadir casos por recurso | Por verificar |
| Piedra táctil | Tocar mina seleccionada emite orden, aldeano se mueve y deposita piedra | `src/render/picking.ts`; prueba Playwright pendiente | Pendiente |
| Carga visual | No mostrar bayas al transportar oro, piedra o madera | `src/render/entityView.ts`; prueba visual pendiente | Por verificar |
| Construcción | Costos, colocación, progreso y finalización | `tests/economy.test.ts` | Por verificar |
| Producción | Crear aldeanos desde Centro Urbano con costo/tiempo | prueba pendiente | Pendiente |
| Combate | Ataque, daño, muerte, objetivos | prueba pendiente | Pendiente |
| IA | Recolección y producción sin trampas | prueba pendiente | Pendiente |
| Guardado | Serialización y carga sin corrupción | `tests/simulation.test.ts` y persistencia | Por verificar |
| iPhone | Selección, movimiento, cámara y controles táctiles | `scripts/browser-smoke.mjs` WebKit y dispositivo real | Por verificar |
| Rendimiento | Pruebas repetibles con poblaciones grandes | benchmark pendiente | Pendiente |

## Registro de regresiones
- **Piedra inmóvil (reportado en iPhone):** aldeano no inicia movimiento al tocar mina; causa aún sin confirmar. Añadir prueba de selección/orden/ruta y corregir en rama de jugabilidad o interfaz según causa.
- **Oro con bayas (reportado en iPhone):** la simulación depositaba oro, pero animación de carga reutilizaba comida. Revisar render actualizado y validar en navegador.
- **Minas sobre tierra:** las pruebas no deben exigir hierba cuando el terreno es transitable; comprobar la corrección de la rama de integración.

## Evidencia por PR
Añadir fecha, commit, comandos realmente ejecutados, resultados y limitaciones. No marcar **Confirmado** por declaración de otro agente.
