# Guardar Módulo 1 en Git y preparar la entrega

Ejecutá los comandos desde shipnow, junto a package.json. Ninguno publica automáticamente el proyecto.

## 1. Comprobar Git y ubicación

```powershell
git --version
Get-Location
Test-Path .\package.json
git status
```

Test-Path debe devolver True. Si Git no se reconoce, instalar Git antes de seguir. Si git status muestra un repositorio existente, no reinicializarlo: comprobar `git rev-parse --show-toplevel` para saber a qué proyecto pertenece.

## 2. Solo si todavía no existe repositorio

```powershell
git init -b main
```

## 3. Verificar exclusiones y preparar archivos

```powershell
git check-ignore .env node_modules/
git add -- .gitignore .env.example .nvmrc package.json package-lock.json README.md LEEME-PRIMERO.md src tests docs
git diff --cached --name-only
```

La lista preparada debe incluir .env.example, pero NO .env ni node_modules. El git add explícito selecciona únicamente el contenido del proyecto. Si ya había archivos preparados previamente, revisarlos también antes de confirmar.

## 4. Crear el commit

```powershell
git commit -m "feat: completar base del modulo 1 de ShipNow"
git status
```

Si Git solicita identidad, configurá nombre y email para este repositorio (reemplazá los ejemplos con tus datos; podés usar el email privado de GitHub):

```powershell
git config user.name "TU NOMBRE"
git config user.email "TU EMAIL DE GITHUB"
git commit -m "feat: completar base del modulo 1 de ShipNow"
```

## 5. Publicar cuando tengas el repositorio de destino

Creá un repositorio vacío en GitHub, sin inicializar README, licencia ni .gitignore. Copiá su URL real. Comprobá primero:

```powershell
git remote -v
git branch --show-current
```

Solo si no existe origin, y tu rama es main, reemplazá la URL y ejecutá:

```powershell
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Si ya hay un origin, verificá su destino antes de cambiarlo. No uses push --force. GitHub puede solicitar autenticación. Asegurá acceso para el evaluador según lo que indique la plataforma.

## Entrega

Presentar la URL del repositorio en la plataforma. No subir node_modules, .env ni bases locales. La documentación y las pruebas forman parte del mismo repositorio. No adjuntar el ZIP como sustituto de la URL si la consigna exige GitHub.
