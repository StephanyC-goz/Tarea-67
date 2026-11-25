@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set "DEST=C:\xampp\htdocs\piramide_senati_fusion"
if not exist "C:\xampp\htdocs" (
 echo ERROR: No existe C:\xampp\htdocs. Instala XAMPP o copia manualmente la carpeta.
 pause
 exit /b 1
)
if not exist "%DEST%" mkdir "%DEST%"
robocopy "%~dp0" "%DEST%" /E /XD node_modules .git public\assets /XF *.zip >nul
if errorlevel 8 (echo Error al copiar & pause & exit /b 1)
pushd "%DEST%"
call COMPILAR-FRONTEND.bat
popd
echo Inicia Apache y MySQL desde XAMPP. Importa database\schema.sql.
echo http://localhost/piramide_senati_fusion/
pause
