# ShipNow — Backend III · Módulos 1 a 5

API académica incremental. Fuente del alcance: MATERIAL DE LECTURA - Programación Backend III, preentrega y rúbrica del Módulo 1, páginas impresas 21–23. Backend II no agrega requisitos.

## Alcance y decisiones

El material exige Users y Products por capas, configuración validada y constantes. No fija en esa preentrega todos los campos ni un CRUD completo. Esta primera implementación define crear, listar y consultar por ID para ambas entidades. M2 incorpora modelos de pedidos y entregas para mocks; sus operaciones de negocio completas todavía no se implementan. No es todavía la entrega final.

Decisiones propias: User tiene name/email/role; Product tiene name/price/stock/status. El Service deriva status a partir del stock y asigna USER en altas de usuarios. No se implementa login, passwords ni administración de roles; el rol es un dato de dominio, no una autorización. Los endpoints son para desarrollo local y el servidor escucha en 127.0.0.1. Cambiaremos explícitamente la configuración de red al dockerizar en M8.

Roles: admin, user, driver. Estados: available, out_of_stock. Las claves ADMIN, USER, AVAILABLE y OUT_OF_STOCK se consumen desde constantes congeladas. El PDF mezcla nomenclaturas; esta decisión sigue los ejemplos de la preentrega M1.

## Herramientas e instalación (Windows PowerShell)

Necesitás Node.js 24, npm y MongoDB local o Atlas. Git/GitHub para presentar el repositorio; editor y cliente HTTP para trabajar. Las versiones exactas de dependencias están en package.json y package-lock.json.

Desde la carpeta que contiene package.json:

