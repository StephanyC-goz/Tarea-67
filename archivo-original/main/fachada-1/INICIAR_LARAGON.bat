@echo off
setlocal
if not exist "%~dp0FACHADA_EXTERIOR.html" (
  echo No se encuentra FACHADA_EXTERIOR.html junto a este archivo.
  pause
  exit /b 1
)
if not exist "C:\laragon\www\fachada-1\FACHADA_EXTERIOR.html" (
  echo Copia la carpeta fachada-1 a C:\laragon\www\
  echo Luego inicia Apache en Laragon.
  pause
  exit /b 1
)
start "" "http://localhost/fachada-1/FACHADA_EXTERIOR.html"
