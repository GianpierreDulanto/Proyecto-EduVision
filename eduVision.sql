
CREATE DATABASE IF NOT EXISTS sistema_cursos;
USE sistema_cursos;

CREATE TABLE usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  correo VARCHAR(150) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  rol ENUM('admin','docente','alumno') NOT NULL,
  estado ENUM('activo','inactivo') DEFAULT 'activo'
);

CREATE TABLE docente (
  id_docente INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  especialidad VARCHAR(100),
  experiencia TEXT,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id_usuario)
);

CREATE TABLE alumno (
  id_alumno INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuario(id_usuario)
);

CREATE TABLE categoria (
  id_categoria INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE TABLE grado (
  id_grado INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  descripcion TEXT
);

CREATE TABLE curso (
  id_curso INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  docente_id INT,
  id_categoria INT,
  id_grado INT,
  estado ENUM('pendiente','aprobado','rechazado','publicado') DEFAULT 'pendiente',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  id_cuestionario INT NULL,
  FOREIGN KEY (docente_id) REFERENCES docente(id_docente),
  FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
  FOREIGN KEY (id_grado) REFERENCES grado(id_grado)
);

CREATE TABLE alumno_curso (
  id_alumno_curso INT AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT NOT NULL,
  curso_id INT NOT NULL,
  fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
  finalizado BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (alumno_id) REFERENCES alumno(id_alumno),
  FOREIGN KEY (curso_id) REFERENCES curso(id_curso)
);

CREATE TABLE contenido (
  id_contenido INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  seccion VARCHAR(100),
  texto LONGTEXT,
  estado ENUM('pendiente','aprobado','rechazado','publicado') DEFAULT 'pendiente',
  fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  FOREIGN KEY (curso_id) REFERENCES curso(id_curso),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id_usuario)
);

CREATE TABLE tipo_recurso (
  id_tipo INT AUTO_INCREMENT PRIMARY KEY,
  nombre_tipo ENUM('PDF','Audio','Enlace YouTube') NOT NULL
);

CREATE TABLE recurso (
  id_recurso INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  tipo_id INT NOT NULL,
  titulo VARCHAR(200),
  url VARCHAR(300),
  descripcion TEXT,
  estado ENUM('pendiente','aprobado','rechazado','publicado') DEFAULT 'pendiente',
  fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  FOREIGN KEY (curso_id) REFERENCES curso(id_curso),
  FOREIGN KEY (tipo_id) REFERENCES tipo_recurso(id_tipo),
  FOREIGN KEY (usuario_id) REFERENCES usuario(id_usuario)
);

CREATE TABLE cuestionario (
  id_cuestionario INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  titulo VARCHAR(200),
  descripcion TEXT,
  estado ENUM('activo','inactivo') DEFAULT 'activo',
  FOREIGN KEY (curso_id) REFERENCES curso(id_curso)
);

CREATE TABLE pregunta (
  id_pregunta INT AUTO_INCREMENT PRIMARY KEY,
  cuestionario_id INT NOT NULL,
  texto_pregunta TEXT NOT NULL,
  FOREIGN KEY (cuestionario_id) REFERENCES cuestionario(id_cuestionario)
);

CREATE TABLE opcion (
  id_opcion INT AUTO_INCREMENT PRIMARY KEY,
  pregunta_id INT NOT NULL,
  texto_opcion VARCHAR(255) NOT NULL,
  es_correcta BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (pregunta_id) REFERENCES pregunta(id_pregunta)
);

CREATE TABLE encuesta_satisfaccion (
  id_encuesta INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  alumno_id INT NULL,
  gusto_curso TEXT,
  mejora_curso TEXT,
  nivel_satisfaccion ENUM('Muy satisfecho','Satisfecho','Neutral','Insatisfecho','Muy insatisfecho'),
  fecha_respuesta DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (curso_id) REFERENCES curso(id_curso),
  FOREIGN KEY (alumno_id) REFERENCES alumno(id_alumno)
);

CREATE TABLE aprobacion_admin (
  id_aprobacion INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  objeto_tipo ENUM('curso','contenido','recurso') NOT NULL,
  objeto_id INT NOT NULL,
  estado ENUM('pendiente','aprobado','rechazado') DEFAULT 'pendiente',
  comentario TEXT,
  fecha_revision DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES usuario(id_usuario)
);
INSERT INTO usuario (nombre, apellido, correo, contraseña, rol, estado) VALUES
('Carlos', 'Mendoza', 'carlos.mendoza@admin.edu', 'admin123', 'admin', 'activo'),
('María', 'Torres', 'maria.torres@admin.edu', 'admin456', 'admin', 'activo'),
('Ana', 'Rodríguez', 'ana.rodriguez@docente.edu', 'doc123', 'docente', 'activo'),
('Pedro', 'García', 'pedro.garcia@docente.edu', 'doc456', 'docente', 'activo'),
('Laura', 'Martínez', 'laura.martinez@docente.edu', 'doc789', 'docente', 'activo'),
('Roberto', 'Sánchez', 'roberto.sanchez@docente.edu', 'doc012', 'docente', 'activo'),
('Carmen', 'López', 'carmen.lopez@docente.edu', 'doc345', 'docente', 'activo'),
('Miguel', 'Fernández', 'miguel.fernandez@docente.edu', 'doc678', 'docente', 'activo'),
('Ricardo', 'Vega', 'ricardo.vega@docente.edu', 'doc901', 'docente', 'activo'),
('Elena', 'Campos', 'elena.campos@docente.edu', 'doc234', 'docente', 'activo'),
('Juan', 'Pérez', 'juan.perez@alumno.edu', 'alum123', 'alumno', 'activo'),
('Sofía', 'González', 'sofia.gonzalez@alumno.edu', 'alum456', 'alumno', 'activo'),
('Diego', 'Ramírez', 'diego.ramirez@alumno.edu', 'alum789', 'alumno', 'activo'),
('Valentina', 'Castro', 'valentina.castro@alumno.edu', 'alum012', 'alumno', 'activo'),
('Mateo', 'Flores', 'mateo.flores@alumno.edu', 'alum345', 'alumno', 'activo'),
('Isabella', 'Morales', 'isabella.morales@alumno.edu', 'alum678', 'alumno', 'activo'),
('Lucas', 'Herrera', 'lucas.herrera@alumno.edu', 'alum901', 'alumno', 'activo'),
('Camila', 'Vargas', 'camila.vargas@alumno.edu', 'alum234', 'alumno', 'activo'),
('Sebastián', 'Rojas', 'sebastian.rojas@alumno.edu', 'alum567', 'alumno', 'activo'),
('Martina', 'Silva', 'martina.silva@alumno.edu', 'alum890', 'alumno', 'activo'),
('Andrés', 'Mendez', 'andres.mendez@alumno.edu', 'alum111', 'alumno', 'activo'),
('Valeria', 'Ortiz', 'valeria.ortiz@alumno.edu', 'alum222', 'alumno', 'activo'),
('Gabriel', 'Reyes', 'gabriel.reyes@alumno.edu', 'alum333', 'alumno', 'activo'),
('Lucía', 'Paredes', 'lucia.paredes@alumno.edu', 'alum444', 'alumno', 'activo');

INSERT INTO docente (usuario_id, especialidad, experiencia) VALUES
(3, 'Aritmética', '8 años enseñando matemáticas básicas y operaciones numéricas'),
(4, 'Biología', '10 años en ciencias naturales y biología celular'),
(5, 'Gramática', '6 años en lengua española y análisis gramatical'),
(6, 'Historia Universal', '12 años en historia y ciencias sociales'),
(7, 'Inglés', '7 años enseñando inglés como segunda lengua'),
(8, 'Trigonometría', '9 años en matemáticas avanzadas y funciones trigonométricas'),
(9, 'Química', '11 años en ciencias químicas y experimentación'),
(10, 'Física', '8 años en física general y mecánica');

