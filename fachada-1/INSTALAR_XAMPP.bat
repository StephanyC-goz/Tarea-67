@echo off
setlocal
cd /d "%~dp0"
set "DEST=C:\xampp\htdocs\fachada-1"
if not exist "C:\xampp\htdocs" (
  echo No se encuentra la carpeta C:\xampp\htdocs.
  echo Copia fachada-1 a la carpeta web de tu instalacion.
  pause
  exit /b 1
)
for %%I in ("%~dp0.") do set "SOURCE=%%~fI"
for %%I in ("%DEST%") do set "TARGET=%%~fI"
if /I "%SOURCE%"=="%TARGET%" goto ready
robocopy "%~dp0." "%DEST%" /E /XD node_modules .git /XF *.zip >nul
if errorlevel 8 (
  echo Error al copiar el proyecto.
  pause
  exit /b 1
)
:ready
echo Proyecto listo en %DEST%.
echo Inicia Apache y MySQL desde XAMPP.
echo No es necesario compilar: el ZIP incluye public\assets.
echo Si aula3d ya existe, conserva tu base y tus usuarios.
echo Fachada: http://localhost/fachada-1/FACHADA_EXTERIOR.html
echo Cuenta: http://localhost/fachada-1/login.php
pause
