@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "DEST=C:\laragon\www\piramide_senati_fusion"
if not exist "C:\laragon\www" (
  echo ERROR: No existe C:\laragon\www. Instala Laragon o copia manualmente la carpeta.
  pause
  exit /b 1
)
echo Copiando al directorio: %DEST%
if not exist "%DEST%" mkdir "%DEST%"
robocopy "%~dp0" "%DEST%" /E /XD node_modules .git public\assets /XF *.zip >nul
if errorlevel 8 (
 echo ERROR: No fue posible copiar todos los archivos.
 pause
 exit /b 1
)
echo.
echo Copia completada. Ahora instala y compila el frontend.
pushd "%DEST%"
call COMPILAR-FRONTEND.bat
popd
echo.
echo INICIA APACHE y MySQL en Laragon e importa database\schema.sql.
echo Portal: http://localhost/piramide_senati_fusion/
pause
