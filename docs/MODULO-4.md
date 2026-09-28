# MÓDULO 4 — Logging y monitoreo básico

## 1. Objetivo del módulo
Dar visibilidad sobre eventos y fallos de ShipNow mediante registros estructurados, niveles y archivos rotados.

## 2. Requisitos del material
Backend III, pp. 90–95: Winston centralizado; debug/http/info/warning/error/fatal; entorno development/production; integración con arranque, MongoDB, errores y mocks; persistencia de errores, rotación; endpoint de prueba; README y exclusión de logs del repositorio. Cinco criterios de 20% y aprobación desde 70 puntos, sin garantía automática de nota.

Obligatorio: lo anterior. Recomendaciones incorporadas: /loggerTest deshabilitado en producción, whitelist de metadatos en los puntos de registro, JSON también en consola, cierre normal del logger. Decisiones concretas: rotación UTC diaria y 5 MB; retención de 5 archivos. Opcional futuro: ID de petición. Sobreingeniería para esta entrega: ELK, Grafana, OpenTelemetry o colas para logs.

## 3. Implementación esperada
Un logger importable, configurado desde server.js con el entorno validado. Middleware HTTP registra método, patrón de ruta, estado y duración. Middleware de errores registra warning para 4xx y error para 5xx, conservando el contrato M3. Arranque registra fatal cuando falla. Service de mocks registra generación y carga; servicios de altas registran entidades creadas. Router de /loggerTest delega a Controller y Service. No se inventa un Repository para escribir logs: es infraestructura del transporte de Winston.

## 4. Archivos/carpetas a crear o modificar
| Archivo | Responsabilidad |
|---|---|
| src/config/logger.config.js (nuevo) | Winston, niveles, formatos, consola, archivos y cierre |
| src/config/env.config.js y .env.example | Bandera ENABLE_LOGGER_TEST centralizada |
| src/config/db.config.js | Eventos de conexión sin URI ni credenciales |
| src/middlewares/request-logger.js (nuevo) | Registro HTTP al terminar la respuesta |
| src/middlewares/error-handler.js | Clasifica y registra errores sin cambiar JSON de M3 |
| src/services/logger.service.js (nuevo) | Emite niveles de prueba |
| src/controllers/logger.controller.js (nuevo) | req/res/next del endpoint |
| src/routes/logger.router.js (nuevo) | GET /loggerTest y Controller |
| src/services/mock.service.js | Eventos de vista previa y carga exitosa |
| src/services/user.service.js y product.service.js | Evento de alta después de persistir |
| src/app.js | Registro condicional y prefijo de ruta seguro |
| src/server.js | Configuración, arranque y cierre |
| tests/logger.test.js (nuevo) | Comprobación real de archivos, filtros y HTTP |
| package.json y lock | Winston y transporte fijados; versión 0.4.0 |
| README y docs | Contrato operativo, pruebas y evidencia |

logs/ se crea en ejecución y ya está ignorado por Git. No se entrega dentro del ZIP.

## 5. Código archivo por archivo
Ver docs/CODIGO-MODULO-4.md. No se cambian los schemas ni contratos de negocio. Las altas pasan a ser async para registrar el éxito solo después de guardar; los Controllers ya esperaban sus promesas.

## 6. Cómo probarlo
Instalar con npm ci; npm test debe dar 77 passing. Repetir npm run test:integration con NODE_ENV=test y shipnow_test: esperado 9. Para la prueba manual habilitar ENABLE_LOGGER_TEST=true en development, arrancar y llamar GET /loggerTest desde otra terminal. Mostrar respuesta, seis eventos en consola y únicamente error/fatal en logs/error-*.log*. Pedir ID inválido para mostrar warning y comprobar que no se agrega a ese archivo. README tiene comandos.

## 7. Checklist de aceptación
- [x] Configuración central, niveles requeridos y filtros por entorno.
- [x] Error handler integrado sin cambiar contrato de M3.
- [x] Eventos en arranque, conexión, mocks y altas.
- [x] Archivos error/fatal, rotación y retención comprobadas con archivos temporales.
- [x] Endpoint de prueba por capas y deshabilitado en producción.
- [x] 77 pruebas sin MongoDB ejecutadas en preparación.
- [x] Fallo real de arranque por PORT inválido: salida 1 y fatal persistido.
- [ ] Integración de M4 ejecutada en Windows.
- [ ] Evidencia manual de consola y archivo en Windows.
- [ ] Commit/push de M4 sin logs ni .env.

## 8. Posibles errores que harían perder puntos
Usar warn cuando se definió warning; invertir prioridades numéricas; dejar debug visible en producción; guardar info en el archivo de errores; confundir un fatal simulado con una caída; responder distinto en M3 por agregar logger; loguear body/headers/URI completos; subir logs; declarar rotación sin probarla. Tampoco presentar la salida 9 passing de M3 como validación de M4.

## 9. Qué escribir en el README
Herramientas, niveles, política de entorno, endpoint y habilitación, nombres/ruta de archivos, tamaño/retención, exclusión Git, pruebas y limitaciones. Ya incluido. Las escrituras son asíncronas: el 200 de /loggerTest no demuestra por sí solo que el archivo sea legible; mostrarlo.

## 10. Cómo defenderlo oralmente
“Uso Winston como infraestructura compartida y mantengo la detección de reglas en los servicios. Los errores siguen respondiéndose en el middleware de M3, que ahora registra su severidad. Los niveles custom permiten warning y fatal tal como pide la consigna. El transporte guarda solo error/fatal y rota por fecha y tamaño con retención. Las pruebas escriben archivos reales temporales; no solo inspeccionan la configuración. No registro datos completos de peticiones ni errores crudos.”

Evidencia: salida de suites, endpoint, consola, archivos, git check-ignore y flujo del código. Límites: logger no sustituye monitoreo externo; los registros no garantizan durabilidad ante caída abrupta, disco lleno o carga extrema; política local de una instancia.