```powershell
node --version
npm --version
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Editá .env con tu conexión. El ejemplo incluye valores locales no sensibles, nunca credenciales reales. MongoDB debe estar activo; si usás Atlas necesitás usuario, permisos y acceso de red configurados.

```powershell
npm run dev
```

También podés usar `npm start`. El servidor conecta a MongoDB y prepara índices antes de aceptar peticiones. Ctrl+C cierra HTTP y la conexión. Si falta configuración, no arranca. Si MongoDB no está disponible, falla sin mostrar la URI ni sus credenciales.

## Variables

| Variable | Obligatoria | Validación |
|---|---|---|
| PORT | Sí | Entero entre 1 y 65535 |
| NODE_ENV | Sí | development, test o production |
| MONGODB_URI | Sí | No vacía; esquema MongoDB; conexión comprobada al arrancar |
| ENABLE_MOCKS | No | true/false; por defecto false; siempre deshabilitado en production |
| ENABLE_LOGGER_TEST | No | true/false; por defecto false; siempre deshabilitado en production |

Solo src/config/env.config.js lee process.env. dotenv carga .env sin reemplazar variables del sistema. Para probar variables faltantes, asegurate de no tener un valor exportado en la terminal.

## Arquitectura

Router → Controller → Service → Repository → Model.

- Router: método/path y función del Controller.
- Controller: req/res/next, código de éxito y propagación del error.
- Service: validaciones, estado derivado del stock y rol inicial.
- Repository: consultas con proyección explícita, orden estable, límite/offset y escritura.
- Model: schema, restricciones de datos, timestamps e índices; sin reglas de negocio.
- config: entorno y conexión de infraestructura. La conexión usa Mongoose, pero no consulta entidades.
- app.js: composición de Express, sin conexión ni listen. server.js: arranque e inicialización.

La separación permite probar validaciones sin MongoDB y operaciones HTTP/persistencia con MongoDB. No hay clase base genérica, contenedor de dependencias ni capas sin responsabilidad.

## Contrato HTTP de esta etapa

| Método | Ruta | Resultado |
|---|---|---|
| POST | /api/products | Crea producto; 201 |
| GET | /api/products | Lista; 200 |
| GET | /api/products/:id | Consulta; 200 o 404 |
| POST | /api/users | Crea usuario; 201 |
| GET | /api/users | Lista; 200 |
| GET | /api/users/:id | Consulta; 200 o 404 |

Listados: `?page=1&limit=20`; máximo 100 por respuesta, page entre 1 y 1000000. No incluyen total. Paginación es una recomendación incorporada temprano, no una nueva exigencia de M1. No se aceptan parámetros desconocidos, repetidos ni operadores MongoDB desde el cliente.

Producto: `{"name":"Caja mediana","price":1500,"stock":3}`. price debe ser un número finito >= 0; stock, entero seguro >= 0. El servidor asigna available si hay stock y out_of_stock en caso contrario. No admite status en el body.

Usuario: `{"name":"Ana Pérez","email":"ana@example.com"}`. Normaliza espacios y email en minúscula. El email debe ser único; el índice de MongoDB resuelve duplicados concurrentes. No admite role en el body.

Éxito: `{"status":"success","data":...}`. Error desde M3: `{"status":"error","error":"CODIGO_ESTABLE","message":"..."}`. Códigos: 400 entrada inválida, 404 inexistente, 409 duplicado, 413 body demasiado grande, 500 fallo inesperado. Los errores no incluyen stack ni credenciales.

## Prueba manual

En otra terminal PowerShell, con servidor activo:

```powershell
$product = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/products -ContentType 'application/json' -Body '{"name":"Caja mediana","price":1500,"stock":3}'
$product | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://127.0.0.1:8080/api/products/$($product.data._id)"
Invoke-RestMethod 'http://127.0.0.1:8080/api/products?page=1&limit=10'
$user = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/users -ContentType 'application/json' -Body '{"name":"Ana Pérez","email":"ana@example.com"}'
Invoke-RestMethod "http://127.0.0.1:8080/api/users/$($user.data._id)"
```

En Postman, repetir el POST de usuario debe dar 409. Probar stock -1, price como string, role admin y un ID mal formado: 400. Un ID válido sin registro: 404. Stock 0: 201 y out_of_stock. Una ruta inexistente: 404 JSON. Los comandos PowerShell lanzan excepción ante estados 4xx; eso no significa que el servidor haya fallado.

Para comprobar fail-fast, detené la app, dejá MONGODB_URI vacía en .env y ejecutá npm start: debe terminar con error descriptivo, sin escuchar HTTP. Restaurá el valor al terminar.

## Pruebas automáticas

Se anticipa una suite pequeña como recomendación de calidad; la cobertura completa exigida por el curso se desarrolla en M6. Se usan desde ahora Mocha, Chai y Supertest para evitar cambiar herramientas.

```powershell
npm test
```

Pruebas sin MongoDB: configuración y rechazos HTTP. No sustituyen la integración.

Con una base DESCARTABLE distinta, en PowerShell:

```powershell
$env:NODE_ENV = 'test'
$env:PORT = '8080'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/shipnow_test'
npm run test:integration
Remove-Item Env:NODE_ENV
Remove-Item Env:PORT
Remove-Item Env:MONGODB_URI
```

En bash: `NODE_ENV=test PORT=8080 MONGODB_URI=mongodb://127.0.0.1:27017/shipnow_test npm run test:integration`.

La suite rechaza NODE_ENV distinto de test o base sin sufijo _test. Crea sus datos, comprueba alta/consulta/persistencia/duplicado/límites y limpia únicamente los IDs que creó. No hace dropDatabase. Si el proceso se interrumpe abruptamente, podrían quedar datos descartables. Nunca usar una base valiosa aunque termine en _test.

## Evidencia y entrega

Mostrar arranque válido y falla por configuración; una creación/consulta de cada entidad; estado calculado; duplicado; resultados de ambas suites; código del flujo completo. Crear un repositorio GitHub y subir estos archivos excluyendo lo indicado en .gitignore. El enlace se entrega por plataforma; este paquete no crea ni publica un repositorio por vos.

El informe docs/VERIFICACION.md registra qué fue ejecutado. docs/MODULO-1.md contiene los diez apartados de aprendizaje, responsabilidades, checklist y defensa. docs/CODIGO-MODULO-1.md reúne código archivo por archivo.

## Límites conocidos y siguientes módulos

