# MÓDULO 3 — Manejo profesional de errores

## 1. Objetivo del módulo
Unificar los errores de los módulos existentes con códigos estables y mensajes públicos controlados.

## 2. Requisitos del material
PDF Backend III, pp. 68–70: diccionario con códigos/mensajes/status, custom errors, middleware global, errores detectados en la capa adecuada, respuesta únicamente desde middleware y validación/fallos de mocks. README con formato y ejemplos; mismo repositorio GitHub sin node_modules. Cinco criterios de 20%: centralización, custom errors/diccionario, uniformidad, módulos/mocks y arquitectura.

Obligatorio: los puntos anteriores. Recomendado e incorporado: catálogo congelado, causas internas, pruebas anticipadas, respuesta sin detalles internos incluso en desarrollo. Opcional para otra etapa: identificador por petición. Sobreingeniería aquí: clase por cada código, framework genérico de excepciones, endpoints artificiales de pedidos. Los ejemplos de dominio de la consigna se aplican según las operaciones existentes, no se añade CRUD para aparentar cobertura.

## 3. Implementación esperada
AppError recibe una definición del catálogo. Los servicios lanzan; los controllers derivan; el middleware traduce a {status,error,message}. Mongoose y el parser conservan sus errores hasta la frontera. Los repositorios no construyen respuestas HTTP ni reglas de negocio. Errores inesperados responden 500 genérico. Los fallos de seed conservan causas y UUID internamente.

## 4. Archivos/carpetas a crear o modificar
| Archivo | Responsabilidad |
|---|---|
| src/errors/error-catalog.js (nuevo) | Diccionario único y congelado |
| src/errors/app-error.js | Error personalizado y causa interna |
| src/middlewares/error-handler.js | Normalización y respuesta uniforme |
| src/services/validation.js | Errores de entradas compartidas |
| src/services/user.service.js | Casos de usuario |
| src/services/product.service.js | Casos de producto |
| src/services/mock.service.js | Cantidades, carga y compensación |
| src/app.js | 404 desde catálogo |
| src/server.js | Identificación M3 al arrancar |
| tests/errors.test.js (nuevo) | Contrato HTTP y fallos simulados |
| tests/mocks.test.js | Causa/contexto de compensación |
| tests/integration.mongodb.js | Códigos reales de duplicados/ausentes |
| package.json y package-lock.json | Versión 0.3.0; sin dependencias nuevas |
| README y docs | Contratos, código, aceptación y evidencia |

## 5. Código archivo por archivo
Ver docs/CODIGO-MODULO-3.md. El código ejecutable está en src y tests. Se preserva la preparación compartida de integración de M2.

## 6. Cómo probarlo
npm ci y npm test: esperado 69 passing. Integración en base descartable shipnow_test: esperado 9 passing, aún requiere ejecución real de M3. No confundir el resultado de M2 con esta versión. Prueba manual: arrancar con mocks habilitados y pedir dataset?qty=-1; debe dar 400 INVALID_MOCK_AMOUNT. Pedir /ruta-inexistente: 404 ROUTE_NOT_FOUND. README incluye comandos que muestran los errores HTTP en PowerShell.

## 7. Checklist de aceptación
- [x] Catálogo con códigos, mensajes y estados.
- [x] Errores personalizados utilizados por servicios.
- [x] Middleware final y ruta 404 centralizada.
- [x] Contrato común para validación, parser, Mongoose y fallos.
- [x] Mocks incluidos, con causas internas y sin detalles sensibles públicos.
- [x] 69 pruebas sin MongoDB ejecutadas en preparación.
- [ ] 9 pruebas de integración de esta versión ejecutadas en Windows.
- [ ] Evidencia manual de error y código del catálogo.
- [ ] Commit y push de M3 en el mismo repositorio.

## 8. Posibles errores que harían perder puntos
Responder 200 ante validaciones; devolver error.message crudo de MongoDB; mantener new AppError(status,mensaje) disperso; meter res en Service; declarar catálogo sin usarlo; ignorar mocks; confundir prueba simulada con fallo real de infraestructura; aprobar M3 con la captura de integración de M2.

## 9. Qué escribir en el README
Formato uniforme, códigos y estados, responsabilidades, ejemplos reproducibles de entradas inválidas y límites. Ya incluidos. Registrar los resultados reales de Windows cuando se ejecuten. Las causas se conservan internamente y no son serializadas. El logger completo sigue pendiente de M4.

## 10. Cómo defenderlo oralmente
“El código estable permite al cliente interpretar el error sin analizar frases. Los servicios conocen los casos del catálogo, pero no req/res. El middleware transforma errores conocidos de dependencias y usa un 500 genérico para desconocidos. Las causas originales siguen disponibles internamente. Pruebo el recorrido HTTP y verifico que la respuesta solo tenga campos públicos; la integración comprueba códigos con MongoDB real.”

Evidencia para mostrar: catálogo, un throw del Service, next del Controller, middleware al final, error manual y ambas suites. No afirmar atomicidad de la carga ni observabilidad completa todavía.
