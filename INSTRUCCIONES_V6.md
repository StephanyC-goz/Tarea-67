# Pirámide SENATI V6 – Roles y mejoras interiores

## Cómo se identifica el tipo de acceso
- **Administrador**: cuenta con `role = admin` en MySQL. Tiene acceso a editor, simulador y administración de usuarios.
- **Alumno**: cuenta con `role = alumno`. Puede iniciar sesión y usar el recorrido / simulador según permisos de la interfaz.
- **Visitante**: cuenta con `role = visitante` o puede entrar desde el botón **Entrar como visitante** del login. Tiene acceso limitado al recorrido.

## Qué se mejoró en esta versión
- Salones con **20 escritorios equipados** por piso.
- **Alumnos sentados** en los escritorios y **profesor** al frente.
- **Ventiladores** en el techo y señalización interior.
- Conserva la **puerta lateral** y mejora la restricción de paso hacia la caja de escaleras.
- Formulario de registro con selección de tipo de cuenta: **visitante** o **alumno**.
- Panel de administración actualizado para asignar los roles: visitante, alumno o administrador.

## Si vienes desde V5
Ejecuta en phpMyAdmin:
1. `database/ACTUALIZAR_BD_EXISTENTE.sql`
2. Si ya tenías usuarios con rol `usuario`, el script los convierte a `alumno`.

## Compilación
```bash
npm install
npm run build
```
