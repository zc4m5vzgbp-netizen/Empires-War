# Auditoría de trazabilidad — integración visual y economía (2026-10-10)

## Alcance y evidencia
Fuente normativa: `docs/MASTER_DESIGN.md` v2.0 y `docs/DECISIONS.md`. Matriz histórica: `docs/REQUIREMENTS_MATRIX.md` (última actualización Bloque 1). Rama inspeccionada: `feat/economy-camps-functional` (PR #19, commit `efe8e515c14f1851197e1052b13feed6a97c3b6b`). Seguimiento Linear: EMP-5, EMP-6, EMP-7, EMP-8, EMP-9, EMP-10 y EMP-11. Esta auditoría es **estática y parcial**; no sustituye pruebas de navegador ni de iPhone físico.

## Hallazgos verificables

| ID de matriz | Observación en rama #19 | Estado recomendado de seguimiento | Acción pendiente |
|---|---|---|---|
| ECO-05 | `src/content/economy.ts` declara cuatro recursos y tipos de edificios adicionales; la matriz aún indica «pendiente» | **Reevaluar**, no marcar «probado» | Verificar recolección, depósito y UI de los cuatro recursos en la partida normal |
| ECO-06 | Campamentos `lumberCamp` y `miningCamp` tienen `accepts` específicos: madera y oro/piedra; molino acepta comida | **En integración** | Probar ciclo de tareas y compatibilidad con dropsites; confirmar rutas y guardado |
| ECO-02 / ECO-03 | Documento maestro exige reserva común, no inventarios por edificio | **Invariante obligatorio** | Probar que depósitos suman al total y costes descuentan reserva global |
| UI-07 / PI-01 | `src/render/entityView.ts` selecciona el atlas `ECO` únicamente si la textura existe; el `preload()` de `src/render/GameScene.ts` solo invoca `preloadArt(this)` | **No integrado visualmente** | Precargar atlas y animaciones de aldeanos y campamentos en partida real, validar licencias, sombras y fallback |
| GUA-02 / GUA-03 | La matriz documenta prueba histórica de guardado de Bloque 1 | **Probado históricamente, regresión pendiente** | Ejecutar guardado/carga con campamentos, nuevas tareas y animaciones en la versión integrada |
| GUA-04 | La matriz sitúa varias ranuras y autoguardado en Bloque 6 | **Pendiente por diseño** | No confundir con defecto del Bloque 1; conservar trazabilidad |
| REN-04 / UI-07 | iPhone 15 Pro Max es referencia de rendimiento y usabilidad | **Validación móvil pendiente** | Ejecutar pruebas automatizadas y físicas; no extrapolar FPS de CI a dispositivo real |

## Riesgos y reglas
1. El PR #19 está en borrador y basado en otra rama, no en `main`. No fusionar `main` sin autorización explícita.
2. El atlas de campamentos en PR #18 y la corrección de sombras en PR #20 requieren integración consciente; un CI verde por PR no acredita el resultado conjunto.
3. Los valores provisionales de costes, velocidades y tiempos deben conservar su etiqueta y no presentarse como balance verificado de AoE II DE.
4. La nueva dirección visual de Claude exige auditar su prototipo completo; los atlas sueltos no prueban equivalencia visual.
5. Mantener `docs/REQUIREMENTS_MATRIX.md` sin cambios de estado hasta disponer de pruebas concretas por requisito.

## Criterios de cierre de EMP-5 y EMP-6
- Precarga real de assets y animaciones, incluyendo ausencia de recursos y fallback.
- Ciclo reproducible de recolectar → transportar → depositar para cada recurso.
- Construcción, pago, finalización y guardado/carga de molino y campamentos.
- Typecheck, tests, build y prueba de navegador con evidencia del commit exacto.
- Comprobación de UI táctil y rendimiento real del iPhone antes de certificar optimización.

**Resultado:** auditoría inicial documentada; **integración NO aprobada**.