INSERT INTO alumno (usuario_id) VALUES
(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),(21),(22),(23),(24);

INSERT INTO categoria (nombre, descripcion) VALUES
('Aritmética', 'Rama de las matemáticas que estudia los números y las operaciones básicas'),
('Álgebra', 'Rama de las matemáticas que utiliza símbolos y letras para representar números y cantidades'),
('Geometría', 'Rama de las matemáticas que estudia las propiedades y medidas de figuras en el espacio'),
('Trigonometría', 'Rama de las matemáticas que estudia las relaciones entre los lados y ángulos de triángulos'),
('Biología', 'Ciencia que estudia los seres vivos y sus procesos vitales'),
('Química', 'Ciencia que estudia la composición, estructura y propiedades de la materia'),
('Física', 'Ciencia que estudia las propiedades de la materia, la energía y sus interacciones'),
('Gramática', 'Parte de la lingüística que estudia la estructura de las palabras y sus combinaciones'),
('Literatura', 'Arte que utiliza la palabra como medio de expresión'),
('Historia Universal', 'Estudio de los acontecimientos del pasado de la humanidad a nivel mundial'),
('Historia del Perú', 'Estudio de los acontecimientos históricos ocurridos en el territorio peruano'),
('Geografía', 'Ciencia que estudia la superficie terrestre y la distribución de fenómenos físicos y humanos'),
('Inglés', 'Idioma germánico occidental hablado principalmente en países anglosajones'),
('Educación Física', 'Disciplina que se centra en el desarrollo físico y motor del ser humano'),
('Arte', 'Expresión de la actividad humana mediante la cual se manifiesta la creatividad');

INSERT INTO grado (nombre, descripcion) VALUES
('1° Primaria', 'Primer grado de educación primaria'),
('2° Primaria', 'Segundo grado de educación primaria'),
('3° Primaria', 'Tercer grado de educación primaria'),
('4° Primaria', 'Cuarto grado de educación primaria'),
('5° Primaria', 'Quinto grado de educación primaria'),
('6° Primaria', 'Sexto grado de educación primaria'),
('1° Secundaria', 'Primer año de educación secundaria'),
('2° Secundaria', 'Segundo año de educación secundaria'),
('3° Secundaria', 'Tercer año de educación secundaria'),
('4° Secundaria', 'Cuarto año de educación secundaria'),
('5° Secundaria', 'Quinto año de educación secundaria');

