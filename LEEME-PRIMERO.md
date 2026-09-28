# ShipNow — Módulo 5 (versión 0.5.0)

Paquete completo de los módulos 1–5, preparado desde el commit 578289f.

1. Detener el servidor con Ctrl+C.
2. Extraer el ZIP en una carpeta temporal.
3. Copiar el CONTENIDO de `shipnow` sobre la carpeta `shipnow` existente; reemplazar los archivos del paquete.
4. Conservar `.env` y `.git`: no se incluyen. No crear shipnow dentro de shipnow.
5. Ejecutar `npm ci`, luego `npm test` (85 pruebas esperadas).
6. Ejecutar integración con la configuración de prueba indicada en README (9 esperadas).
7. Arrancar el servidor y abrir http://127.0.0.1:8080/api/docs/.

No ejecutar npm install de paquetes sueltos: npm ci usa el lockfile incluido.
No reemplazar el .env existente por .env.example.

La documentación muestra Mocks/Logger solo cuando están habilitados. Products y Users tienen rutas propias; Orders/Deliveries se documentan como datos de mocks. Revisar la diferencia con la consigna en docs/MODULO-5.md.

No se hizo commit ni push de M5 desde este paquete. Para publicar después de verificar Windows, incluir también LEEME-PRIMERO.md y los archivos nuevos de src/docs y tests/helpers.


## Corrección de logs del 28/09/2026

Este paquete corrige closeLogger y su prueba. Si ya instalaste dependencias M5 con npm ci, basta copiar los archivos actualizados y ejecutar npm test. Se mantiene 0.5.0 porque M5 todavía no fue publicado. Esperado: 85 passing. No es necesario volver a instalar dependencias para esta corrección.
