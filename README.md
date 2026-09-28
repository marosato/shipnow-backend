# ShipNow — Backend III · Módulos 1 y 2

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

Éxito: `{"status":"success","data":...}`. Error mínimo: `{"status":"error","message":"..."}`. Códigos: 400 entrada inválida, 404 inexistente, 409 duplicado, 413 body demasiado grande, 500 fallo inesperado. Los errores no incluyen stack ni credenciales.

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
- M3 completará catálogo de errores; M4 sustituirá consola por Winston.
- M5 incorporará Swagger; M6 ampliará tests; M7 archivos; M8 Docker y health; M9 auditoría final.
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

El Service inserta usuarios antes de pedidos y entregas. Si una escritura falla, elimina exclusivamente el lote generado, en orden entregas → pedidos → usuarios. Si falla esa limpieza, conserva los padres e informa el lote para revisión. Esto NO es una transacción atómica: una caída del proceso puede dejar un lote parcial. No se exige configurar un replica set para esta etapa. Las pruebas de fallo usan repositorios simulados; no acreditan tolerancia a caídas de MongoDB.

`npm test` incluye M1 y M2 sin base. `npm run test:integration` incluye ambas suites reales y requiere la configuración descartable indicada arriba; no necesita mantener npm run dev activo. La suite de M2 comprueba que GET no persiste y que dos POST crean lotes independientes con referencias válidas. Limpia por lotes propios, sin dropDatabase. Si se interrumpe, revisar la base de pruebas.

Ver docs/MODULO-2.md para aceptación y defensa; docs/CODIGO-MODULO-2.md para el código de esta ampliación. La implementación no equivale al cierre académico: primero debe pasar la integración en tu equipo.

### Ciclo de conexión de las pruebas reales

El script test:integration carga tests/integration.setup.js mediante --require. Este hook raíz abre una conexión para ambas suites, espera los cuatro modelos y cierra al terminar. Las suites limpian solo sus datos. Ejecutarlas con el script npm; no omitir el setup ni activar ejecución paralela.
