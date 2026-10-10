---
name: rts-delivery-orchestrator
description: Orquesta entregas verticales verificables de Empires-War; evita requisitos olvidados, código incompleto y reportes de éxito sin evidencia.
---
# RTS Delivery Orchestrator

## Propósito
Convertir requisitos de `docs/REQUIREMENTS_MATRIX.md` en funcionalidades jugables, probadas y trazables. Coordinar ramas de Claude (arte) y ChatGPT (simulación, interfaz e integración). **Nunca sustituye la ejecución real de pruebas.**

## Activación
Activar al planear, implementar, integrar, validar o cerrar una característica que abarque más de un subsistema, o cuando se reciba un informe de otra IA. En tareas pequeñas aplicar solo las Skills especializadas pertinentes. Leer `AGENTS.md`, la matriz y `docs/DELIVERY_LEDGER.md`.

## Contrato de entrega: ocho puertas
1. **Inventario:** identificar IDs exactos de la matriz, dependencias y estado inicial; no inferir requisitos ausentes.
2. **Contrato:** escribir entradas, salidas, estados, interfaz arte↔simulación, reglas de error y criterios observables.
3. **Propietario:** asignar responsable y rama por archivo/subsistema; Claude no edita la simulación principal y ChatGPT no altera sus ramas.
4. **Implementación:** enlazar commits y archivos concretos; registrar decisiones y cambios fuera de alcance.
5. **Pruebas:** unitarias, integración y móvil según riesgo; incluir al menos un caso negativo y una regresión cuando haya bug.
6. **Integración:** comparar SHAs, conflictos, recursos/licencias y cambios perdidos; nunca fusionar `main` sin aprobación explícita.
7. **Verificación:** comprobar que el jugador puede ejecutar la función de extremo a extremo; CI verde por sí solo no basta para afirmar compatibilidad con iPhone físico.
8. **Cierre:** actualizar ledger y matriz; marcar `verified` solo con evidencia reproducible. Si falta alguna puerta, estado `blocked` o `partial`, no `done`.

## Algoritmo anti-olvidos
- Descomponer cada requisito en casos atómicos con ID estable (`ECO-06.a`, `ECO-06.b`, etc.).
- Mantener para cada caso: owner, branch, dependencias, archivos, pruebas, evidencia, estado y siguiente acción.
- Antes de reportar progreso, comparar lista original contra casos `verified`, `partial`, `blocked`, `not-started`; **ningún caso desaparece del reporte**.
- Si una IA informa "todo listo", cotejar archivos/commits, pruebas ejecutadas y criterios originales. Reportar discrepancias sin atribuir mala fe.
- Ante ambigüedad, documentar decisión pendiente y no inventar balance ni funciones.
- Elegir Skills auxiliares según riesgo: móvil, rendimiento, PR, guardado, combate, arte/licencias.
- No generar más documentación que la necesaria para ejecutar y verificar la tarea.

## Ejercicio de aceptación obligatorio
Escenario ECO-06: aldeano recibe orden de recolectar piedra, reproduce `gather_mine`, camina cargando `carry_ore_f`, deposita piedra en edificio compatible y aumenta el stockpile. Confirmar que una animación compartida con oro **no cambia** el recurso depositado. Ejecutar pruebas de simulación y smoke táctil, registrar evidencia. Si el campamento minero aún no existe, marcar la parte de campamento como pendiente, aunque el depósito en Centro Urbano funcione.

## Plantilla de reporte
- Alcance/IDs y estado anterior
- Implementado (commit/PR/archivo)
- Verificado (comando, entorno, resultado y evidencia)
- No verificado / bloqueado (razón)
- Regresiones y riesgos
- Próxima acción exacta y responsable

## Prohibiciones
No declarar una funcionalidad `verified` basándose solo en un texto de Claude/ChatGPT, en un mock, en una galería o en un build. No fusionar ni publicar sin autorización. No prometer resultados de pruebas no ejecutadas. No instalar herramientas externas ni ejecutar scripts de terceros sin revisar permisos y procedencia.
