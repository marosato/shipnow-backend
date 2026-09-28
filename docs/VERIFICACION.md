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

### Prueba manual M2 — 28/09/2026
- GET /api/mocks/dataset?qty=2: respuesta exitosa con datos relacionados.
- POST /api/mocks/seed con {"qty":2}: informó 8 documentos insertados.
- Lote: e6413e8b-0a7d-49a4-b279-0af202b3e5a4.
- GET /api/users/9b71d08086927cebf2357265: recuperó el cliente creado.
- La ausencia de persistencia del GET y las relaciones en MongoDB
  fueron verificadas por la suite de integración.

## M3 — Preparación del 28/09/2026

Base: commit b22747c publicado por la estudiante. Consigna contrastada con el PDF re-adjuntado, páginas impresas 68–70.

- npm test: 69 passing en preparación (47 previas adaptadas + 22 nuevas).
- La suite nueva comprueba contrato HTTP, errores inesperados, parser, normalización de errores de Mongoose simulados y fallos simulados de seed.
- Integración real de M3: PENDIENTE en Windows. El resultado 9 passing de M2 no acredita la versión nueva.
- No hay MongoDB instalado en este entorno; no se afirma ejecución real local.
- No se agregan dependencias; package y lock actualizan la versión a 0.3.0.
- M3 no se ha publicado en GitHub desde este paquete.

### Validación M3 en Windows — 28/09/2026
- Versión: 0.3.0.
- npm test: 69 passing.
- npm run test:integration: 9 passing.
- GET /api/mocks/dataset?qty=-1: 400 INVALID_MOCK_AMOUNT.
- GET /api/users/not-an-id: 400 INVALID_ID.
- GET /ruta-inexistente: 404 ROUTE_NOT_FOUND.
- Las tres respuestas manuales incluyen status, error y message.
La integración y la comprobación manual de M3 quedan verificadas.

## M4 — Preparación del 28/09/2026

Base: commit 7983ac0. Consigna y rúbrica cotejadas con Backend III, pp. 90–95.

- npm test: 77 passing (69 previas + 8 de logging).
- Archivos temporales reales: niveles, timestamps, rotación y retención verificados. No es prueba de carga extrema.
- Endpoint: seis niveles; producción deshabilitada; HTTP sin datos sensibles; respuesta de M3 conservada.
- Arranque real con PORT inválido: salida 1; STARTUP_FAILED nivel fatal persistido.
- npm audit: 0 vulnerabilidades reportadas en esta ejecución, sin garantía permanente.
- Integración real M4: PENDIENTE en Windows (9 esperadas). MongoDB no está instalado en el entorno de preparación.
- Publicación M4: PENDIENTE; no se realizó push desde este paquete.

### Validación M4 en Windows — 28/09/2026
- Versión: 0.4.0.
- npm test: 77 passing.
- npm run test:integration: 9 passing.
- GET /loggerTest: HTTP 200, status success.
- Consola development: fatal, error, warning, info, http y debug.
- HTTP_REQUEST: método, ruta, estado y duración registrados.
- Archivo: eventos LOGGER_TEST de niveles fatal y error, simulated true.
- Rotación, retención y filtros por entorno verificados por la suite automatizada.


## M5 — Preparación del 28/09/2026

- Base clonada desde GitHub: 578289f (M4 completo y publicado).
- Versión preparada: 0.5.0.
- npm test: 85 passing en Linux/Node 24, incluyendo OpenAPI, UI/assets y contratos HTTP.
- npm audit: 0 vulnerabilidades reportadas durante la preparación.
- git diff --check: sin errores de espacios.
- Ajuste de la prueba M4: espera acotada de visibilidad del archivo antes de parsear JSON; se observó una lectura vacía prematura.
- Integración M5 con MongoDB: PENDIENTE en Windows; 9 esperadas, con comprobaciones nuevas de schemas. MongoDB no está instalado aquí.
- Navegación manual en Swagger: PENDIENTE en Windows; se verificaron HTTP de UI, assets y JSON mediante Supertest.
- Publicación M5: PENDIENTE; no se realizó commit ni push.
- Alcance: Orders/Deliveries solo mediante mocks y schemas, sin endpoints propios. Ver diferencia con la consigna en MODULO-5.md.


### Corrección del cierre del logger — 28/09/2026

- Evidencia Windows de M5 inicial: 84 passing / 1 failing. join recibió undefined porque el archivo aún no estaba disponible.
- La espera temporal anterior no incluía aparición del archivo y no resolvía el cierre prematuro.
- closeLogger ahora captura transportes antes de end y espera el callback de finalización del flujo de archivo, en lugar de depender de finish del transporte.
- La prueba requiere un archivo con fatal/error inmediatamente después de await closeLogger, sin esperas añadidas.
- Linux después de corregir: 85 passing; 40 cierres inmediatos adicionales con escritura completa, alternando development/production.
- El ensayo de 40 cierres con el código anterior tampoco reprodujo el fallo en Linux: no se presenta como reproducción determinista del error de Windows.
- Pendiente: confirmar la corrección en Windows. La integración M5 y publicación siguen pendientes.
- Dependencias y versión 0.5.0 sin cambios; no requiere reinstalar paquetes si npm ci ya terminó correctamente.

### Validación M5 en Windows — 28/09/2026
- Versión: 0.5.0, con corrección del cierre del logger.
- npm test: 85 passing.
- npm run test:integration: 9 passing.
- Swagger UI accesible y operación ejecutada desde el navegador.
- GET /api/mocks/dataset?qty=2: HTTP 200; dos usuarios, repartidores, pedidos y entregas.
- Swagger rechaza qty=-1 antes de enviar la petición por minimum: 1.
- Petición directa con qty=-1: HTTP 400 INVALID_MOCK_AMOUNT.
- Orders y Deliveries se documentan mediante schemas y mocks; siguen sin endpoints propios.