- API local de aprendizaje, sin autenticación ni control de acceso; no preparada para exposición pública.
- M3 incorpora el catálogo de errores; M4 integra Winston y archivos rotados.
- M5 incorpora Swagger; M6 ampliará tests; M7 archivos; M8 Docker y health; M9 auditoría final.
- price usa Number en esta base; no representa una decisión definitiva de precisión monetaria para cálculos futuros.
- Validación simple de email: no verifica existencia ni propiedad del correo.

## Referencias técnicas externas

No agregan requisitos a la consigna:
- https://expressjs.com/en/5x/guide/error-handling/ — propagación de errores; se usa next explícito para mantener visible el flujo.
- https://mongoosejs.com/docs/validation.html — unique define índice, no un validador; se espera init antes de aceptar altas.

## Módulo 2 — Mocks y carga controlada

Fuente del alcance: consigna y rúbrica de M2 del material Backend III (páginas impresas 43–45). Obligatorio: datos ficticios de usuarios, repartidores, pedidos y entregas; relaciones válidas; generación sin persistir y carga en MongoDB; router /api/mocks; capas y constantes; documentación y repositorio limpio. Backend II es apoyo conceptual.

Decisiones propias: Faker; repartidores como usuarios con rol driver; un cliente, un repartidor, un pedido y una entrega por unidad de qty. Los artículos del pedido son snapshots de nombre/cantidad/precio, sin agregar un requisito de relación con Products. Estados pending, assigned, in_transit, delivered, cancelled y prioridades low, normal, high son la convención de esta implementación, no una transcripción literal de enums obligatorios del PDF. Pending/cancelled no llevan repartidor; los otros estados sí. Estado y prioridad coinciden entre pedido y entrega. Total = suma de cantidad × precio unitario. No se simula un motor de transiciones ni pagos.

Recomendaciones incorporadas: máximo 100 por tipo, habilitación explícita fuera de producción, identificador por lote y compensación de inserciones fallidas. No se agregan microservicios, colas ni un framework de repositorios genéricos.

En tu .env existente agregá `ENABLE_MOCKS=true` y usá `NODE_ENV=development`. Reiniciá el servidor después de cambiar .env. No reemplaces tu conexión existente. La bandera no es autenticación; el servidor sigue limitado a localhost.

| Método | Ruta | Contrato |
|---|---|---|
| GET | /api/mocks/users?qty=2 | 200; array de clientes ficticios; no escribe |
| GET | /api/mocks/dataset?qty=2 | 200; batchId, users, drivers, orders, deliveries; no escribe |
| POST | /api/mocks/seed | JSON {"qty":2}; 201; batchId, inserted e ids; escribe 8 documentos |

GET admite qty entero positivo de 1 a 100, por defecto 10. POST requiere qty numérico en JSON, sin parámetros query. Es una elección de contrato; el ejemplo de query del material no se presenta como obligación. Cada POST crea un lote nuevo. Las llamadas GET y POST generan datos independientes: POST no guarda una vista previa anterior. Con mocks deshabilitados, las rutas devuelven 404.

```powershell
$preview = Invoke-RestMethod 'http://127.0.0.1:8080/api/mocks/dataset?qty=2'
$preview | ConvertTo-Json -Depth 8
$seed = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8080/api/mocks/seed' -ContentType 'application/json' -Body '{"qty":2}'
$seed | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://127.0.0.1:8080/api/users/$($seed.data.ids.users[0])"
```

En MongoDB Compass, filtrar users, orders y deliveries por `mockBatchId` devuelto por POST: deben existir 4 usuarios (2 clientes y 2 repartidores), 2 pedidos y 2 entregas. El lote de GET no debe existir. No hay rutas GET de negocio para pedidos/entregas todavía.

El Service inserta usuarios antes de pedidos y entregas. Si una escritura falla, elimina exclusivamente el lote generado, en orden entregas → pedidos → usuarios. Si falla esa limpieza, conserva los padres; desde M3 el UUID del lote se registra en la consola del servidor para revisión, sin incluirlo en el mensaje público. Esto NO es una transacción atómica: una caída del proceso puede dejar un lote parcial. No se exige configurar un replica set para esta etapa. Las pruebas de fallo usan repositorios simulados; no acreditan tolerancia a caídas de MongoDB.