INSERT INTO curso (titulo, descripcion, docente_id, id_categoria, id_grado, estado, fecha_creacion) VALUES
('Números naturales del 1 al 100', 'Reconocimiento y escritura de números naturales hasta el cien', 1, 1, 1, 'aprobado', '2025-01-05 09:00:00'),
('Suma y resta básica', 'Operaciones de adición y sustracción con números menores a 20', 1, 1, 1, 'aprobado', '2025-01-06 10:00:00'),
('Números hasta el 1000', 'Lectura, escritura y comparación de números de tres cifras', 1, 1, 2, 'aprobado', '2025-01-07 11:00:00'),
('Multiplicación por una cifra', 'Introducción a la multiplicación y tablas hasta el 10', 1, 1, 3, 'aprobado', '2025-01-08 09:30:00'),
('División exacta', 'Concepto de división y divisiones simples', 1, 1, 3, 'aprobado', '2025-01-09 10:30:00'),
('Fracciones básicas', 'Introducción a fracciones: medios, tercios y cuartos', 1, 1, 4, 'aprobado', '2025-01-10 11:30:00'),
('Números decimales', 'Lectura y escritura de números decimales', 1, 1, 5, 'aprobado', '2025-01-11 08:00:00'),
('Operaciones con números enteros', 'Suma, resta, multiplicación y división de enteros', 1, 1, 7, 'aprobado', '2025-01-12 09:00:00'),
('Potenciación y radicación', 'Propiedades de potencias y raíces cuadradas', 1, 1, 8, 'aprobado', '2025-01-13 10:00:00'),
('Introducción a las variables', 'Concepto de variable y expresiones algebraicas simples', 1, 2, 6, 'aprobado', '2025-01-14 11:00:00'),
('Ecuaciones de primer grado', 'Resolución de ecuaciones lineales con una incógnita', 1, 2, 8, 'aprobado', '2025-01-15 08:30:00'),
('Sistemas de ecuaciones', 'Métodos de resolución de sistemas 2x2', 1, 2, 9, 'pendiente', '2025-01-16 09:30:00'),
('Productos notables', 'Binomio al cuadrado y suma por diferencia', 1, 2, 9, 'aprobado', '2025-01-17 10:30:00'),
('Factorización', 'Técnicas de factorización de polinomios', 6, 2, 10, 'aprobado', '2025-01-18 11:30:00'),
('Figuras geométricas planas', 'Reconocimiento de triángulos, cuadrados, círculos y rectángulos', 6, 3, 1, 'aprobado', '2025-01-19 08:00:00'),
('Perímetros de figuras', 'Cálculo del perímetro de polígonos regulares', 6, 3, 4, 'aprobado', '2025-01-20 09:00:00'),
('Áreas de figuras planas', 'Fórmulas para calcular áreas de triángulos, cuadrados y rectángulos', 6, 3, 5, 'aprobado', '2025-01-21 10:00:00'),
('Clasificación de triángulos', 'Triángulos según sus lados y ángulos', 6, 3, 7, 'aprobado', '2025-01-22 11:00:00'),
('Teorema de Pitágoras', 'Aplicación del teorema en triángulos rectángulos', 6, 3, 8, 'aprobado', '2025-01-23 08:30:00'),
('Polígonos regulares', 'Propiedades y clasificación de polígonos', 6, 3, 8, 'aprobado', '2025-01-24 09:30:00'),
('Razones trigonométricas', 'Seno, coseno y tangente en el triángulo rectángulo', 6, 4, 9, 'aprobado', '2025-01-25 10:30:00'),
('Identidades trigonométricas fundamentales', 'Demostración y aplicación de identidades básicas', 6, 4, 10, 'aprobado', '2025-01-26 11:30:00'),
('Ángulos notables', 'Valores de razones para 30°, 45° y 60°', 6, 4, 9, 'aprobado', '2025-01-27 08:00:00'),
('Resolución de triángulos', 'Aplicación de trigonometría para resolver triángulos', 6, 4, 10, 'aprobado', '2025-01-28 09:00:00'),
('Los seres vivos y sus características', 'Clasificación básica de los seres vivos', 2, 5, 3, 'aprobado', '2025-01-29 10:00:00'),
('Las plantas y sus partes', 'Raíz, tallo, hojas, flores y frutos', 2, 5, 4, 'aprobado', '2025-01-30 11:00:00'),
('El cuerpo humano', 'Sistemas del cuerpo humano y sus funciones', 2, 5, 5, 'aprobado', '2025-01-31 08:30:00'),
('La célula', 'Estructura celular y tipos de células', 2, 5, 7, 'aprobado', '2025-02-01 09:30:00'),
('Sistema digestivo', 'Órganos y procesos de la digestión', 2, 5, 8, 'aprobado', '2025-02-02 10:30:00'),
('Fotosíntesis', 'Proceso de producción de alimento en las plantas', 2, 5, 8, 'aprobado', '2025-02-03 11:30:00'),
('Genética mendeliana', 'Leyes de Mendel y herencia biológica', 2, 5, 10, 'aprobado', '2025-02-04 08:00:00'),
('La materia y sus estados', 'Sólido, líquido y gaseoso', 7, 6, 5, 'aprobado', '2025-02-05 09:00:00'),
('Mezclas y soluciones', 'Tipos de mezclas y métodos de separación', 7, 6, 6, 'aprobado', '2025-02-06 10:00:00'),
('La tabla periódica', 'Organización de elementos químicos', 7, 6, 8, 'aprobado', '2025-02-07 11:00:00'),
('Enlaces químicos', 'Iónicos, covalentes y metálicos', 7, 6, 9, 'rechazado', '2025-02-08 08:30:00'),
('Reacciones químicas', 'Tipos de reacciones y balanceo', 7, 6, 9, 'aprobado', '2025-02-09 09:30:00'),
('Estequiometría', 'Cálculos de cantidades en reacciones químicas', 7, 6, 10, 'aprobado', '2025-02-10 10:30:00'),
('Fuerza y movimiento', 'Conceptos básicos de fuerza y desplazamiento', 8, 7, 6, 'aprobado', '2025-02-11 11:30:00'),
('Energía y sus formas', 'Tipos de energía y transformaciones', 8, 7, 7, 'aprobado', '2025-02-12 08:00:00'),
('Leyes de Newton', 'Primera, segunda y tercera ley del movimiento', 8, 7, 9, 'aprobado', '2025-02-13 09:00:00'),
('Trabajo y potencia', 'Conceptos y cálculo de trabajo mecánico', 8, 7, 9, 'aprobado', '2025-02-14 10:00:00'),
('Electricidad y magnetismo', 'Fenómenos eléctricos y magnéticos', 8, 7, 10, 'aprobado', '2025-02-15 11:00:00'),
('El sustantivo', 'Clases y accidentes gramaticales del sustantivo', 3, 8, 6, 'aprobado', '2025-02-16 08:30:00'),
('El adjetivo', 'Tipos de adjetivos y concordancia', 3, 8, 6, 'aprobado', '2025-02-17 09:30:00'),
('El verbo', 'Conjugación verbal y tiempos', 3, 8, 7, 'aprobado', '2025-02-18 10:30:00'),
('Análisis sintáctico', 'Sujeto, predicado y complementos', 3, 8, 8, 'aprobado', '2025-02-19 11:30:00'),
('Oraciones compuestas', 'Coordinadas y subordinadas', 3, 8, 9, 'aprobado', '2025-02-20 08:00:00'),
('Cuentos y fábulas', 'Lectura y análisis de textos narrativos breves', 3, 9, 3, 'aprobado', '2025-02-21 09:00:00'),
('Poesía infantil', 'Rimas, versos y estrofas', 3, 9, 4, 'aprobado', '2025-02-22 10:00:00'),
('Literatura medieval', 'Obras y autores de la Edad Media', 3, 9, 9, 'aprobado', '2025-02-23 11:00:00'),
('El Romanticismo', 'Características del movimiento romántico', 3, 9, 10, 'aprobado', '2025-02-24 08:30:00'),
('Civilizaciones antiguas', 'Egipto, Mesopotamia y Grecia', 4, 10, 7, 'aprobado', '2025-02-25 09:30:00'),
('El Imperio Romano', 'Auge y caída del Imperio Romano', 4, 10, 7, 'aprobado', '2025-02-26 10:30:00'),
('La Edad Media', 'Feudalismo y sociedad medieval', 4, 10, 8, 'aprobado', '2025-02-27 11:30:00'),
('Revolución Francesa', 'Causas y consecuencias de la revolución', 4, 10, 9, 'aprobado', '2025-02-28 08:00:00'),
('Segunda Guerra Mundial', 'Desarrollo y consecuencias del conflicto', 4, 10, 10, 'aprobado', '2025-03-01 09:00:00'),
('Culturas preincaicas', 'Chavín, Paracas, Nazca, Mochica', 4, 11, 8, 'aprobado', '2025-03-02 10:00:00'),
('El Tahuantinsuyo', 'Organización del Imperio Inca', 4, 11, 8, 'aprobado', '2025-03-03 11:00:00'),
('La Conquista del Perú', 'Llegada de los españoles y caída del imperio', 4, 11, 9, 'aprobado', '2025-03-04 08:30:00'),
('Independencia del Perú', 'Proceso emancipador y próceres', 4, 11, 9, 'aprobado', '2025-03-05 09:30:00'),
('Alphabet and numbers', 'Alfabeto y números en inglés', 5, 13, 4, 'aprobado', '2025-03-06 10:30:00'),
('Greetings and introductions', 'Saludos y presentaciones básicas', 5, 13, 5, 'aprobado', '2025-03-07 11:30:00'),
('Present Simple', 'Estructura y uso del presente simple', 5, 13, 7, 'aprobado', '2025-03-08 08:00:00'),
('Past Simple', 'Verbos regulares e irregulares en pasado', 5, 13, 8, 'aprobado', '2025-03-09 09:00:00'),
('Present Continuous', 'Presente continuo y sus usos', 5, 13, 8, 'aprobado', '2025-03-10 10:00:00'),
('Modal verbs', 'Can, could, should, must', 5, 13, 9, 'aprobado', '2025-03-11 11:00:00'),
('Conditionals', 'Tipos de condicionales en inglés', 5, 13, 10, 'aprobado', '2025-03-12 08:30:00');

INSERT INTO alumno_curso (alumno_id, curso_id, fecha_inscripcion, finalizado) VALUES
(1, 1, '2025-03-13 08:00:00', TRUE),
(1, 2, '2025-03-13 08:05:00', TRUE),
(1, 15, '2025-03-13 08:10:00', FALSE),
(2, 1, '2025-03-13 09:00:00', FALSE),
(2, 2, '2025-03-13 09:05:00', FALSE),
(3, 8, '2025-03-14 08:00:00', TRUE),
(3, 11, '2025-03-14 08:05:00', FALSE),
(3, 18, '2025-03-14 08:10:00', FALSE),
(4, 8, '2025-03-14 09:00:00', FALSE),
(4, 28, '2025-03-14 09:05:00', FALSE),
(5, 21, '2025-03-15 08:00:00', TRUE),
(5, 40, '2025-03-15 08:05:00', FALSE),
(6, 21, '2025-03-15 09:00:00', FALSE),
(6, 22, '2025-03-15 09:05:00', FALSE),
(7, 4, '2025-03-16 08:00:00', TRUE),
(7, 16, '2025-03-16 08:05:00', FALSE),
(8, 7, '2025-03-16 09:00:00', FALSE),
(8, 17, '2025-03-16 09:05:00', FALSE),
(9, 13, '2025-03-17 08:00:00', FALSE),
(9, 36, '2025-03-17 08:05:00', FALSE),
(10, 62, '2025-03-17 09:00:00', FALSE),
(10, 63, '2025-03-17 09:05:00', FALSE),
(11, 8, '2025-03-18 08:00:00', TRUE),
(11, 19, '2025-03-18 08:05:00', FALSE),
(12, 21, '2025-03-18 09:00:00', FALSE),
(12, 40, '2025-03-18 09:05:00', FALSE),
(13, 11, '2025-03-19 08:00:00', FALSE),
(13, 34, '2025-03-19 08:05:00', FALSE),
(14, 62, '2025-03-19 09:00:00', TRUE),
(14, 64, '2025-03-19 09:05:00', FALSE);

