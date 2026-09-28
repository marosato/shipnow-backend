# Verificación — Módulo 1

## Resultado y procedencia de la evidencia

| Comprobación | Resultado | Entorno / evidencia |
|---|---|---|
| Configuración y validaciones HTTP | 23 pruebas aprobadas | Entorno de preparación, también después de actualizar Mocha a 12.0.1; ejecución inicial confirmada en Windows |
| Integración HTTP y MongoDB | 7 pruebas aprobadas | Captura de ejecución en Windows proporcionada por la estudiante; repetida después de actualizar Mocha |
| Auditoría completa npm audit | 0 vulnerabilidades reportadas | Entorno de preparación con Mocha 12.0.1 y captura posterior de la estudiante |
| Arranque de la API | Disponible en http://127.0.0.1:8080 | Captura de Windows con MongoDB local |
| Configuración sin MONGODB_URI | Salida 1, mensaje descriptivo | Entorno de preparación |
| Sintaxis de src | Sin errores | node --check |
| Separación de responsabilidades | Inspeccionada | Controllers sin Model; Services sin Mongoose; lectura de process.env centralizada |

La integración valida creación y consulta de usuario, normalización de email, rechazo de duplicados, persistencia de productos con y sin stock, límites de listados y respuestas 404 para ambas entidades. La base usada es shipnow_test; la suite limpia únicamente sus registros.

La ejecución de MongoDB en el entorno de preparación fue bloqueada por una restricción del entorno. La validación de persistencia se acredita mediante las ejecuciones posteriores de la estudiante en Windows; no se presenta como una ejecución local del asistente.

## Dependencias corregidas

Mocha se actualizó de la rama 11 a la versión exacta 12.0.1. package.json y package-lock.json incorporan el cambio. npm audit dejó de reportar los tres hallazgos anteriores. El resultado es una fotografía de la auditoría realizada, no una garantía permanente de ausencia de vulnerabilidades.

## Alcance del cierre

La base M1 está implementada y cuenta con las verificaciones indicadas. Esto no equivale a aprobar académicamente ni a completar los módulos 2–9. La estudiante publicó el commit de M1 8a337c6 en marosato/shipnow-backend; el push fue confirmado en su salida de PowerShell. La entrega en la plataforma académica no está verificada.

Para reproducir las pruebas, seguir README.md. No se incluyen .env, node_modules ni datos de MongoDB.

## Ampliación M2 — 28 de septiembre de 2026

- Base: clon del commit 8a337c6 del repositorio de la estudiante.
- npm test: 47 passing (23 anteriores + 24 nuevas), ejecutado en preparación.
- Los mocks de 100 elementos por tipo validan contra los schemas reales, sin conectar a MongoDB.
- Fallos y compensación: comprobados con repositorios simulados; no con fallas reales de red.
- MongoDB no está instalado en este entorno de preparación. Las 2 pruebas nuevas de integración están PENDIENTES de ejecución en Windows, junto con las 7 anteriores: total esperado 9.
- No se ha publicado M2 en GitHub. El paquete no contiene .git, .env ni node_modules.
- No se certifica cierre del módulo hasta comprobar integración y evidencia local.

- npm audit y npm audit --omit=dev: 0 vulnerabilidades reportadas en esta ejecución. No garantiza ausencia permanente de vulnerabilidades.

## Corrección del ciclo de conexión de integración

Evidencia Windows: 47 pruebas sin DB aprobadas; integración: 7 passing y fallo del before de M2 (MongoNotConnectedError). Se detectó conexión/desconexión por suite sobre modelos compartidos e inicialización no esperada de todos los modelos.

Corrección: tests/integration.setup.js centraliza una conexión, espera los cuatro modelos y desconecta al finalizar toda la ejecución serial. Cada suite conserva únicamente la limpieza de sus datos. No se modifica la configuración ni el código de producción. Reejecución real en Windows pendiente; no se acredita 9 passing todavía.

### Validación en Windows — 28/09/2026
Después de aplicar la corrección del ciclo de conexión:
- npm test: 47 passing.
- npm run test:integration: 9 passing.
- npm ci: 0 vulnerabilidades reportadas.
La integración de M2 pendiente en los apartados anteriores queda verificada.