`npm test` incluye M1 y M2 sin base. `npm run test:integration` incluye ambas suites reales y requiere la configuración descartable indicada arriba; no necesita mantener npm run dev activo. La suite de M2 comprueba que GET no persiste y que dos POST crean lotes independientes con referencias válidas. Limpia por lotes propios, sin dropDatabase. Si se interrumpe, revisar la base de pruebas.

Ver docs/MODULO-2.md para aceptación y defensa; docs/CODIGO-MODULO-2.md para el código de esta ampliación. La implementación no equivale al cierre académico: primero debe pasar la integración en tu equipo.

### Ciclo de conexión de las pruebas reales

El script test:integration carga tests/integration.setup.js mediante --require. Este hook raíz abre una conexión para ambas suites, espera los cuatro modelos y cierra al terminar. Las suites limpian solo sus datos. Ejecutarlas con el script npm; no omitir el setup ni activar ejecución paralela.

## Módulo 3 — Manejo profesional de errores

Fuente: MATERIAL DE LECTURA - Programación Backend III, preentrega y rúbrica, páginas impresas 68–70; middleware y protección de detalles, páginas 59–66. La consigna exige errores personalizados, diccionario central con códigos/mensajes/status HTTP, respuesta uniforme, propagación por capas y aplicación a los módulos existentes y mocks. La rúbrica tiene cinco criterios de 20% y aprobación desde 70 puntos; cumplir tests no garantiza una nota.

### Contrato de error

```json
{
  "status": "error",
  "error": "INVALID_MOCK_AMOUNT",
  "message": "qty debe ser un entero entre 1 y 100."
}
```

El campo error identifica el caso, el status HTTP indica su categoría y message es público. Las respuestas de éxito se mantienen. Desde M3 hay un campo adicional obligatorio en los errores; clientes con comparación estricta del JSON anterior deben actualizarse. No se exponen stack, cause, context, URI de MongoDB ni mensajes crudos de dependencias en ningún entorno.

- src/errors/error-catalog.js: códigos, mensajes y status HTTP congelados; catálogo de los casos existentes.
- src/errors/app-error.js: Error personalizado, con causa y contexto internos opcionales.
- Services: detectan validación/negocio y lanzan AppError con una entrada del catálogo.
- Controllers: continúan derivando con next; no construyen errores HTTP manualmente.
- src/middlewares/error-handler.js: único formato JSON; traduce duplicados, errores de Mongoose, JSON y tamaño de body. Error desconocido: 500 INTERNAL_ERROR. Si headersSent, delega en Express porque ya no puede reemplazar una respuesta comenzada.
- app.js: rutas, 404 y middleware de error, en ese orden.

| Caso | HTTP | Código |
|---|---|---|
| ID inválido | 400 | INVALID_ID |
| Usuario/producto inexistente | 404 | USER_NOT_FOUND / PRODUCT_NOT_FOUND |
| Cantidad de mocks inválida | 400 | INVALID_MOCK_AMOUNT |
| Query en POST seed | 400 | INVALID_MOCK_INPUT |
| Email repetido | 409 | DUPLICATE_RESOURCE |
| JSON mal formado | 400 | INVALID_JSON |
| Body excesivo | 413 | PAYLOAD_TOO_LARGE |
| Fallo de carga compensado | 500 | MOCK_LOAD_FAILED |
| Fallo de compensación | 500 | MOCK_CLEANUP_FAILED |
| Ruta inexistente | 404 | ROUTE_NOT_FOUND |
| Error inesperado | 500 | INTERNAL_ERROR |

El catálogo incluye también validación de texto, body, consulta, paginación, email, precio, stock y datos de Mongoose. No se agregan códigos ficticios para operaciones de pedidos aún no implementadas: cuando existan, tendrán sus reglas y errores propios. Los estados generados por M2 proceden de constantes; no hay endpoint de actualización de estado que validar todavía.

Conservamos el error original en cause, y ambas causas en AggregateError cuando fallan escritura y limpieza. Desde M4, Winston registra código y UUID del lote si corresponde, nunca el error crudo. La compensación continúa sin ser atómica.

### Prueba manual en Windows