INSERT INTO contenido (curso_id, seccion, texto, estado, fecha_subida, usuario_id) VALUES
(1, 'Introducción', 'Los números naturales son aquellos que utilizamos para contar. Comienzan desde el 1 y continúan infinitamente: 1, 2, 3, 4...', 'aprobado', '2025-03-13 10:00:00', 3),
(1, 'Escritura de números', 'Para escribir números usamos diez símbolos llamados dígitos: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.', 'aprobado', '2025-03-13 10:15:00', 3),
(8, 'Definición', 'Los números enteros incluyen los números positivos, negativos y el cero. Se representan con la letra Z.', 'aprobado', '2025-03-14 10:00:00', 3),
(8, 'Operaciones', 'Para sumar enteros del mismo signo, sumamos y conservamos el signo. Si son de distinto signo, restamos y ponemos el signo del mayor.', 'aprobado', '2025-03-14 10:15:00', 3),
(11, 'Concepto de ecuación', 'Una ecuación es una igualdad que contiene una o más variables. El objetivo es encontrar el valor de la variable.', 'aprobado', '2025-03-15 09:00:00', 3),
(11, 'Pasos de resolución', 'Para resolver: eliminar paréntesis, agrupar términos semejantes, despejar la variable y comprobar.', 'aprobado', '2025-03-15 09:15:00', 3),
(18, 'Clasificación', 'Los triángulos según sus lados son: equiláteros (3 lados iguales), isósceles (2 lados iguales) y escalenos (todos diferentes).', 'aprobado', '2025-03-16 10:00:00', 8),
(19, 'Teorema', 'El teorema de Pitágoras establece que en todo triángulo rectángulo: a² + b² = c², donde c es la hipotenusa.', 'aprobado', '2025-03-16 10:30:00', 8),
(21, 'Razones básicas', 'En un triángulo rectángulo: seno = cateto opuesto/hipotenusa, coseno = cateto adyacente/hipotenusa, tangente = cateto opuesto/cateto adyacente.', 'aprobado', '2025-03-17 11:00:00', 8),
(28, 'Teoría celular', 'Todos los seres vivos están formados por células. La célula es la unidad básica de vida. Toda célula proviene de otra preexistente.', 'aprobado', '2025-03-18 09:00:00', 4),
(28, 'Tipos de células', 'Procariotas: sin núcleo definido (bacterias). Eucariotas: con núcleo definido (animales y plantas).', 'aprobado', '2025-03-18 09:15:00', 4),
(34, 'Elementos', 'La tabla periódica organiza los elementos químicos según su número atómico. Los elementos se agrupan en períodos y grupos.', 'aprobado', '2025-03-19 10:00:00', 9),
(40, 'Leyes del movimiento', 'Primera ley: un cuerpo permanece en reposo o en movimiento rectilíneo uniforme a menos que actúe una fuerza sobre él.', 'aprobado', '2025-03-20 11:00:00', 10),
(43, 'Definición', 'Los sustantivos son palabras que nombran personas, animales, cosas, lugares o ideas.', 'aprobado', '2025-03-21 08:00:00', 5),
(43, 'Clasificación', 'Comunes y propios, concretos y abstractos, individuales y colectivos, contables y no contables.', 'aprobado', '2025-03-21 08:15:00', 5),
(52, 'Mesopotamia', 'Región ubicada entre los ríos Tigris y Éufrates. Cuna de importantes civilizaciones como los sumerios y babilonios.', 'aprobado', '2025-03-22 09:00:00', 6),
(62, 'Estructura', 'El presente simple se forma con el verbo en infinitivo sin TO. En tercera persona singular se agrega -s o -es.', 'aprobado', '2025-03-23 10:00:00', 7),
(62, 'Usos', 'Se usa para expresar hábitos, rutinas, verdades universales y hechos permanentes.', 'aprobado', '2025-03-23 10:15:00', 7);

INSERT INTO tipo_recurso (nombre_tipo) VALUES
('PDF'),
('Audio'),
('Enlace YouTube');

INSERT INTO recurso (curso_id, tipo_id, titulo, url, descripcion, estado, fecha_subida, usuario_id) VALUES
(1, 1, 'Guía de números naturales', NULL, 'Material didáctico con ejercicios de reconocimiento de números', 'aprobado', '2025-03-13 12:00:00', 3),
(1, 3, 'Video: Contando hasta 100', NULL, 'Tutorial animado para aprender a contar', 'aprobado', '2025-03-13 12:30:00', 3),
(8, 1, 'Ejercicios de números enteros', NULL, 'Hoja de práctica con operaciones', 'aprobado', '2025-03-14 13:00:00', 3),
(8, 3, 'Video: Suma de enteros', NULL, 'Explicación visual de suma y resta', 'aprobado', '2025-03-14 13:30:00', 3),
(11, 1, 'Problemas de ecuaciones', NULL, 'Colección de ejercicios resueltos', 'aprobado', '2025-03-15 10:00:00', 3),
(11, 3, 'Video: Despejando variables', NULL, 'Tutorial paso a paso', 'aprobado', '2025-03-15 10:30:00', 3),
(18, 1, 'Clasificación de triángulos', NULL, 'Esquema con ejemplos visuales', 'aprobado', '2025-03-16 11:00:00', 8),
(19, 1, 'Guía de Pitágoras', NULL, 'Ejercicios de aplicación del teorema', 'aprobado', '2025-03-16 11:30:00', 8),
(21, 3, 'Video: Razones trigonométricas', NULL, 'Explicación animada', 'aprobado', '2025-03-17 12:00:00', 8),
(21, 1, 'Tabla de valores', NULL, 'Valores de seno, coseno y tangente', 'aprobado', '2025-03-17 12:30:00', 8),
(28, 2, 'Audio: La célula', NULL, 'Explicación narrada sobre estructura celular', 'aprobado', '2025-03-18 10:00:00', 4),
(28, 1, 'Diagrama celular', NULL, 'Esquema con organelos etiquetados', 'aprobado', '2025-03-18 10:30:00', 4),
(34, 1, 'La tabla periódica ilustrada', NULL, 'Tabla con información de cada elemento', 'aprobado', '2025-03-19 11:00:00',4),
(34, 3, 'Video: Elementos químicos', NULL, 'Explicación de grupos y períodos', 'aprobado', '2025-03-19 11:30:00', 9),
(40, 1, 'Guía de las Leyes de Newton', NULL, 'Ejemplos prácticos de cada ley', 'aprobado', '2025-03-20 12:00:00', 10),
(40, 3, 'Video: Fuerza y movimiento', NULL, 'Demostración experimental', 'aprobado', '2025-03-20 12:30:00', 10),
(43, 1, 'Cuadro de sustantivos', NULL, 'Clasificación completa con ejemplos', 'pendiente', '2025-03-21 09:00:00', 5),
(43, 3, 'Video: El sustantivo', NULL, 'Explicación animada', 'aprobado', '2025-03-21 09:30:00', 5),
(52, 1, 'Mapa de Mesopotamia', NULL, 'Ubicación geográfica de civilizaciones', 'aprobado', '2025-03-22 10:00:00', 6),
(52, 3, 'Video: Civilizaciones antiguas', NULL, 'Documental educativo', 'aprobado', '2025-03-22 10:30:00', 6),
(62, 2, 'Audio: Present Simple Practice', NULL, 'Ejercicios de pronunciación', 'aprobado', '2025-03-23 11:00:00', 7),
(62, 1, 'Grammar Guide', NULL, 'Guía completa con ejemplos', 'aprobado', '2025-03-23 11:30:00', 7),
(62, 3, 'Video: Present Simple Explained', NULL, 'Explicación detallada', 'aprobado', '2025-03-23 12:00:00', 7);

