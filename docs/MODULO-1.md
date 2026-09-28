# MÓDULO 1 — Base profesional de ShipNow

## 1. Objetivo del módulo

Construir la base de Users y Products con responsabilidades separadas y configuración robusta. Como no se suministró código de una API previa, se crea la base directamente con la estructura exigida; no se afirma haber refactorizado archivos inexistentes.

## 2. Requisitos del material

Fuente: Backend III, páginas impresas 21–23. Obligatorios: carpetas controllers/services/repositories/models/config; Users y Products por capas; Controller sin Mongoose; Router mínimo; dotenv centralizado; validar PORT, NODE_ENV y MONGODB_URI; .env excluido; .env.example; constantes congeladas de roles y estados; README con ejecución y justificación Service/Repository.

Rúbrica M1: configuración 30%; capas 35%; abstracción/negocio 20%; constantes 10%; documentación 5%. La aprobación indicada es 70/100. No asignamos una nota antes de la evaluación docente.

No se especifican exhaustivamente campos y operaciones CRUD: el contrato de seis endpoints es una decisión de implementación. No se agregan requerimientos de Backend II.

## 3. Implementación esperada

Crear/listar/consultar Users y Products. El Service deriva estado por stock y asigna USER al alta; el Repository ejecuta consultas con proyección, orden y límite; el Model valida estructura. Configuración faltante impide arrancar. Índice único de email listo antes de escuchar HTTP.

Adelantos mínimos recomendados, no exigencias de M1: app/server separados, límite de listas/body, middleware básico de error, pruebas selectivas y cierre de conexión. No equivalen a completar M3, M4, M6 ni M8.

## 4. Archivos/carpetas a crear o modificar

| Archivo(s) | Responsabilidad |
|---|---|
| src/app.js | Composición de Express, middleware y montaje de routers |
| src/server.js | Configuración, DB, índices y arranque/cierre HTTP |
| src/config/env.config.js | Única lectura de process.env y validación |
| src/config/db.config.js | Conexión/desconexión MongoDB |
| src/constants/index.js | Roles y estados congelados |
| src/models/user.model.js, product.model.js | Estructura de persistencia e índices |
| src/repositories/user.repository.js, product.repository.js | Consultas explícitas, proyección, límite y guardado |
| src/services/user.service.js, product.service.js | Reglas y coordinación |
| src/services/validation.js | Validación compartida de entradas, IDs y paginación |
| src/controllers/user.controller.js, product.controller.js | Adaptación HTTP y next(error) |
| src/routes/users.router.js, products.router.js | Método/path hacia Controller |
| src/errors/app-error.js | Error mínimo esperado; catálogo pendiente M3 |
| src/middlewares/error-handler.js | Respuestas de error mínimas y seguras |
| tests/base.test.js | Configuración y rechazo HTTP sin DB |
| tests/integration.mongodb.js | Flujos con MongoDB real y limpieza limitada |
| package.json, package-lock.json, .nvmrc | Comandos y versiones |
| .env.example, .gitignore | Configuración de referencia y exclusiones |
| README.md, docs/ | Ejecución, trazabilidad, evidencia y explicación |

## 5. Código archivo por archivo

Consultar CODIGO-MODULO-1.md: contiene el código completo de cada archivo fuente, configuración y test, en el mismo orden de lectura recomendado. Los archivos ejecutables están en src/ y tests/. El lockfile se incluye íntegro en el proyecto, sin duplicarlo en la guía.

## 6. Cómo probarlo

Seguir README: npm ci, configurar .env, npm run dev. Crear cada entidad, consultar el ID devuelto, listar con limit, comprobar stock 0, email duplicado, inputs incorrectos y configuración ausente. Ejecutar npm test y test:integration con base independiente. Las pruebas HTTP no requieren ejecutar npm start en paralelo: Supertest importa app.

Evidencia: respuestas HTTP, documentos persistidos, ambas salidas de test y error de arranque. Ver VERIFICACION.md para resultados reales de esta preparación.

## 7. Checklist de aceptación

- [ ] Instalar desde cero en tu computadora con npm ci.
- [x] Configurar MongoDB y comprobar arranque local (evidencia de Windows).
- [ ] Recorrer creación/listado/consulta de ambas entidades.
- [ ] Comprobar variables obligatorias y error claro al omitir URI.
- [ ] Confirmar Controller sin modelos y Service sin req/res.
- [ ] Confirmar constantes congeladas y ausencia de process.env disperso.
- [ ] Ejecutar ambas suites localmente.
- [ ] Revisar exclusiones antes de subir a GitHub.
- [ ] Entregar URL del repositorio por plataforma.

Las verificaciones realizadas están registradas con su procedencia en VERIFICACION.md. Esta lista sirve para reproducirlas y completar la publicación del repositorio.

## 8. Posibles errores que harían perder puntos

Mover archivos sin mover responsabilidades; consultar modelos desde Controller; calcular estados en Repository; duplicar variables/constantes; permitir estado incoherente con stock; subir .env; esconder errores de arranque; afirmar tests de DB basándose solo en validaciones; presentar esta etapa como proyecto final.

## 9. Qué escribir en el README

El README provisto explica alcance M1, instalación PowerShell, variables, endpoints, bodies, arquitectura, decisiones propias, pruebas, evidencias y limitaciones. Actualizarlo con cambios reales; no declarar Swagger, Docker ni seguridad implementados antes de tiempo.

## 10. Cómo defenderlo oralmente ante un profesor

“Organicé Users y Products como pide la preentrega. El Controller adapta HTTP, el Service decide reglas y el Repository concentra persistencia. El estado derivado del stock es una decisión de negocio, por eso está en el Service. El Repository selecciona campos y acota consultas; no decide permisos ni estados. El schema restringe la forma del dato. Valido configuración antes de conectar y escuchar; un entorno incompleto no produce un servidor a medias. Distingo pruebas sin DB de integración con persistencia real. Las herramientas posteriores se incorporarán por módulo.”

Preguntas difíciles:
- ¿Por qué Mongoose en config? Es conexión de infraestructura, no acceso a entidades desde HTTP.
- ¿Por qué validación en Service y schema? El servicio rechaza entradas y aplica reglas; el schema protege la estructura persistida. No se duplica la decisión de estado.
- ¿Por qué unique no basta? Es un índice; esperamos inicialización y traducimos conflicto 11000. Evita depender de una consulta previa vulnerable a concurrencia.
- ¿Por qué no todas las operaciones CRUD? M1 no las enumera. Esta base demuestra el flujo; no se declara entrega final completa.
- ¿Por qué tests antes de M6? Son evidencia selectiva y reutilizan las herramientas del curso; no cambian el alcance académico.