Con MongoDB activo y desde la carpeta con package.json:

```powershell
$env:ENABLE_MOCKS = 'true'
$env:NODE_ENV = 'development'
$env:PORT = '8080'
npm run dev
```

Dejar esa terminal abierta. En una segunda, el siguiente bloque muestra status y body del error esperado; no inserta datos:

```powershell
try {
    Invoke-RestMethod 'http://127.0.0.1:8080/api/mocks/dataset?qty=-1' -ErrorAction Stop
}
catch {
    if ($null -eq $_.Exception.Response) { throw }
    [int]$_.Exception.Response.StatusCode
    $_.ErrorDetails.Message
}
```

Esperado: 400 y JSON con INVALID_MOCK_AMOUNT. Repetir cambiando la URL por /api/users/not-an-id (400 INVALID_ID), /ruta-inexistente (404 ROUTE_NOT_FOUND). En caso de fallo de conexión, arrancar el servidor antes de continuar; no confundirlo con una respuesta HTTP de error.

### Pruebas y evidencia

npm test ejecuta validaciones y contrato HTTP, inyectando fallas de repositorios para verificar POST seed → Controller → middleware. Las rutas usadas para errores inesperados existen solo dentro de tests, no en la API. Desde M4, el logger está silenciado por defecto al importar la app en tests; la suite de logging lo configura explícitamente para comprobar sus salidas.

npm run test:integration mantiene la conexión compartida corregida en M2. Amplía las comprobaciones reales de duplicado y recursos ausentes con códigos específicos; requiere NODE_ENV=test y una base descartable con sufijo _test como se documenta arriba. Mostrar resultado de ambas suites, respuesta manual inválida, catálogo y propagación desde Service hasta middleware.

Las pruebas adelantadas, Object.freeze y la retención de causas son decisiones de calidad que apoyan la consigna; no se presentan como nuevos requisitos académicos. No se agregan jerarquías de veinte clases, contenedores de dependencias ni endpoints de diagnóstico públicos.

## Módulo 4 — Logging y monitoreo básico

Fuente: Backend III, preentrega y rúbrica, páginas impresas 90–95. Obligatorio: Winston centralizado, seis niveles, distinción de entorno, integración con errores y módulos, persistencia/rotación, endpoint de prueba y README; logs fuera de Git. La rúbrica pondera cinco criterios al 20%: configuración, niveles, integración, archivos/rotación y documentación/endpoint.

### Configuración y niveles

src/config/logger.config.js es la configuración reutilizable. El servidor recibe NODE_ENV desde env.config.js; el logger no lee process.env. No se generan archivos por el solo hecho de importar app en tests. server.js configura el logger antes de conectar con MongoDB.

| Nivel | Uso | Consola development | Consola production | Archivo |
|---|---|---|---|---|
| debug | Vista previa de mocks y diagnóstico | Sí | No | No |
| http | Método, patrón de ruta, estado, duración | Sí | No | No |
| info | Arranque, conexión, altas y carga de lote | Sí | Sí | No |
| warning | Errores HTTP esperados, 4xx | Sí | Sí | No |
| error | Errores de servidor y conexión | Sí | Sí | Sí |
| fatal | Fallos críticos de arranque; prueba explícita | Sí | Sí | Sí |

Se usan niveles personalizados: fatal=0, error=1, warning=2, info=3, http=4 y debug=5. Un número menor representa mayor severidad en Winston. El formato de consola y archivo es JSON por línea, con timestamp UTC, level, message y metadatos controlados. La respuesta HTTP de M3 no cambia.

Eventos: SERVER_STARTED, MONGODB_CONNECTED, MONGODB_CONNECTION_FAILED, MONGODB_DISCONNECTED, USER_CREATED, PRODUCT_CREATED, MOCK_PREVIEW_CREATED, MOCK_BATCH_INSERTED, API_ERROR, HTTP_REQUEST, SERVER_STOPPED, STARTUP_FAILED y HTTP_LISTEN_FAILED. LOGGER_TEST identifica pruebas y lleva simulated=true: un fatal de prueba no indica caída del servidor.