INSERT INTO cuestionario (curso_id, titulo, descripcion, estado) VALUES
(1, 'Evaluación de números naturales', 'Reconocimiento y escritura de números del 1 al 100', 'activo'),
(8, 'Quiz de números enteros', 'Operaciones con números positivos y negativos', 'activo'),
(11, 'Evaluación de ecuaciones', 'Resolución de ecuaciones lineales', 'activo'),
(18, 'Quiz de triángulos', 'Clasificación y propiedades', 'activo'),
(19, 'Test de Pitágoras', 'Aplicación del teorema', 'activo'),
(21, 'Evaluación trigonométrica', 'Razones trigonométricas básicas', 'activo'),
(28, 'Quiz de biología celular', 'Estructura y función de células', 'activo'),
(34, 'Test de química', 'Elementos y tabla periódica', 'activo'),
(40, 'Evaluación de física', 'Leyes de Newton', 'activo'),
(43, 'Quiz de gramática', 'El sustantivo', 'activo'),
(52, 'Test de historia', 'Civilizaciones antiguas', 'activo'),
(62, 'Present Simple Test', 'Evaluación de presente simple', 'activo');

INSERT INTO pregunta (cuestionario_id, texto_pregunta) VALUES
(1, '¿Qué número viene después del 49?'),
(1, '¿Cuál es el número mayor: 78 o 87?'),
(1, '¿Cómo se escribe el número sesenta y cinco?'),
(2, '¿Cuál es el resultado de: -8 + 5?'),
(2, '¿Cuánto es: 12 - (-7)?'),
(2, 'Si multiplicas -4 × -6, el resultado es:'),
(2, '¿Cuál es el resultado de: -15 ÷ 3?'),
(3, '¿Cuál es el valor de x en: 2x + 5 = 13?'),
(3, 'Resuelve: 3x - 7 = 11'),
(3, 'Si 5x = 25, entonces x es igual a:'),
(3, '¿Qué valor de x satisface: x/4 = 3?'),
(4, '¿Cuánto suman los ángulos internos de un triángulo?'),
(4, 'Un triángulo con tres lados iguales se llama:'),
(4, 'Un triángulo isósceles tiene:'),
(4, '¿Cómo se llama el triángulo que tiene un ángulo de 90°?'),
(5, '¿Qué dice el teorema de Pitágoras?'),
(5, 'En un triángulo rectángulo con catetos de 3 y 4, la hipotenusa mide:'),
(5, '¿Cuál es el nombre del lado más largo del triángulo rectángulo?'),
(6, 'En un triángulo rectángulo, el seno de un ángulo es:'),
(6, '¿Cuál es el valor de cos(0°)?'),
(6, 'La tangente de un ángulo es igual a:'),
(6, '¿Cuál es el valor de sen(90°)?'),
(7, '¿Qué organelo es responsable de la producción de energía?'),
(7, '¿Cuál es la función del núcleo celular?'),
(7, '¿Qué estructura protege a la célula vegetal?'),
(7, '¿Dónde se realiza la síntesis de proteínas?'),
(8, '¿Cuál es el símbolo químico del oxígeno?'),
(8, '¿Cuántos electrones tiene el átomo de carbono?'),
(8, '¿Qué elemento tiene el número atómico 1?'),
(8, '¿Cómo se llama el elemento con símbolo Fe?'),
(9, '¿Qué establece la primera ley de Newton?'),
(9, '¿Qué dice la segunda ley de Newton?'),
(9, '¿Cómo se expresa la tercera ley de Newton?'),
(10, '¿Cuál de estos es un sustantivo propio?'),
(10, 'Identifica el sustantivo abstracto:'),
(10, '¿Qué tipo de sustantivo es "manada"?'),
(10, '¿Cuál es un sustantivo concreto?'),
(11, '¿Entre qué dos ríos se ubicaba Mesopotamia?'),
(11, '¿Qué civilización inventó la escritura cuneiforme?'),
(11, '¿Qué construyeron los egipcios para enterrar a sus faraones?'),
(11, '¿Qué ciudad-estado griega era conocida por sus guerreros?'),
(12, 'She _____ to school every day.'),
(12, 'They _____ football on Sundays.'),
(12, 'He _____ his homework in the evening.'),
(12, 'My mother _____ delicious food.');

