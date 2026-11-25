-- Ejecutar una sola vez si ya tienes creada la base aula3d de la versión anterior.
-- Añade la configuración visual a los escenarios existentes.
ALTER TABLE scenarios ADD COLUMN appearance_json JSON NULL;
