@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo =========================================================
echo    PIRAMIDE SENATI FUSION - PREPARAR FRONTEND 3D
echo =========================================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Falta Node.js. Instala Node.js LTS de nodejs.org
  goto fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm no disponible. Reinstala Node.js.
  goto fail
)
if not exist package.json (
  echo ERROR: Abre la carpeta principal del proyecto.
  goto fail
)
echo [1/2] npm install (requiere internet en la primera ejecucion)
call npm install --no-audit --no-fund
if errorlevel 1 goto fail
echo [2/2] npm run build
call npm run build
if errorlevel 1 goto fail
if not exist "public\assets\editor.js" goto fail
if not exist "public\assets\simulator.js" goto fail
if not exist "public\assets\editor.css" goto fail
echo.
echo OK: interfaz y simulador compilados.
echo Abre http://localhost/piramide_senati_fusion/
echo Si tu Apache usa 8080: http://localhost:8080/piramide_senati_fusion/
echo.
pause
exit /b 0
:fail
echo.
echo No se completo la instalacion. Copia el ERROR mostrado arriba.
pause
exit /b 1