INSERT INTO opcion (pregunta_id, texto_opcion, es_correcta) VALUES
(1, '50', TRUE),
(1, '48', FALSE),
(1, '51', FALSE),
(1, '40', FALSE),
(2, '87', TRUE),
(2, '78', FALSE),
(2, 'Son iguales', FALSE),
(2, 'No se puede comparar', FALSE),
(3, '65', TRUE),
(3, '56', FALSE),
(3, '75', FALSE),
(3, '57', FALSE),
(4, '-3', TRUE),
(4, '-13', FALSE),
(4, '3', FALSE),
(4, '13', FALSE),
(5, '19', TRUE),
(5, '5', FALSE),
(5, '-5', FALSE),
(5, '-19', FALSE),
(6, '24', TRUE),
(6, '-24', FALSE),
(6, '10', FALSE),
(6, '-10', FALSE),
(7, '-5', TRUE),
(7, '5', FALSE),
(7, '-18', FALSE),
(7, '18', FALSE),
(8, 'x = 4', TRUE),
(8, 'x = 8', FALSE),
(8, 'x = 3', FALSE),
(8, 'x = 6', FALSE),
(9, 'x = 6', TRUE),
(9, 'x = 4', FALSE),
(9, 'x = 5', FALSE),
(9, 'x = 7', FALSE),
(10, 'x = 5', TRUE),
(10, 'x = 4', FALSE),
(10, 'x = 6', FALSE),
(10, 'x = 20', FALSE),
(11, 'x = 12', TRUE),
(11, 'x = 7', FALSE),
(11, 'x = 1.33', FALSE),
(11, 'x = 9', FALSE),
(12, '180 grados', TRUE),
(12, '360 grados', FALSE),
(12, '90 grados', FALSE),
(12, '270 grados', FALSE),
(13, 'Equilátero', TRUE),
(13, 'Isósceles', FALSE),
(13, 'Escaleno', FALSE),
(13, 'Rectángulo', FALSE),
(14, 'Dos lados iguales', TRUE),
(14, 'Tres lados iguales', FALSE),
(14, 'Todos los lados diferentes', FALSE),
(14, 'Un ángulo de 90°', FALSE),
(15, 'Rectángulo', TRUE),
(15, 'Obtusángulo', FALSE),
(15, 'Acutángulo', FALSE),
(15, 'Equilátero', FALSE),
(16, 'a² + b² = c²', TRUE),
(16, 'a + b = c', FALSE),
(16, 'a × b = c', FALSE),
(16, 'a² = b² + c²', FALSE),
(17, '5', TRUE),
(17, '7', FALSE),
(17, '6', FALSE),
(17, '8', FALSE),
(18, 'Hipotenusa', TRUE),
(18, 'Cateto', FALSE),
(18, 'Base', FALSE),
(18, 'Altura', FALSE),
(19, 'cateto opuesto / hipotenusa', TRUE),
(19, 'cateto adyacente / hipotenusa', FALSE),
(19, 'cateto opuesto / cateto adyacente', FALSE),
(19, 'hipotenusa / cateto opuesto', FALSE),
(20, '1', TRUE),
(20, '0', FALSE),
(20, '-1', FALSE),
(20, '0.5', FALSE),
(21, 'seno / coseno', TRUE),
(21, 'coseno / seno', FALSE),
(21, 'seno × coseno', FALSE),
(21, 'hipotenusa / cateto', FALSE),
(22, '1', TRUE),
(22, '0', FALSE),
(22, '0.5', FALSE),
(22, 'indefinido', FALSE),
(23, 'Mitocondria', TRUE),
(23, 'Núcleo', FALSE),
(23, 'Ribosoma', FALSE),
(23, 'Lisosoma', FALSE),
(24, 'Almacenar información genética', TRUE),
(24, 'Producir energía', FALSE),
(24, 'Sintetizar lípidos', FALSE),
(24, 'Digerir sustancias', FALSE),
(25, 'Pared celular', TRUE),
(25, 'Membrana plasmática', FALSE),
(25, 'Cloroplasto', FALSE),
(25, 'Vacuola', FALSE),
(26, 'Ribosoma', TRUE),
(26, 'Núcleo', FALSE),
(26, 'Mitocondria', FALSE),
(26, 'Aparato de Golgi', FALSE),
(27, 'O', TRUE),
(27, 'Ox', FALSE),
(27, 'Og', FALSE),
(27, 'Om', FALSE),
(28, '6 electrones', TRUE),
(28, '4 electrones', FALSE),
(28, '8 electrones', FALSE),
(28, '12 electrones', FALSE),
(29, 'Hidrógeno', TRUE),
(29, 'Helio', FALSE),
(29, 'Oxígeno', FALSE),
(29, 'Carbono', FALSE),
(30, 'Hierro', TRUE),
(30, 'Fósforo', FALSE),
(30, 'Flúor', FALSE),
(30, 'Francio', FALSE),
(31, 'Un cuerpo permanece en reposo o movimiento uniforme si no actúa fuerza', TRUE),
(31, 'La fuerza es igual a masa por aceleración', FALSE),
(31, 'A toda acción hay una reacción', FALSE),
(31, 'Todo cuerpo cae a la misma velocidad', FALSE),
(32, 'F = m × a', TRUE),
(32, 'F = m / a', FALSE),
(32, 'F = a / m', FALSE),
(32, 'F = m + a', FALSE),
(33, 'Acción y reacción', TRUE),
(33, 'Inercia', FALSE),
(33, 'Gravitación', FALSE),
(33, 'Movimiento uniforme', FALSE),
(34, 'María', TRUE),
(34, 'mesa', FALSE),
(34, 'ciudad', FALSE),
(34, 'libro', FALSE),
(35, 'amor', TRUE),
(35, 'perro', FALSE),
(35, 'casa', FALSE),
(35, 'árbol', FALSE),
(36, 'Colectivo', TRUE),
(36, 'Propio', FALSE),
(36, 'Abstracto', FALSE),
(36, 'Individual', FALSE),
(37, 'mesa', TRUE),
(37, 'amor', FALSE),
(37, 'felicidad', FALSE),
(37, 'justicia', FALSE),
(38, 'Tigris y Éufrates', TRUE),
(38, 'Nilo y Jordán', FALSE),
(38, 'Indo y Ganges', FALSE),
(38, 'Amazonas y Orinoco', FALSE),
(39, 'Sumerios', TRUE),
(39, 'Egipcios', FALSE),
(39, 'Griegos', FALSE),
(39, 'Romanos', FALSE),
(40, 'Pirámides', TRUE),
(40, 'Zigurats', FALSE),
(40, 'Coliseos', FALSE),
(40, 'Templos', FALSE),
(41, 'Esparta', TRUE),
(41, 'Atenas', FALSE),
(41, 'Tebas', FALSE),
(41, 'Corinto', FALSE),
(42, 'goes', TRUE),
(42, 'go', FALSE),
(42, 'going', FALSE),
(42, 'went', FALSE),
(43, 'play', TRUE),
(43, 'plays', FALSE),
(43, 'playing', FALSE),
(43, 'played', FALSE),
(44, 'does', TRUE),
(44, 'do', FALSE),
(44, 'doing', FALSE),
(44, 'did', FALSE),
(45, 'cooks', TRUE),
(45, 'cook', FALSE),
(45, 'cooking', FALSE),
(45, 'cooked', FALSE);

INSERT INTO encuesta_satisfaccion (curso_id, alumno_id, gusto_curso, mejora_curso, nivel_satisfaccion, fecha_respuesta) VALUES
(1, 1, 'Me gustó mucho aprender los números de forma divertida', 'Más juegos interactivos', 'Muy satisfecho', '2025-03-24 10:00:00'),
(1, 2, 'Las explicaciones fueron claras', 'Agregar más ejemplos', 'Satisfecho', '2025-03-24 11:00:00'),
(8, 3, 'Los ejercicios fueron muy útiles para practicar', 'Más ejemplos resueltos paso a paso', 'Muy satisfecho', '2025-03-25 09:00:00'),
(11, 3, 'Buen contenido sobre ecuaciones', 'Incluir problemas de aplicación real', 'Satisfecho', '2025-03-25 10:00:00'),
(21, 5, 'Me ayudó mucho a entender las funciones trigonométricas', 'Agregar más ejercicios de aplicación', 'Muy satisfecho', '2025-03-26 11:00:00'),
(21, 6, 'Excelente explicación de las razones', 'Incluir más ejemplos prácticos', 'Satisfecho', '2025-03-26 12:00:00'),
(4, 7, 'Las tablas de multiplicar se explicaron bien', 'Más actividades lúdicas', 'Muy satisfecho', '2025-03-27 10:00:00'),
(8, 11, 'Curso completo y bien estructurado', 'Nada que mejorar', 'Muy satisfecho', '2025-03-28 09:00:00'),
(62, 10, 'Me gustó aprender los tiempos verbales', 'Más ejercicios de conversación', 'Satisfecho', '2025-03-29 11:00:00'),
(62, 14, 'Las explicaciones fueron claras y precisas', 'Agregar más material audiovisual', 'Muy satisfecho', '2025-03-29 12:00:00');

INSERT INTO aprobacion_admin (admin_id, objeto_tipo, objeto_id, estado, comentario, fecha_revision) VALUES
(1, 'curso', 1, 'aprobado', 'Contenido adecuado para el nivel', '2025-03-13 14:00:00'),
(1, 'curso', 2, 'aprobado', 'Excelente material didáctico', '2025-03-13 15:00:00'),
(1, 'curso', 8, 'aprobado', 'Bien estructurado y completo', '2025-03-14 14:00:00'),
(2, 'curso', 11, 'aprobado', 'Cumple con los objetivos de aprendizaje', '2025-03-15 14:00:00'),
(2, 'curso', 12, 'pendiente', NULL, '2025-03-16 10:00:00'),
(1, 'curso', 18, 'aprobado', 'Muy buen contenido geométrico', '2025-03-17 14:00:00'),
(1, 'curso', 21, 'aprobado', 'Explicaciones claras de trigonometría', '2025-03-18 14:00:00'),
(2, 'curso', 28, 'aprobado', 'Contenido biológico apropiado', '2025-03-19 14:00:00'),
(1, 'curso', 34, 'aprobado', 'Buena introducción a la química', '2025-03-20 14:00:00'),
(2, 'curso', 35, 'rechazado', 'Contenido muy avanzado para el grado', '2025-03-21 14:00:00'),
(1, 'curso', 40, 'aprobado', 'Excelente explicación de física', '2025-03-22 14:00:00'),
(2, 'curso', 43, 'aprobado', 'Buen material gramatical', '2025-03-23 14:00:00'),
(1, 'curso', 52, 'aprobado', 'Contenido histórico bien documentado', '2025-03-24 14:00:00'),
(2, 'curso', 62, 'aprobado', 'Apropiado para nivel básico de inglés', '2025-03-25 14:00:00'),
(1, 'contenido', 1, 'aprobado', 'Introducción clara y concisa', '2025-03-26 10:00:00'),
(1, 'contenido', 3, 'aprobado', 'Definición apropiada', '2025-03-26 11:00:00'),
(2, 'contenido', 5, 'aprobado', 'Buena explicación del concepto', '2025-03-26 12:00:00'),
(1, 'contenido', 7, 'aprobado', 'Clasificación correcta', '2025-03-27 10:00:00'),
(2, 'contenido', 10, 'aprobado', 'Contenido celular adecuado', '2025-03-27 11:00:00'),
(1, 'recurso', 1, 'aprobado', 'Material complementario útil', '2025-03-28 10:00:00'),
(1, 'recurso', 3, 'aprobado', 'Ejercicios apropiados', '2025-03-28 11:00:00'),
(2, 'recurso', 5, 'aprobado', 'Problemas bien diseñados', '2025-03-28 12:00:00'),
(1, 'recurso', 7, 'aprobado', 'Esquema visualmente claro', '2025-03-29 10:00:00'),
(2, 'recurso', 17, 'pendiente', NULL, '2025-03-29 11:00:00'),
(1, 'recurso', 19, 'aprobado', 'Mapa educativo apropiado', '2025-03-29 12:00:00');


