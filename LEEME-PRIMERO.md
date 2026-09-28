# ShipNow — Módulo 1 actualizado

Esta versión contiene Mocha 12.0.1, lockfile corregido y documentación de los resultados obtenidos. No incluye módulos posteriores.

## Si ya tenés la versión anterior funcionando

Extraé el ZIP en una carpeta temporal. Copiá el CONTENIDO de la carpeta shipnow sobre tu carpeta shipnow existente y aceptá reemplazar los archivos del paquete. No crees una carpeta shipnow dentro de otra shipnow. El paquete no contiene .env ni .git, por lo que esos archivos/carpetas locales no se reemplazan. Conservá cualquier cambio propio antes de sobrescribir código.

Desde la carpeta que contiene package.json:

```powershell
npm ci
npm run dev
```

No vuelvas a copiar .env.example sobre tu .env existente. npm ci sincroniza node_modules con el lockfile actualizado.

## Si empezás en una carpeta nueva

Instalá Node.js 24 y MongoDB Community Server. Abrí PowerShell en la carpeta shipnow extraída:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

El ejemplo usa MongoDB local en 127.0.0.1:27017. README.md contiene instrucciones completas.

## Qué leer

- README.md: instalación, arquitectura, endpoints y pruebas.
- docs/MODULO-1.md: los diez apartados del módulo y defensa oral.
- docs/CODIGO-MODULO-1.md: código completo archivo por archivo.
- docs/VERIFICACION.md: resultados reales y procedencia de la evidencia.
- docs/GIT-ENTREGA.md: guardar esta versión y subirla a GitHub.

No se necesita repetir toda la integración solo por actualizar documentación. Volvé a ejecutar las suites si modificás código o dependencias.
