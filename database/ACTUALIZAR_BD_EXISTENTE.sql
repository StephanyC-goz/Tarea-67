USE aula3d;


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


-- V6: ampliar roles de acceso
ALTER TABLE users MODIFY role ENUM('admin','usuario','alumno','visitante') NOT NULL DEFAULT 'visitante';
UPDATE users SET role='alumno' WHERE role='usuario';
ALTER TABLE users MODIFY role ENUM('admin','alumno','visitante') NOT NULL DEFAULT 'visitante';
