# Módulo 5 — Documentación de API con Swagger

## 1. Objetivo
Permitir que otra persona conozca y pruebe el contrato real de ShipNow desde una interfaz interactiva.

## 2. Consigna y alcance
Fuente: MATERIAL DE LECTURA - Programación Backend III, páginas 101–105 y preentrega/rúbrica 118–120. Configuración Swagger: 20%; organización: 20%; endpoints: 20%; schemas/errores: 20%; README/consistencia: 20%.

Se incorpora Swagger UI, información general, tags, parámetros, cuerpos, respuestas, schemas reutilizables, errores M3 y README. Se documentan las diez operaciones existentes cuando Mocks y Logger están habilitados. Products se incluye porque existe en la API, aunque la enumeración de tags de M5 no lo mencione.

**Diferencia pendiente con el material:** la consigna menciona endpoints de Orders y Deliveries. La base publicada solo tiene sus modelos y operaciones de mocks, no routers de negocio propios. M5 documenta esos datos mediante schemas y los endpoints dataset/seed, etiquetados también como Orders y Deliveries. No inventa GET /api/orders, cambios de estado, autenticación ni errores de estado que el servidor no devuelve. Esto no equivale a implementar endpoints propios de pedidos/entregas: si el docente los exige de forma independiente, el alcance de negocio debe ampliarse antes de presentar la entrega final. No se garantiza aprobación ni una nota.

## 3. Implementación
- Swagger UI: `/api/docs/` (sin barra final redirige).
- Documento OpenAPI 3.0.3: `/api/docs/openapi.json`.
- Versión 0.5.0 tomada de package.json.
- Servidor actual como destino predeterminado; alternativa local con el PORT configurado.
- swagger-jsdoc lee YAML separados por módulos, con rutas absolutas y failOnErrors.
- swagger-ui-express sirve UI y assets desde el propio servidor.
- Mocks y Logger solo aparecen si sus rutas están habilitadas. La configuración de producción los deshabilita.
- No hay autenticación ni autorización implementadas; los roles siguen siendo datos del dominio.
- La especificación no modifica respuestas, validaciones ni persistencia.

## 4. Responsabilidades y archivos
- `src/docs/swagger.config.js`: configuración, selección por flags y errores derivados del catálogo M3.
- `src/docs/schemas.yaml`: schemas y parámetros reutilizables; separa entradas, recursos persistidos y vistas previas.
- `src/docs/users.yaml`, `products.yaml`, `mocks.yaml`, `logger.yaml`: operaciones HTTP y respuestas.
- `src/routes/docs.router.js`: UI, recursos estáticos y JSON; no consulta MongoDB.
- `src/app.js`: montaje de documentación antes del 404.
- `tests/docs.test.js`: validación OpenAPI, UI/JSON/assets, flags, otro cwd y contratos reales sin DB.
- `tests/helpers/openapi.js`: validación de respuestas de integración contra OpenAPI.
- Suites MongoDB existentes: agregan comprobaciones de contrato sin sumar escrituras extra.
- `src/config/logger.config.js`: conserva los transportes antes de iniciar el cierre y espera el callback del flujo de archivo.
- `tests/logger.test.js`: exige que el archivo exista y tenga ambos eventos inmediatamente después de await closeLogger; no usa esperas temporales.

## 5. Código
`CODIGO-MODULO-5.md` contiene el código de los archivos nuevos y modificados de runtime y pruebas. Los YAML son editables y se versionan junto al código.

## 6. Instalación y prueba
Detener el servidor. Copiar el contenido de shipnow del ZIP sobre el proyecto existente. Preservar `.env` y `.git`. Ejecutar `npm ci` antes de `npm test`: esta versión agrega dependencias.

`npm test`: 85 pruebas esperadas (77 previas + 8 M5).
`npm run test:integration`: 9 esperadas, ahora también contrastan respuestas MongoDB con los schemas; necesita NODE_ENV=test y base terminada en _test. La evidencia de M4 no sustituye la ejecución de M5.

Con MongoDB activo:

```powershell
$env:NODE_ENV = 'development'
$env:PORT = '8080'
$env:ENABLE_MOCKS = 'true'
$env:ENABLE_LOGGER_TEST = 'true'
npm run dev
```

Abrir `http://127.0.0.1:8080/api/docs/` en el navegador. En Mocks → GET /api/mocks/dataset → Try it out → qty=2 → Execute, esperar HTTP 200 y arrays de 2 elementos. Probar qty=-1: HTTP 400 INVALID_MOCK_AMOUNT. Esta ruta no persiste datos. GET /loggerTest permite comprobar el formato documentado del logger. POST seed sí inserta documentos; usar solo una base de desarrollo descartable.

Las rutas apagadas devuelven 404 ROUTE_NOT_FOUND y no se presentan como operaciones ejecutables. Reiniciar después de cambiar flags. En producción siguen accesibles UI y JSON, pero no Mocks ni Logger.

## 7. Aceptación y evidencia
- Local: 85 pruebas sin MongoDB aprobadas y npm audit sin vulnerabilidades reportadas.
- Pendiente: 9 de integración en Windows, navegación manual por Swagger y publicación M5.
- Base verificada: commit 578289f, M4 publicado.
- No se declara aprobada la totalidad de la rúbrica mientras no se resuelva la diferencia de alcance de Orders/Deliveries si el docente exige sus endpoints propios.

## 8. Errores a evitar
Confundir data con payload; documentar roles/status editables cuando se rechazan; olvidar campos de timestamps en persistencia; exigir timestamps en previews; mostrar una ruta deshabilitada como disponible; presentar schemas como si fueran endpoints implementados; probar seed sobre datos importantes.

## 9. README
Incluye URL de UI/JSON, configuración, módulos, flags, diferencias de alcance, pruebas y uso seguro de Try it out.

## 10. Defensa oral
“Swagger describe el contrato que la API realmente expone. Separo schemas de entrada, recursos persistidos y mocks. Los errores provienen del catálogo de M3 y las pruebas comparan respuestas con OpenAPI. La especificación respeta los flags de la instancia. Pedidos y entregas están representados en los mocks; todavía no tienen endpoints de negocio propios.”

Referencias técnicas: https://github.com/Surnet/swagger-jsdoc y https://github.com/scottie1984/swagger-ui-express. Estas referencias explican las herramientas, no agregan requisitos académicos.
