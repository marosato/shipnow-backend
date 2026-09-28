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

La base M1 está implementada y cuenta con las verificaciones indicadas. Esto no equivale a aprobar académicamente ni a completar los módulos 2–9. El repositorio GitHub y la entrega de su URL por plataforma siguen pendientes; no se ha publicado nada desde este paquete.

Para reproducir las pruebas, seguir README.md. No se incluyen .env, node_modules ni datos de MongoDB.