-- ======================================
-- CREACIÓN DE ÍNDICES OPTIMIZADOS
-- ======================================

-- Índices en usuario
CREATE INDEX idx_usuario_rol_estado ON usuario (rol, estado);
CREATE INDEX idx_usuario_correo ON usuario (correo);

-- Índices en curso
CREATE INDEX idx_curso_estado ON curso (estado);

-- Índices en alumno_curso
CREATE INDEX idx_alumno_curso_finalizado ON alumno_curso (finalizado);

-- Índices en recurso
CREATE INDEX idx_recurso_tipo ON recurso (tipo_id);

-- Índices en aprobaciones
CREATE INDEX idx_aprobacion_estado ON aprobacion_admin (estado);

-- ======================================
-- CREACIÓN DE ROLES
-- ======================================

CREATE ROLE rol_admin;
CREATE ROLE rol_docente;
CREATE ROLE rol_alumno;

-- ======================================
-- ASIGNACIÓN DE PRIVILEGIOS A CADA ROL
-- ======================================

-- 🔹 Rol ADMIN: control total sobre la base de datos
GRANT ALL PRIVILEGES ON sistema_cursos.* TO rol_admin;

-- 🔹 Rol DOCENTE: permisos limitados de gestión de cursos y contenidos
GRANT SELECT, INSERT, UPDATE, DELETE ON sistema_cursos.curso TO rol_docente;
GRANT SELECT, INSERT, UPDATE, DELETE ON sistema_cursos.contenido TO rol_docente;
GRANT SELECT, INSERT, UPDATE, DELETE ON sistema_cursos.recurso TO rol_docente;
GRANT SELECT ON sistema_cursos.alumno TO rol_docente;
GRANT SELECT ON sistema_cursos.alumno_curso TO rol_docente;

-- 🔹 Rol ALUMNO: permisos de lectura e inscripción
GRANT SELECT ON sistema_cursos.curso TO rol_alumno;
GRANT SELECT ON sistema_cursos.contenido TO rol_alumno;
GRANT SELECT ON sistema_cursos.recurso TO rol_alumno;
GRANT SELECT, INSERT ON sistema_cursos.alumno_curso TO rol_alumno;
GRANT SELECT ON sistema_cursos.cuestionario TO rol_alumno;
GRANT SELECT ON sistema_cursos.pregunta TO rol_alumno;
GRANT SELECT ON sistema_cursos.opcion TO rol_alumno;



-- ======================================
-- CREACIÓN DE USUARIOS Y ASIGNACIÓN DE ROLES
-- ======================================

CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY 'admin123';
CREATE USER IF NOT EXISTS 'docente1'@'localhost' IDENTIFIED BY 'doc123';
CREATE USER IF NOT EXISTS 'alumno1'@'localhost' IDENTIFIED BY 'alu123';

-- Asignar roles a usuarios
GRANT rol_admin TO 'admin'@'localhost';
GRANT rol_docente TO 'docente1'@'localhost';
GRANT rol_alumno TO 'alumno1'@'localhost';
FLUSH PRIVILEGES;

-- 1. Vista general de los usuarios (admin, docente, alumno)
CREATE OR REPLACE VIEW vista_usuarios_resumen AS
SELECT 
  u.id_usuario,
  CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
  u.correo,
  u.rol,
  u.estado
FROM usuario u;

-- 2. Vista de cursos con su docente y categoría
CREATE OR REPLACE VIEW vista_cursos_detalle AS
SELECT 
  c.id_curso,
  c.titulo,
  c.descripcion,
  cat.nombre AS categoria,
  g.nombre AS grado,
  CONCAT(u.nombre, ' ', u.apellido) AS docente,
  c.estado,
  c.fecha_creacion
FROM curso c
LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
LEFT JOIN grado g ON c.id_grado = g.id_grado
LEFT JOIN docente d ON c.docente_id = d.id_docente
LEFT JOIN usuario u ON d.usuario_id = u.id_usuario;

-- 3. Vista de alumnos inscritos con estado de finalización
CREATE OR REPLACE VIEW vista_alumnos_cursos AS
SELECT 
  ac.id_alumno_curso,
  CONCAT(u.nombre, ' ', u.apellido) AS alumno,
  cu.titulo AS curso,
  ac.fecha_inscripcion,
  IF(ac.finalizado, 'Sí', 'No') AS curso_finalizado
FROM alumno_curso ac
INNER JOIN alumno a ON ac.alumno_id = a.id_alumno
INNER JOIN usuario u ON a.usuario_id = u.id_usuario
INNER JOIN curso cu ON ac.curso_id = cu.id_curso;

-- 1. Procedimiento para ver información rápida de todos los usuarios (Admin, Docente, Alumno)
DELIMITER //
CREATE PROCEDURE sp_ver_informacion_usuarios()
BEGIN
  SELECT 
    u.id_usuario,
    CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo,
    u.correo,
    u.rol,
    u.estado
  FROM usuario u
  ORDER BY u.rol, u.nombre;
END //
DELIMITER ;

-- 2. Procedimiento para inscribir alumno en un curso
DELIMITER //
CREATE PROCEDURE sp_inscribir_alumno(IN p_alumno_id INT, IN p_curso_id INT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alumno_curso WHERE alumno_id = p_alumno_id AND curso_id = p_curso_id) THEN
    INSERT INTO alumno_curso(alumno_id, curso_id) VALUES(p_alumno_id, p_curso_id);
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El alumno ya está inscrito en este curso';
  END IF;
END //
DELIMITER ;

-- 3. Procedimiento para cambiar estado de curso (aprobado, rechazado, publicado)
DELIMITER //
CREATE PROCEDURE sp_cambiar_estado_curso(IN p_id_curso INT, IN p_estado ENUM('pendiente','aprobado','rechazado','publicado'))
BEGIN
  UPDATE curso
  SET estado = p_estado
  WHERE id_curso = p_id_curso;
END //
DELIMITER ;
-- 1. Función para obtener el total de cursos de un docente
DELIMITER //
CREATE FUNCTION fn_total_cursos_docente(p_docente_id INT)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE total INT;
  SELECT COUNT(*) INTO total FROM curso WHERE docente_id = p_docente_id;
  RETURN total;
END //
DELIMITER ;

-- 2. Función para verificar si un alumno completó un curso
DELIMITER //
CREATE FUNCTION fn_alumno_finalizo(p_alumno_id INT, p_curso_id INT)
RETURNS VARCHAR(10)
DETERMINISTIC
BEGIN
  DECLARE estado VARCHAR(10);
  SELECT IF(finalizado, 'Sí', 'No') INTO estado
  FROM alumno_curso
  WHERE alumno_id = p_alumno_id AND curso_id = p_curso_id
  LIMIT 1;
  RETURN estado;
