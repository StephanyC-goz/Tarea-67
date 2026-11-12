-- Base de datos del editor de escenarios 3D
CREATE DATABASE IF NOT EXISTS aula3d
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aula3d;

CREATE TABLE IF NOT EXISTS scenarios (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  width_m DECIMAL(7,2) NOT NULL DEFAULT 20.00,
  depth_m DECIMAL(7,2) NOT NULL DEFAULT 12.00,
  height_m DECIMAL(6,2) NOT NULL DEFAULT 3.40,
  appearance_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scenarios_updated (updated_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS object_catalog (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  object_key VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  category VARCHAR(40) NOT NULL,
  description VARCHAR(180) NULL,
  model_path VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS scenario_objects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scenario_id BIGINT UNSIGNED NOT NULL,
  object_uuid VARCHAR(64) NOT NULL,
  catalog_key VARCHAR(40) NOT NULL,
  label VARCHAR(80) NOT NULL,
  pos_x DECIMAL(10,3) NOT NULL DEFAULT 0,
  pos_y DECIMAL(10,3) NOT NULL DEFAULT 0,
  pos_z DECIMAL(10,3) NOT NULL DEFAULT 0,
  rot_x DECIMAL(10,5) NOT NULL DEFAULT 0,
  rot_y DECIMAL(10,5) NOT NULL DEFAULT 0,
  rot_z DECIMAL(10,5) NOT NULL DEFAULT 0,
  scale_x DECIMAL(7,3) NOT NULL DEFAULT 1,
  scale_y DECIMAL(7,3) NOT NULL DEFAULT 1,
  scale_z DECIMAL(7,3) NOT NULL DEFAULT 1,
  config_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scene_objects_scenario
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  INDEX idx_scene_objects_scenario (scenario_id),
  INDEX idx_scene_objects_catalog (catalog_key)
) ENGINE=InnoDB;

INSERT INTO object_catalog (object_key,label,category,description) VALUES
('desk','Escritorio individual','mobiliario','Mesa independiente'),
('chair','Silla giratoria','mobiliario','Base de cinco radios'),
('aio','PC All-in-One 27 pulgadas','computacion','Monitor integrado con teclado y mouse automáticos'),
('keyboard','Teclado','computacion','Teclado independiente'),
('mouse','Mouse','computacion','Mouse óptico'),
('man','Persona hombre','personas','Figura masculina'),
('woman','Persona mujer','personas','Figura femenina'),
('teacher','Profesor','personas','Docente de pie'),
('wall','Pared','arquitectura','Tramo de pared'),
('door','Puerta de vidrio','arquitectura','Puerta con marco'),
('window','Ventana','arquitectura','Ventana de pared'),
('whiteboard','Pizarra','arquitectura','Pizarra blanca'),
('fluorescent','Fluorescente','equipamiento','Luminaria rectangular'),
('fan','Ventilador','equipamiento','Ventilador de techo'),
('projector','Proyector','equipamiento','Proyector de techo'),
('plant','Planta decorativa','equipamiento','Maceta decorativa')
ON DUPLICATE KEY UPDATE label=VALUES(label),category=VALUES(category),description=VALUES(description);


-- Historial de versiones previo a cada actualización o restauración.
CREATE TABLE IF NOT EXISTS scenario_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scenario_id BIGINT UNSIGNED NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  snapshot_json LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scenario_revision(scenario_id, revision_no),
  CONSTRAINT fk_scenario_version FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Historial de simulaciones (no certifica condiciones reales de evacuación).
CREATE TABLE IF NOT EXISTS simulation_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scenario_id BIGINT UNSIGNED NOT NULL,
  incident_type VARCHAR(24) NOT NULL,
  participants SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  evacuated SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  without_route SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  elapsed_seconds DECIMAL(9,2) NOT NULL DEFAULT 0,
  notes VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sim_run_scenario FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  INDEX idx_sim_runs_scenario (scenario_id,created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS simulation_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT UNSIGNED NOT NULL,
  event_time DECIMAL(9,2) NOT NULL,
  event_type VARCHAR(24) NOT NULL,
  message VARCHAR(400) NOT NULL,
  CONSTRAINT fk_sim_event_run FOREIGN KEY (run_id) REFERENCES simulation_runs(id) ON DELETE CASCADE,
  INDEX idx_sim_events_run (run_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 full_name VARCHAR(100) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 role ENUM('admin','alumno','visitante') NOT NULL DEFAULT 'visitante',
 is_active TINYINT(1) NOT NULL DEFAULT 1,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 last_login_at DATETIME NULL,
 INDEX idx_users_role(role,is_active)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS access_logs (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NULL,
 event VARCHAR(50) NOT NULL,
 detail VARCHAR(150) NOT NULL DEFAULT '',
 ip_address VARCHAR(45) NOT NULL DEFAULT '',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_access_user(user_id,created_at),
 CONSTRAINT fk_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