No se registran cuerpos, headers, contraseñas, correos, query strings, URIs de MongoDB ni mensajes crudos de errores/causas. Se guardan IDs de entidad o lote y códigos controlados. Los patrones de ruta sustituyen valores concretos; las rutas inexistentes se registran como UNMATCHED. Las causas de AppError siguen disponibles internamente; los logs actuales no constituyen un sistema completo de trazas. Las respuestas HTTP ya iniciadas se delegan a Express.

### Archivos y rotación

Winston usa winston-daily-rotate-file: logs/error-YYYY-MM-DD.log, fecha UTC; sufijos adicionales cuando se supera el umbral de 5 MB. Retención configurada: 5 archivos administrados por el transporte. Un registro puede hacer superar el umbral; no es una cuota exacta del sistema de archivos. logs/rotation-audit.json conserva el inventario para la retención: no borrarlo mientras el servidor esté funcionando.

La ruta logs se resuelve desde la ubicación del proyecto, no desde el directorio de la terminal. .gitignore ya excluye logs/ y *.log. Nunca subir archivos generados, incluido el inventario. La prueba de rotación usa archivos pequeños temporales y espera escrituras en disco; no es una prueba de estrés ni garantiza durabilidad ante caída abrupta o disco lleno. La política supone una sola instancia escribiendo en esa carpeta.

El cierre normal espera el logger. Si el transporte informa un fallo, una salida mínima a stderr avisa LOGGER_FAILURE, sin entrar en recursión ni imprimir datos privados. No se promete persistencia cuando el disco no está disponible.

### Endpoint de prueba

GET /loggerTest responde 200 y genera los seis niveles. El router solo conecta método/path/controller; el Controller llama al Service de prueba. No usa Repository porque no realiza operaciones del dominio ni consultas MongoDB. El transporte de Winston se ocupa de los archivos.

ENABLE_LOGGER_TEST acepta true/false, por defecto false. En production siempre queda deshabilitado y devuelve 404, incluso si la variable vale true. Es una recomendación de seguridad local, no un requisito adicional de la rúbrica. No equivale a autenticación.

Desde la raíz del proyecto, con MongoDB activo:

```powershell
$env:NODE_ENV = 'development'
$env:PORT = '8080'
$env:ENABLE_LOGGER_TEST = 'true'
npm run dev
```

Dejar abierta esa terminal. En otra pestaña:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/loggerTest' -ErrorAction Stop |
    ConvertTo-Json -Depth 4
