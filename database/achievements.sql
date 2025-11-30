-- Tabla de logros/badges
CREATE TABLE IF NOT EXISTS logro (
  id_logro INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  icono VARCHAR(50) DEFAULT 'workspace_premium',
  color VARCHAR(20) DEFAULT '#3b82f6',
  puntos INT DEFAULT 10,
  categoria VARCHAR(50),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de logros desbloqueados por usuarios
CREATE TABLE IF NOT EXISTS logro_alumno (
  id_logro_alumno INT AUTO_INCREMENT PRIMARY KEY,
  logro_id INT NOT NULL,
  alumno_id INT NOT NULL,
  fecha_desbloqueo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (logro_id) REFERENCES logro(id_logro) ON DELETE CASCADE,
  FOREIGN KEY (alumno_id) REFERENCES alumno(id_alumno) ON DELETE CASCADE,
  UNIQUE KEY unique_logro_alumno (logro_id, alumno_id)
);

-- Insertar logros por defecto
INSERT INTO logro (codigo, nombre, descripcion, icono, color, puntos, categoria) VALUES
('primer_curso', 'Primer Curso', 'Completa tu primer curso', 'school', '#3b82f6', 10, 'progreso'),
('curso_completado', 'Curso Completado', 'Completa un curso exitosamente', 'check_circle', '#10b981', 20, 'progreso'),
('estudiante_dedicado', 'Estudiante Dedicado', 'Completa 5 cursos', 'workspace_premium', '#8b5cf6', 50, 'progreso'),
('perfeccionista', 'Perfeccionista', 'Obtén 100% en un cuestionario', 'star', '#f59e0b', 30, 'rendimiento'),
('rapido', 'Rápido', 'Completa una lección en menos de 5 minutos', 'speed', '#ef4444', 15, 'rendimiento'),
('explorador', 'Explorador', 'Accede a 10 cursos diferentes', 'explore', '#06b6d4', 25, 'exploracion'),
('social', 'Social', 'Escribe 5 reseñas', 'rate_review', '#ec4899', 20, 'social'),
('ayudante', 'Ayudante', 'Responde 10 preguntas en foros', 'forum', '#14b8a6', 30, 'social'),
('certificado', 'Certificado', 'Obtén tu primer certificado', 'workspace_premium', '#f59e0b', 40, 'logro'),
('maestro', 'Maestro', 'Completa 10 cursos con calificación perfecta', 'emoji_events', '#8b5cf6', 100, 'logro');

