# MÓDULO 2 — Mocks y carga controlada

## 1. Objetivo del módulo
Generar datos ficticios coherentes y permitir su persistencia controlada respetando la arquitectura de M1.

## 2. Requisitos del material
Referencia: Backend III, preentrega/rúbrica M2, páginas impresas 43–45. Usuarios, repartidores, pedidos y entregas; /api/mocks; generación sin escritura; inserción en MongoDB; relaciones y constantes válidas; responsabilidades separadas; README y GitHub sin node_modules. La rúbrica distribuye 20% en integración de mocks, capas, constantes/dominio, documentación/repositorio y consistencia de datos. No se garantiza calificación por completar esta lista.

Decisiones externas recomendadas: Faker, máximo 100, bandera de entorno, trazabilidad por lote, compensación y pruebas anticipadas. Campos, estados concretos y contrato JSON son decisiones documentadas, no requisitos inventados. CRUD completo de pedidos, autenticación adicional, transacciones distribuidas y colas quedan fuera del alcance.

## 3. Implementación esperada
GET users/dataset genera sin consultar repositorios; POST seed valida y coordina usuarios → pedidos → entregas. Repartidores son Users con DRIVER. Cada unidad de qty crea cuatro documentos. Router → Controller → Service → Repository → Model para persistencia; la vista previa termina en Service porque no accede a datos. No hay capas ficticias para forzar una consulta innecesaria.

## 4. Archivos/carpetas a crear o modificar
| Archivo | Acción y responsabilidad |
|---|---|
| src/constants/index.js | Modificar: roles, estados, prioridades y límite |
| src/config/env.config.js, .env.example | Modificar: bandera centralizada |
| src/models/user.model.js | Modificar: marca opcional de lote |
| src/models/order.model.js, delivery.model.js | Crear: schemas y referencias |
| src/repositories/user.repository.js | Modificar: inserción y borrado por lote |
| src/repositories/order.repository.js, delivery.repository.js | Crear: persistencia, sin reglas de negocio |
| src/services/mock.generator.js | Crear: datos, totales y relaciones coherentes |
| src/services/mock.service.js | Crear: validación y coordinación de carga/compensación |
| src/controllers/mock.controller.js | Crear: frontera req/res/next |
| src/routes/mocks.router.js | Crear: método/path/controller |
| src/app.js, server.js | Modificar: composición condicional y preparación de índices |
| tests/mocks.test.js | Crear: contrato, schemas y fallos simulados |
| tests/mocks.integration.mongodb.js | Crear: persistencia y relaciones reales |
| package.json, package-lock.json | Modificar: Faker y scripts reproducibles |
| README.md, docs/VERIFICACION.md | Actualizar: uso y evidencia |
| docs/MODULO-2.md, docs/CODIGO-MODULO-2.md | Crear: guía y código |

## 5. Código archivo por archivo
El código ejecutable está en src y tests. docs/CODIGO-MODULO-2.md reúne los archivos de implementación modificados y las pruebas; package-lock.json es el registro de instalación, no debe editarse a mano.

## 6. Cómo probarlo
Seguir README: npm ci, npm test; configurar NODE_ENV=test y base shipnow_test, ejecutar npm run test:integration. Para prueba manual activar ENABLE_MOCKS=true en development, arrancar, GET dataset qty=2 y POST seed JSON qty=2. Mostrar 200 sin persistencia, 201 con ocho documentos, referencias en Compass y 400 para qty=0. Deshabilitar bandera, reiniciar y comprobar 404. Reiniciar luego de editar .env.

## 7. Checklist de aceptación
- [ ] Instalación limpia con npm ci.
- [ ] 47 pruebas sin DB aprobadas.
- [ ] 9 pruebas de integración M1+M2 aprobadas en MongoDB descartable.
- [ ] GET no guarda; POST informa lote e IDs.
- [ ] Roles, referencias, total, estado y prioridad coherentes.
- [ ] Semántica de qty y límites documentados.
- [ ] .env y node_modules fuera del repositorio; .env.example incluido.
- [ ] Mostrar rutas mínimas y separación de responsabilidades.
- [ ] Mostrar capturas y commit de M2 en GitHub.

## 8. Posibles errores que harían perder puntos
Generar referencias aleatorias a documentos inexistentes; usar un cliente como repartidor; persistir desde GET; usar schemas incompatibles; escribir con Mongoose en Controller; insertar toda la lógica en Repository; llamar transacción a una compensación; mostrar tests de M1 como evidencia de M2; subir .env o node_modules; dejar instrucciones irreproducibles. Un test verde no demuestra por sí solo cumplimiento integral de la rúbrica.

## 9. Qué escribir en el README
Origen del alcance, contratos HTTP, significado de qty, relaciones, pasos PowerShell, configuración, resultados reales y limitación de atomicidad. El README incluido ya contiene esas decisiones. Añadir evidencia local de integración después de ejecutarla, sin inventar resultados.

## 10. Cómo defenderlo oralmente
“El generador produce un grafo coherente sin acceso a MongoDB. El Service valida y ordena la persistencia; los repositorios solo escriben y borran. Uso DRIVER en User para no duplicar una entidad sin necesidad. La limpieza afecta solo a un UUID de lote. No garantizo atomicidad ante caída del proceso; esa limitación está documentada. Pruebo el contrato HTTP sin infraestructura y las relaciones persistidas con una base real separada.”

Evidencia de entrega: salida de ambas suites; GET y POST con sus respuestas; consulta de lote en Compass; lectura guiada del flujo de código; README y commit publicado. Swagger, logger y archivos se incorporan en sus módulos, no se presentan aquí como completados.