```

En la consola del servidor deben aparecer seis LOGGER_TEST y el registro HTTP. La respuesta confirma que se emitieron eventos al logger; la escritura es asíncrona, por lo que verificar también el archivo. Desde una terminal ubicada en shipnow, luego de completar la petición:

```powershell
Get-ChildItem .\logs -Filter 'error-*.log*'
Get-Content .\logs\error-*.log* -Tail 10
```

Solo deben aparecer niveles error/fatal en esos archivos. Para comprobar una advertencia real, solicitar /api/users/not-an-id: responde 400 INVALID_ID y registra API_ERROR de nivel warning en consola, sin guardarlo en el archivo de errores.

Opcionalmente agregar ENABLE_LOGGER_TEST=true al .env existente para no exportarlo cada vez. No reemplazar la conexión del .env. Reiniciar después de modificar variables. En production no funciona /loggerTest, por diseño.

### Pruebas y evidencia

Evidencia histórica M4: 77 passing, y 9 de integración confirmadas en Windows. La versión M5 espera 85 passing. M4 incorporó 8 pruebas nuevas de filtros por entorno, escritura de archivos reales temporales, rotación/retención, endpoint, errores HTTP y omisión de datos sensibles. No escribe en logs/ del proyecto durante esta suite. npm run test:integration: esperado 9 passing sobre la base descartable, confirmadas para M4; volver a ejecutar para M5 por las nuevas comprobaciones de contrato.

Evidencia de entrega: ambas suites; GET /loggerTest; consola con los seis niveles; archivo con error/fatal; git check-ignore para confirmar exclusión. No forzar cientos de peticiones manuales para rotar: la suite ya comprueba el transporte con umbral reducido. El tamaño/retención y política de datos son decisiones documentadas; no se incorporan plataformas externas ni métricas distribuidas.

Referencias técnicas externas (no agregan requisitos):
- https://github.com/winstonjs/winston — niveles, transports y cierre.
- https://github.com/winstonjs/winston-daily-rotate-file — rotación, retención e inventario.


## Módulo 5 — Swagger/OpenAPI

Fuente: material Backend III, páginas 101–105 y 118–120. Versión actual: **0.5.0**.

- UI interactiva: http://127.0.0.1:8080/api/docs/
- JSON OpenAPI: http://127.0.0.1:8080/api/docs/openapi.json
- Cambiar el puerto en la URL si PORT no es 8080. Try it out usa el servidor actual por defecto.
- Configuración: src/docs/swagger.config.js. Operaciones y schemas en YAML separados por módulo.
- Paquetes: swagger-jsdoc y swagger-ui-express, versiones exactas en package.json/lockfile.

### Alcance real y diferencia con la consigna

Se documentan las seis operaciones de Users/Products y, cuando se habilitan, tres de Mocks y una de Logger: diez operaciones en total. Todas especifican respuestas y errores; las que los usan también incluyen parámetros y cuerpos JSON. Los errores y ejemplos reutilizan el catálogo M3.

La consigna enumera Users, Orders, Deliveries, Mocks y Logger. Agregamos Products porque existe. **Orders y Deliveries todavía no tienen endpoints propios:** sus schemas se usan en dataset/seed, etiquetados con esos módulos. No se inventan rutas ni errores de estado. Si el docente exige endpoints independientes de pedidos y entregas, esta diferencia requiere ampliar el negocio antes de la entrega final; no se presenta como resuelta solo por agregar tags.

No hay autenticación. No se documentan JWT, passwords ni 401/403 ficticios. Usuarios persistidos tienen timestamps; vistas previas de mocks no. POST users no recibe role; POST products no recibe status. Los listados devuelven data como array, sin total.

### Disponibilidad y prueba interactiva

Mantener el .env existente; instalar nuevas dependencias con npm ci. Para ver los diez endpoints, usar NODE_ENV=development, ENABLE_MOCKS=true y ENABLE_LOGGER_TEST=true al arrancar. La aplicación escucha en 127.0.0.1 y necesita MongoDB para su arranque habitual.

Abrir Swagger, expandir GET /api/mocks/dataset, pulsar Try it out, ingresar qty=2 y Execute. Esperar HTTP 200 con dos elementos en cada array. Con qty=-1 esperar 400 INVALID_MOCK_AMOUNT. Ninguna de esas dos consultas persiste documentos. POST /api/mocks/seed sí inserta 4 × qty documentos por lote y no es idempotente; usar una base de desarrollo descartable.

Mocks y Logger apagados no aparecen como operaciones en la especificación; sus rutas responden 404 ROUTE_NOT_FOUND. En production, la configuración los deshabilita incluso si se solicitan. La UI y el JSON permanecen disponibles; no constituyen una capa de autorización.

### Pruebas M5

npm test: **85 passing esperadas**. Además de las 77 anteriores, valida OpenAPI/referencias, assets de Swagger, flags, aislamiento de instancias, carga desde otro directorio, ejemplos M3 y respuestas reales sin MongoDB. closeLogger conserva los transportes antes de finalizar Winston y espera el callback del flujo de archivo. La prueba exige archivo completo inmediatamente después del cierre, sin sondeo temporal.

npm run test:integration: **9 passing esperadas**. Los flujos anteriores ahora comparan también las respuestas de creación, consulta, listado, duplicados, inexistentes, preview y seed con OpenAPI. Usar las variables de prueba documentadas arriba y base con sufijo _test. Estas comprobaciones requieren nueva evidencia de Windows.

La validación OpenAPI ayuda a detectar referencias o contratos incorrectos, pero no garantiza que cualquier cambio futuro quede documentado automáticamente. Al modificar una ruta se debe actualizar su YAML y sus pruebas.

Detalle y defensa: docs/MODULO-5.md. Código: docs/CODIGO-MODULO-5.md.