END //
DELIMITER ;
-- 1. Trigger: cuando se inserta un nuevo usuario, si es docente o alumno, crear su registro respectivo
DELIMITER //
CREATE TRIGGER trg_usuario_rol_insert
AFTER INSERT ON usuario
FOR EACH ROW
BEGIN
  IF NEW.rol = 'docente' THEN
    INSERT INTO docente(usuario_id) VALUES(NEW.id_usuario);
  ELSEIF NEW.rol = 'alumno' THEN
    INSERT INTO alumno(usuario_id) VALUES(NEW.id_usuario);
  END IF;
END //
DELIMITER ;

-- 2. Trigger: al cambiar el estado de curso a 'aprobado', registrar en aprobacion_admin automáticamente
DELIMITER //
CREATE TRIGGER trg_curso_aprobado
AFTER UPDATE ON curso
FOR EACH ROW
BEGIN
  IF NEW.estado = 'aprobado' AND OLD.estado <> 'aprobado' THEN
    INSERT INTO aprobacion_admin(admin_id, objeto_tipo, objeto_id, estado, comentario)
    VALUES(1, 'curso', NEW.id_curso, 'aprobado', 'Aprobado automáticamente por trigger');
  END IF;
END //
DELIMITER ;
-- 1. Vista: Contenido subido con información del curso
CREATE VIEW vw_contenido_curso_usuario AS
SELECT 
  con.id_contenido,
  con.seccion,
  c.titulo AS curso,
  CONCAT(u.nombre, ' ', u.apellido) AS subido_por,
  con.estado,
  con.fecha_subida
FROM contenido con
JOIN curso c ON con.curso_id = c.id_curso
JOIN usuario u ON con.usuario_id = u.id_usuario
ORDER BY con.fecha_subida DESC;

-- 2. Vista: Cursos con cantidad de alumnos inscritos
CREATE VIEW vw_cursos_con_alumnos AS
SELECT 
  c.id_curso,
  c.titulo AS curso,
  COUNT(ac.alumno_id) AS total_alumnos,
  CONCAT(u.nombre, ' ', u.apellido) AS docente
FROM curso c
JOIN docente d ON c.docente_id = d.id_docente
JOIN usuario u ON d.usuario_id = u.id_usuario
LEFT JOIN alumno_curso ac ON c.id_curso = ac.curso_id
GROUP BY c.id_curso, c.titulo, docente
ORDER BY total_alumnos DESC;

-- 3. Vista: Resultados de encuestas de satisfacción
CREATE VIEW vw_encuestas_satisfaccion AS
SELECT 
  e.id_encuesta,
  c.titulo AS curso,
  CONCAT(a_u.nombre, ' ', a_u.apellido) AS alumno,
  e.nivel_satisfaccion,
  e.gusto_curso,
  e.mejora_curso,
  e.fecha_respuesta
FROM encuesta_satisfaccion e
JOIN curso c ON e.curso_id = c.id_curso
LEFT JOIN alumno a ON e.alumno_id = a.id_alumno
LEFT JOIN usuario a_u ON a.usuario_id = a_u.id_usuario
ORDER BY e.fecha_respuesta DESC;

-- 4. Vista: Docentes con cantidad de cursos creados
CREATE VIEW vw_docentes_cursos AS
SELECT 
  CONCAT(u.nombre, ' ', u.apellido) AS docente,
  d.especialidad,
  COUNT(c.id_curso) AS total_cursos
FROM docente d
JOIN usuario u ON d.usuario_id = u.id_usuario
LEFT JOIN curso c ON d.id_docente = c.docente_id
GROUP BY docente, d.especialidad
ORDER BY total_cursos DESC;

-- 5. Vista: Categorías con número de cursos asociados
CREATE VIEW vw_categorias_cursos AS
SELECT 
  cat.nombre AS categoria,
  COUNT(c.id_curso) AS total_cursos
FROM categoria cat
LEFT JOIN curso c ON cat.id_categoria = c.id_categoria
GROUP BY cat.nombre
ORDER BY total_cursos DESC;

-- 6. Vista: Grados con cursos y docentes
CREATE VIEW vw_grados_cursos_docentes AS
SELECT 
  g.nombre AS grado,
  c.titulo AS curso,
  CONCAT(u.nombre, ' ', u.apellido) AS docente
FROM grado g
LEFT JOIN curso c ON g.id_grado = c.id_grado
LEFT JOIN docente d ON c.docente_id = d.id_docente
LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
ORDER BY g.nombre, c.titulo;

-- 7. Vista: Historial de aprobación con detalle
CREATE VIEW vw_historial_aprobacion AS
SELECT 
  aa.id_aprobacion,
  aa.objeto_tipo,
  aa.objeto_id,
  aa.estado,
  aa.comentario,
  CONCAT(u.nombre, ' ', u.apellido) AS revisado_por,
  aa.fecha_revision
FROM aprobacion_admin aa
JOIN usuario u ON aa.admin_id = u.id_usuario
ORDER BY aa.fecha_revision DESC;

-- 8. Vista: Recursos con tipo y curso
CREATE VIEW vw_recursos_tipo_curso AS
SELECT 
  r.id_recurso,
  r.titulo,
  r.descripcion,
  tr.nombre_tipo AS tipo_recurso,
  c.titulo AS curso,
  r.estado,
  r.fecha_subida
FROM recurso r
JOIN tipo_recurso tr ON r.tipo_id = tr.id_tipo
JOIN curso c ON r.curso_id = c.id_curso
ORDER BY r.fecha_subida DESC;

-- 9. Vista: Alumnos con cursos y estado
CREATE VIEW vw_alumnos_cursos_estado AS
SELECT 
  CONCAT(a_u.nombre, ' ', a_u.apellido) AS alumno,
  c.titulo AS curso,
  ac.fecha_inscripcion,
  ac.finalizado
FROM alumno a
JOIN usuario a_u ON a.usuario_id = a_u.id_usuario
JOIN alumno_curso ac ON a.id_alumno = ac.alumno_id
JOIN curso c ON ac.curso_id = c.id_curso
ORDER BY a_u.apellido, c.titulo;

-- 10. Vista: Cuestionarios por curso
CREATE VIEW vw_cuestionarios_curso AS
SELECT 
  cu.id_cuestionario,
  cu.titulo AS cuestionario,
  cu.estado,
  c.titulo AS curso,
  CONCAT(u.nombre, ' ', u.apellido) AS docente
FROM cuestionario cu
JOIN curso c ON cu.curso_id = c.id_curso
JOIN docente d ON c.docente_id = d.id_docente
JOIN usuario u ON d.usuario_id = u.id_usuario
ORDER BY c.titulo;

-- 11. Vista: Usuarios agrupados por rol
CREATE VIEW vw_usuarios_por_rol AS
SELECT 
  rol,
  COUNT(*) AS total_usuarios
FROM usuario
GROUP BY rol;

-- 12. Vista: Alumnos que han completado cursos
CREATE VIEW vw_alumnos_cursos_completados AS
SELECT 
  CONCAT(a_u.nombre, ' ', a_u.apellido) AS alumno,
  c.titulo AS curso,
  ac.fecha_inscripcion
FROM alumno_curso ac
JOIN alumno a ON ac.alumno_id = a.id_alumno
JOIN usuario a_u ON a.usuario_id = a_u.id_usuario
JOIN curso c ON ac.curso_id = c.id_curso
WHERE ac.finalizado = TRUE
ORDER BY a_u.apellido;