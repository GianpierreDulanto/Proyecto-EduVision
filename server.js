const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '')));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configuración de base de datos
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'sistema_cursos',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función helper para ejecutar queries
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
}

// ========================================
// CONFIGURACIÓN DE MULTER (UPLOAD DE ARCHIVOS)
// ========================================

// Crear directorio uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});

// Filtro de tipos de archivo
const fileFilter = function (req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3|wav|doc|docx|ppt|pptx|xls|xlsx|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Formatos aceptados: imágenes, videos, audios, documentos'));
  }
};

// Configurar multer
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 200 * 1024 * 1024 // 200MB
  },
  fileFilter: fileFilter
});

// Servir archivos estáticos desde uploads
app.use('/uploads', express.static(uploadsDir));

// ========================================
// ENDPOINTS DE AUTENTICACIÓN
// ========================================

// POST /api/login - Inicio de sesión
app.post('/api/login', async (req, res) => {
  try {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
      return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    const usuarios = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.estado,
              d.id_docente, d.especialidad,
              a.id_alumno
       FROM usuario u
       LEFT JOIN docente d ON u.id_usuario = d.usuario_id
       LEFT JOIN alumno a ON u.id_usuario = a.usuario_id
       WHERE u.correo = ? AND u.contraseña = ? AND u.estado = 'activo'`,
      [correo, contraseña]
    );

    if (usuarios.length > 0) {
      const user = usuarios[0];
      // No enviar contraseña al cliente
      delete user.contraseña;
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// POST /api/register - Registro de usuario
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, apellido, correo, contraseña, rol } = req.body;

    // Validaciones
    if (!nombre || !apellido || !correo || !contraseña || !rol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ error: 'El formato del correo electrónico no es válido' });
    }

    // Validar longitud de contraseña
    if (contraseña.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Validar rol
    if (!['docente', 'alumno'].includes(rol)) {
      return res.status(400).json({ error: 'El rol debe ser "docente" o "alumno"' });
    }

    // Verificar si el correo ya existe
    const existente = await query('SELECT id_usuario FROM usuario WHERE correo = ?', [correo]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Obtener una conexión del pool para transacción
    const connection = await pool.getConnection();
    
    try {
      // Iniciar transacción
      await connection.beginTransaction();

      // Insertar usuario
      const [resultUsuario] = await connection.execute(
        'INSERT INTO usuario (nombre, apellido, correo, contraseña, rol, estado) VALUES (?, ?, ?, ?, ?, ?)',
        [nombre, apellido, correo, contraseña, rol, 'activo']
      );

      const usuarioId = resultUsuario.insertId;

      // Crear registro en tabla correspondiente según el rol
      if (rol === 'docente') {
        const { especialidad, experiencia } = req.body;
        await connection.execute(
          'INSERT INTO docente (usuario_id, especialidad, experiencia) VALUES (?, ?, ?)',
          [usuarioId, especialidad || null, experiencia || null]
        );
      } else if (rol === 'alumno') {
        await connection.execute(
          'INSERT INTO alumno (usuario_id) VALUES (?)',
          [usuarioId]
        );
      }

      // Confirmar transacción
      await connection.commit();

      res.json({ 
        success: true, 
        message: 'Usuario registrado exitosamente',
        userId: usuarioId,
        rol: rol
      });
    } catch (error) {
      // Revertir transacción en caso de error
      await connection.rollback();
      throw error;
    } finally {
      // Liberar la conexión
      connection.release();
    }
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario: ' + error.message });
  }
});

// ========================================
// ENDPOINTS DE CURSOS
// ========================================

// GET /api/cursos - Obtener todos los cursos
app.get('/api/cursos', async (req, res) => {
  try {
    const { categoria, grado, estado } = req.query;
    
    let sql = `
      SELECT c.id_curso, c.titulo, c.descripcion, c.estado, c.fecha_creacion,
             cat.nombre AS categoria, g.nombre AS grado,
             CONCAT(u.nombre, ' ', u.apellido) AS docente,
             d.especialidad
      FROM curso c
      LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
      LEFT JOIN grado g ON c.id_grado = g.id_grado
      LEFT JOIN docente d ON c.docente_id = d.id_docente
      LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
      WHERE 1=1
    `;
    
    const params = [];
    
    if (categoria) {
      sql += ' AND c.id_categoria = ?';
      params.push(categoria);
    }
    
    if (grado) {
      sql += ' AND c.id_grado = ?';
      params.push(grado);
    }
    
    if (estado) {
      sql += ' AND c.estado = ?';
      params.push(estado);
    } else {
      // Por defecto, cursos aprobados o publicados
      sql += ' AND (c.estado = "aprobado" OR c.estado = "publicado")';
    }
    
    sql += ' ORDER BY c.fecha_creacion DESC';
    
    const cursos = await query(sql, params);
    res.json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

// GET /api/cursos/:id - Obtener un curso específico
app.get('/api/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cursos = await query(
      `SELECT c.*, cat.nombre AS categoria, g.nombre AS grado,
              CONCAT(u.nombre, ' ', u.apellido) AS docente,
              d.especialidad
       FROM curso c
       LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
       LEFT JOIN grado g ON c.id_grado = g.id_grado
       LEFT JOIN docente d ON c.docente_id = d.id_docente
       LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
       WHERE c.id_curso = ?`,
      [id]
    );
    
    if (cursos.length > 0) {
      res.json(cursos[0]);
    } else {
      res.status(404).json({ error: 'Curso no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ error: 'Error al obtener curso' });
  }
});


// ========================================
// ENDPOINTS DE CATEGORÍAS Y GRADOS
// ========================================

// GET /api/categorias - Obtener todas las categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const categorias = await query('SELECT * FROM categoria ORDER BY nombre');
    res.json(categorias);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/grados - Obtener todos los grados
app.get('/api/grados', async (req, res) => {
  try {
    const grados = await query('SELECT * FROM grado ORDER BY id_grado');
    res.json(grados);
  } catch (error) {
    console.error('Error al obtener grados:', error);
    res.status(500).json({ error: 'Error al obtener grados' });
  }
});

// ========================================
// ENDPOINTS DE CONTENIDO
// ========================================

// GET /api/cursos/:id/contenido - Obtener contenido de un curso
app.get('/api/cursos/:id/contenido', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contenido = await query(
      `SELECT c.*, CONCAT(u.nombre, ' ', u.apellido) AS autor
       FROM contenido c
       LEFT JOIN usuario u ON c.usuario_id = u.id_usuario
       WHERE c.curso_id = ? AND c.estado = 'aprobado'
       ORDER BY c.fecha_subida`,
      [id]
    );
    
    res.json(contenido);
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error al obtener contenido' });
  }
});


// ========================================
// ENDPOINTS DE RECURSOS
// ========================================

// GET /api/cursos/:id/recursos - Obtener recursos de un curso
app.get('/api/cursos/:id/recursos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const recursos = await query(
      `SELECT r.*, tr.nombre_tipo AS tipo
       FROM recurso r
       LEFT JOIN tipo_recurso tr ON r.tipo_id = tr.id_tipo
       WHERE r.curso_id = ? AND r.estado = 'aprobado'
       ORDER BY r.fecha_subida DESC`,
      [id]
    );
    
    res.json(recursos);
  } catch (error) {
    console.error('Error al obtener recursos:', error);
    res.status(500).json({ error: 'Error al obtener recursos' });
  }
});

// POST /api/recursos - Agregar recurso a un curso
app.post('/api/recursos', async (req, res) => {
  try {
    const { curso_id, tipo_id, titulo, url, descripcion, usuario_id } = req.body;
    
    if (!curso_id || !tipo_id || !titulo || !usuario_id) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const result = await query(
      'INSERT INTO recurso (curso_id, tipo_id, titulo, url, descripcion, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [curso_id, tipo_id, titulo, url, descripcion, usuario_id]
    );
    
    res.json({ success: true, recursoId: result.insertId });
  } catch (error) {
    console.error('Error al agregar recurso:', error);
    res.status(500).json({ error: 'Error al agregar recurso' });
  }
});

// ========================================
// ENDPOINTS DE INSCRIPCIÓN
// ========================================

// POST /api/inscribir - Inscribir alumno en curso
app.post('/api/inscribir', async (req, res) => {
  try {
    const { alumno_id, curso_id } = req.body;
    
    if (!alumno_id || !curso_id) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    // Verificar si ya está inscrito
    const existente = await query(
      'SELECT id_alumno_curso FROM alumno_curso WHERE alumno_id = ? AND curso_id = ?',
      [alumno_id, curso_id]
    );
    
    if (existente.length > 0) {
      return res.status(400).json({ error: 'Ya estás inscrito en este curso' });
    }
    
    const result = await query(
      'INSERT INTO alumno_curso (alumno_id, curso_id) VALUES (?, ?)',
      [alumno_id, curso_id]
    );
    
    res.json({ success: true, inscripcionId: result.insertId });
  } catch (error) {
    console.error('Error al inscribir:', error);
    res.status(500).json({ error: 'Error al inscribir' });
  }
});

// GET /api/alumnos/:id/cursos - Obtener cursos de un alumno
app.get('/api/alumnos/:id/cursos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cursos = await query(
      `SELECT c.*, ac.fecha_inscripcion, ac.finalizado,
              cat.nombre AS categoria, g.nombre AS grado,
              CONCAT(u.nombre, ' ', u.apellido) AS docente
       FROM alumno_curso ac
       INNER JOIN curso c ON ac.curso_id = c.id_curso
       LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
       LEFT JOIN grado g ON c.id_grado = g.id_grado
       LEFT JOIN docente d ON c.docente_id = d.id_docente
       LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
       WHERE ac.alumno_id = ?
       ORDER BY ac.fecha_inscripcion DESC`,
      [id]
    );
    
    res.json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos del alumno:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

// ========================================
// ENDPOINTS DE CUESTIONARIOS
// ========================================

// GET /api/cursos/:id/cuestionario - Obtener cuestionario de un curso
app.get('/api/cursos/:id/cuestionario', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cuestionarios = await query(
      'SELECT * FROM cuestionario WHERE curso_id = ? AND estado = "activo"',
      [id]
    );
    
    if (cuestionarios.length === 0) {
      return res.json(null);
    }
    
    const cuestionario = cuestionarios[0];
    
    // Obtener preguntas con opciones
    const preguntas = await query(
      `SELECT p.*, 
              (SELECT JSON_ARRAYAGG(
                JSON_OBJECT('id_opcion', o.id_opcion, 
                           'texto_opcion', o.texto_opcion,
                           'es_correcta', o.es_correcta)
              ) FROM opcion o WHERE o.pregunta_id = p.id_pregunta) AS opciones
       FROM pregunta p
       WHERE p.cuestionario_id = ?`,
      [cuestionario.id_cuestionario]
    );
    
    cuestionario.preguntas = preguntas.map(p => ({
      ...p,
      opciones: p.opciones ? JSON.parse(p.opciones) : []
    }));
    
    res.json(cuestionario);
  } catch (error) {
    console.error('Error al obtener cuestionario:', error);
    res.status(500).json({ error: 'Error al obtener cuestionario' });
  }
});

// ========================================
// ENDPOINTS DE ENCUESTAS
// ========================================

// POST /api/encuestas - Enviar encuesta de satisfacción
app.post('/api/encuestas', async (req, res) => {
  try {
    const { curso_id, alumno_id, gusto_curso, mejora_curso, nivel_satisfaccion } = req.body;
    
    if (!curso_id || !nivel_satisfaccion) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }
    
    const result = await query(
      'INSERT INTO encuesta_satisfaccion (curso_id, alumno_id, gusto_curso, mejora_curso, nivel_satisfaccion) VALUES (?, ?, ?, ?, ?)',
      [curso_id, alumno_id, gusto_curso, mejora_curso, nivel_satisfaccion]
    );
    
    res.json({ success: true, encuestaId: result.insertId });
  } catch (error) {
    console.error('Error al enviar encuesta:', error);
    res.status(500).json({ error: 'Error al enviar encuesta' });
  }
});

// ========================================
// ENDPOINTS DE DOCENTES
// ========================================

// GET /api/docentes/:id/cursos - Obtener cursos de un docente
app.get('/api/docentes/:id/cursos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cursos = await query(
      `SELECT c.*, cat.nombre AS categoria, g.nombre AS grado,
              COUNT(DISTINCT ac.alumno_id) AS total_alumnos,
              COUNT(DISTINCT cont.id_contenido) AS total_contenidos,
              COUNT(DISTINCT cu.id_cuestionario) AS total_quizzes
       FROM curso c
       LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
       LEFT JOIN grado g ON c.id_grado = g.id_grado
       LEFT JOIN alumno_curso ac ON c.id_curso = ac.curso_id
       LEFT JOIN contenido cont ON c.id_curso = cont.curso_id
       LEFT JOIN cuestionario cu ON c.id_curso = cu.curso_id
       WHERE c.docente_id = ?
       GROUP BY c.id_curso
       ORDER BY c.fecha_creacion DESC`,
      [id]
    );
    
    res.json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos del docente:', error);
    res.status(500).json({ error: 'Error al obtener cursos' });
  }
});

// GET /api/docentes/:id/estadisticas - Obtener estadísticas del docente
app.get('/api/docentes/:id/estadisticas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stats = await query(
      `SELECT 
        COUNT(DISTINCT c.id_curso) AS total_cursos,
        COUNT(DISTINCT ac.alumno_id) AS total_alumnos,
        COUNT(DISTINCT r.id_recurso) AS total_recursos
       FROM curso c
       LEFT JOIN alumno_curso ac ON c.id_curso = ac.curso_id
       LEFT JOIN recurso r ON c.id_curso = r.curso_id
       WHERE c.docente_id = ?`,
      [id]
    );
    
    res.json(stats[0]);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ========================================
// GESTIÓN DE CURSOS (DOCENTES)
// ========================================

// POST /api/cursos - Crear nuevo curso
app.post('/api/cursos', async (req, res) => {
  try {
    const { docente_id, id_categoria, id_grado, titulo, descripcion, id_cuestionario, estado } = req.body;
    
    // Validaciones
    if (!titulo) {
      return res.status(400).json({ error: 'Título es requerido' });
    }
    
    if (!docente_id) {
      return res.status(400).json({ error: 'Docente ID es requerido' });
    }
    
    // Validar estado si se proporciona
    if (estado && !['pendiente', 'aprobado', 'rechazado', 'publicado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    
    // Verificar que el cuestionario existe si se proporciona
    if (id_cuestionario) {
      const cuestionario = await query('SELECT id_cuestionario FROM cuestionario WHERE id_cuestionario = ?', [id_cuestionario]);
      if (cuestionario.length === 0) {
        return res.status(404).json({ error: 'Cuestionario no encontrado' });
      }
    }
    
    const result = await query(
      `INSERT INTO curso (docente_id, id_categoria, id_grado, titulo, descripcion, id_cuestionario, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [docente_id, id_categoria || null, id_grado || null, titulo || null, descripcion || null, id_cuestionario || null, estado || 'pendiente']
    );
    
    res.json({ 
      success: true, 
      curso_id: result.insertId,
      message: 'Curso creado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ error: 'Error al crear el curso: ' + error.message });
  }
});

// PUT /api/cursos/:id - Actualizar curso
app.put('/api/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, id_categoria, id_grado, id_cuestionario, estado } = req.body;
    
    // Validaciones
    if (!titulo) {
      return res.status(400).json({ error: 'Título es requerido' });
    }
    
    // Validar estado si se proporciona
    if (estado && !['pendiente', 'aprobado', 'rechazado', 'publicado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    
    // Verificar que el cuestionario existe si se proporciona
    if (id_cuestionario) {
      const cuestionario = await query('SELECT id_cuestionario FROM cuestionario WHERE id_cuestionario = ?', [id_cuestionario]);
      if (cuestionario.length === 0) {
        return res.status(404).json({ error: 'Cuestionario no encontrado' });
      }
    }
    
    const result = await query(
      `UPDATE curso 
       SET titulo = ?, descripcion = ?, id_categoria = ?, id_grado = ?, id_cuestionario = ?, estado = COALESCE(?, estado)
       WHERE id_curso = ?`,
      [titulo, descripcion || null, id_categoria || null, id_grado || null, id_cuestionario || null, estado || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    
    res.json({ success: true, message: 'Curso actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({ error: 'Error al actualizar el curso: ' + error.message });
  }
});

// DELETE /api/cursos/:id - Eliminar curso
app.delete('/api/cursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el curso existe
    const curso = await query('SELECT id_curso FROM curso WHERE id_curso = ?', [id]);
    if (curso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    
    // Eliminar registros relacionados primero (si no hay CASCADE)
    // Eliminar opciones de preguntas
    await query(
      `DELETE o FROM opcion o
       INNER JOIN pregunta p ON o.pregunta_id = p.id_pregunta
       INNER JOIN cuestionario c ON p.cuestionario_id = c.id_cuestionario
       WHERE c.curso_id = ?`,
      [id]
    );
    
    // Eliminar preguntas
    await query(
      `DELETE p FROM pregunta p
       INNER JOIN cuestionario c ON p.cuestionario_id = c.id_cuestionario
       WHERE c.curso_id = ?`,
      [id]
    );
    
    // Eliminar cuestionarios
    await query('DELETE FROM cuestionario WHERE curso_id = ?', [id]);
    
    // Eliminar contenido
    await query('DELETE FROM contenido WHERE curso_id = ?', [id]);
    
    // Eliminar recursos
    await query('DELETE FROM recurso WHERE curso_id = ?', [id]);
    
    // Eliminar inscripciones de alumnos
    await query('DELETE FROM alumno_curso WHERE curso_id = ?', [id]);
    
    // Finalmente eliminar el curso
    const result = await query('DELETE FROM curso WHERE id_curso = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se pudo eliminar el curso' });
    }
    
    res.json({ success: true, message: 'Curso eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({ error: 'Error al eliminar el curso: ' + error.message });
  }
});

// GET /api/cursos/:id/estadisticas - Obtener estadísticas del curso
app.get('/api/cursos/:id/estadisticas', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el curso existe
    const curso = await query('SELECT id_curso FROM curso WHERE id_curso = ?', [id]);
    if (curso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    
    // Estadísticas generales
    // Contar alumnos inscritos
    const totalAlumnos = await query(
      `SELECT COUNT(*) AS total FROM alumno_curso WHERE curso_id = ?`,
      [id]
    );
    
    // Contar alumnos que han finalizado
    const alumnosFinalizados = await query(
      `SELECT COUNT(*) AS total FROM alumno_curso WHERE curso_id = ? AND finalizado = TRUE`,
      [id]
    );
    
    // Calcular tasa de completado
    const total = totalAlumnos[0]?.total || 0;
    const finalizados = alumnosFinalizados[0]?.total || 0;
    const tasaCompletado = total > 0 ? Math.round((finalizados / total) * 100) : 0;
    
    // Obtener total de contenidos del curso
    const totalContenidos = await query(
      `SELECT COUNT(*) AS total FROM contenido WHERE curso_id = ?`,
      [id]
    );
    
    // Rendimiento por alumno
    // Obtener datos completos de alumnos con información de usuario
    const alumnosConEmail = await query(
      `SELECT 
        a.id_alumno,
        u.nombre,
        u.apellido,
        u.correo,
        ac.fecha_inscripcion,
        ac.finalizado,
        CASE 
          WHEN ac.finalizado = TRUE THEN 100
          ELSE 0
        END AS progreso
       FROM alumno_curso ac
       JOIN alumno a ON ac.alumno_id = a.id_alumno
       JOIN usuario u ON a.usuario_id = u.id_usuario
       WHERE ac.curso_id = ?
       ORDER BY ac.fecha_inscripcion DESC`,
      [id]
    );
    
    // Calcular promedio general (basado en finalizados)
    const promedioGeneral = total > 0 ? Math.round((finalizados / total) * 100) : 0;
    
    // Contar alumnos en progreso (inscritos pero no finalizados)
    const enProgreso = total - finalizados;
    
    res.json({
      total_alumnos: total,
      promedio_general: promedioGeneral,
      tasa_completado: tasaCompletado,
      porcentaje_completado: tasaCompletado, // Alias para compatibilidad con frontend
      en_progreso: enProgreso,
      alumnos: alumnosConEmail.map(a => ({
        nombre: `${a.nombre} ${a.apellido}`,
        email: a.correo || '',
        progreso: a.finalizado ? 100 : 0,
        calificacion: a.finalizado ? 10 : 0, // Simplificado: 10 si finalizado, 0 si no
        promedio: a.finalizado ? 10 : 0, // Alias para compatibilidad
        ultimo_acceso: a.fecha_inscripcion,
        estado: a.finalizado ? 'completado' : 'en_progreso' // Normalizado para frontend
      }))
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al obtener estadísticas', details: error.message });
  }
});

// ========================================
// GESTIÓN DE CONTENIDO
// ========================================

// POST /api/contenido - Agregar contenido a un curso
app.post('/api/contenido', async (req, res) => {
  try {
    const { curso_id, seccion, texto, usuario_id, estado } = req.body;
    
    if (!curso_id || !usuario_id) {
      return res.status(400).json({ error: 'Curso ID y Usuario ID son requeridos' });
    }
    
    const result = await query(
      `INSERT INTO contenido (curso_id, seccion, texto, usuario_id, estado, fecha_subida)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [curso_id, seccion || null, texto || null, usuario_id, estado || 'pendiente']
    );
    
    res.json({ 
      success: true, 
      contenido_id: result.insertId,
      message: 'Contenido agregado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al agregar contenido:', error);
    res.status(500).json({ error: 'Error al agregar el contenido: ' + error.message });
  }
});

// DELETE /api/contenido/:id - Eliminar contenido
app.delete('/api/contenido/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM contenido WHERE id_contenido = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }
    
    res.json({ success: true, message: 'Contenido eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    res.status(500).json({ error: 'Error al eliminar el contenido' });
  }
});

// ========================================
// GESTIÓN DE QUIZZES Y PREGUNTAS
// ========================================

// GET /api/cursos/:id/cuestionarios - Obtener cuestionarios de un curso
app.get('/api/cursos/:id/cuestionarios', async (req, res) => {
  try {
    const { id } = req.params;
    const cuestionarios = await query(
      'SELECT * FROM cuestionario WHERE curso_id = ?',
      [id]
    );
    res.json(cuestionarios);
  } catch (error) {
    console.error('Error al obtener cuestionarios:', error);
    res.status(500).json({ error: 'Error al obtener cuestionarios' });
  }
});

// POST /api/cuestionarios - Crear nuevo quiz
app.post('/api/cuestionarios', async (req, res) => {
  try {
    const { curso_id, titulo, descripcion, estado } = req.body;
    
    if (!curso_id || !titulo) {
      return res.status(400).json({ error: 'Curso ID y título son requeridos' });
    }
    
    const result = await query(
      `INSERT INTO cuestionario (curso_id, titulo, descripcion, estado)
       VALUES (?, ?, ?, ?)`,
      [curso_id, titulo, descripcion || null, estado || 'activo']
    );
    
    res.json({ 
      success: true, 
      quiz_id: result.insertId,
      message: 'Quiz creado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al crear quiz:', error);
    res.status(500).json({ error: 'Error al crear el quiz: ' + error.message });
  }
});

// DELETE /api/cuestionarios/:id - Eliminar cuestionario
app.delete('/api/cuestionarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el cuestionario existe
    const cuestionario = await query('SELECT id_cuestionario FROM cuestionario WHERE id_cuestionario = ?', [id]);
    if (cuestionario.length === 0) {
      return res.status(404).json({ error: 'Cuestionario no encontrado' });
    }
    
    // Eliminar opciones primero
    await query(
      `DELETE o FROM opcion o
       INNER JOIN pregunta p ON o.pregunta_id = p.id_pregunta
       WHERE p.cuestionario_id = ?`,
      [id]
    );
    
    // Eliminar preguntas
    await query('DELETE FROM pregunta WHERE cuestionario_id = ?', [id]);
    
    // Eliminar cuestionario
    const result = await query('DELETE FROM cuestionario WHERE id_cuestionario = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No se pudo eliminar el cuestionario' });
    }
    
    res.json({ success: true, message: 'Cuestionario eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar cuestionario:', error);
    res.status(500).json({ error: 'Error al eliminar el cuestionario: ' + error.message });
  }
});

// GET /api/cuestionarios/:id/preguntas - Obtener preguntas de un quiz
app.get('/api/cuestionarios/:id/preguntas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const preguntas = await query(
      `SELECT p.*, 
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT('id', o.id_opcion, 'texto_opcion', o.texto_opcion, 'es_correcta', o.es_correcta)
        )
        FROM opcion o
        WHERE o.pregunta_id = p.id_pregunta
        ) AS opciones
       FROM pregunta p
       WHERE p.cuestionario_id = ?`,
      [id]
    );
    
    // Parsear opciones JSON
    const preguntasConOpciones = preguntas.map(p => ({
      ...p,
      opciones: p.opciones ? JSON.parse(p.opciones) : []
    }));
    
    res.json(preguntasConOpciones);
    
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    res.status(500).json({ error: 'Error al obtener las preguntas' });
  }
});

// POST /api/preguntas - Agregar pregunta a un quiz
app.post('/api/preguntas', async (req, res) => {
  try {
    const { cuestionario_id, texto_pregunta, opciones } = req.body;
    
    if (!cuestionario_id || !texto_pregunta) {
      return res.status(400).json({ error: 'Quiz ID y texto de pregunta son requeridos' });
    }
    
    // Insertar pregunta
    const resultPregunta = await query(
      `INSERT INTO pregunta (cuestionario_id, texto_pregunta)
       VALUES (?, ?)`,
      [cuestionario_id, texto_pregunta]
    );
    
    const preguntaId = resultPregunta.insertId;
    
    // Insertar opciones si existen
    if (opciones && opciones.length > 0) {
      for (const opcion of opciones) {
    await query(
          `INSERT INTO opcion (pregunta_id, texto_opcion, es_correcta)
           VALUES (?, ?, ?)`,
          [preguntaId, opcion.texto_opcion || opcion.opcion || '', opcion.es_correcta || false]
        );
      }
    }
    
    res.json({ 
      success: true, 
      pregunta_id: preguntaId,
      message: 'Pregunta agregada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al agregar pregunta:', error);
    res.status(500).json({ error: 'Error al agregar la pregunta: ' + error.message });
  }
});

// DELETE /api/preguntas/:id - Eliminar pregunta
app.delete('/api/preguntas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Eliminar opciones primero
    await query('DELETE FROM opcion WHERE pregunta_id = ?', [id]);
    
    // Eliminar pregunta
    const result = await query('DELETE FROM pregunta WHERE id_pregunta = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    
    res.json({ success: true, message: 'Pregunta eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
    res.status(500).json({ error: 'Error al eliminar la pregunta' });
  }
});

// ========================================
// UPLOAD DE ARCHIVOS
// ========================================

// POST /api/upload - Subir archivo
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    
    const fileUrl = '/uploads/' + req.file.filename;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      message: 'Archivo subido exitosamente'
    });
    
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error al subir el archivo' });
  }
});

// POST /api/upload-multiple - Subir múltiples archivos
app.post('/api/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos' });
    }
    
    const files = req.files.map(file => ({
      url: '/uploads/' + file.filename,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));
    
    res.json({
      success: true,
      files: files,
      message: `${files.length} archivo(s) subido(s) exitosamente`
    });
    
  } catch (error) {
    console.error('Error al subir archivos:', error);
    res.status(500).json({ error: 'Error al subir los archivos' });
  }
});

// ========================================
// ENDPOINT DE PRUEBA
// ========================================

// GET /api/test-db - Probar conexión a base de datos
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await query('SELECT 1 AS test');
    res.json({ ok: true, message: 'Conexión exitosa', result });
  } catch (error) {
    console.error('Error en test-db:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========================================
// GESTIÓN DE USUARIOS (ADMIN)
// ========================================

// PUT /api/usuarios/:id - Actualizar usuario
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, correo, estado } = req.body;
    
    if (!nombre || !apellido || !correo) {
      return res.status(400).json({ error: 'Nombre, apellido y correo son requeridos' });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({ error: 'El formato del correo electrónico no es válido' });
    }
    
    // Verificar si el correo ya existe en otro usuario
    const existente = await query('SELECT id_usuario FROM usuario WHERE correo = ? AND id_usuario != ?', [correo, id]);
    if (existente.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }
    
    // Validar estado si se proporciona
    if (estado && !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ error: 'El estado debe ser "activo" o "inactivo"' });
    }
    
    const result = await query(
      `UPDATE usuario 
       SET nombre = ?, apellido = ?, correo = ?, estado = COALESCE(?, estado)
       WHERE id_usuario = ?`,
      [nombre, apellido, correo, estado || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario: ' + error.message });
  }
});

// PUT /api/usuarios/:id/estado - Cambiar estado del usuario
app.put('/api/usuarios/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado || !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ error: 'El estado debe ser "activo" o "inactivo"' });
    }
    
    const result = await query(
      'UPDATE usuario SET estado = ? WHERE id_usuario = ?',
      [estado, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ success: true, message: `Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente` });
    
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    res.status(500).json({ error: 'Error al cambiar estado: ' + error.message });
  }
});

// GET /api/usuarios - Obtener todos los usuarios (admin)
app.get('/api/usuarios', async (req, res) => {
  try {
    const usuarios = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.estado,
              d.id_docente, d.especialidad, d.experiencia,
              a.id_alumno
       FROM usuario u
       LEFT JOIN docente d ON u.id_usuario = d.usuario_id
       LEFT JOIN alumno a ON u.id_usuario = a.usuario_id
       ORDER BY u.id_usuario DESC`
    );
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ========================================
// GESTIÓN DE DOCENTES
// ========================================

// PUT /api/docentes/:id - Actualizar docente
app.put('/api/docentes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { especialidad, experiencia } = req.body;
    
    const result = await query(
      'UPDATE docente SET especialidad = ?, experiencia = ? WHERE id_docente = ?',
      [especialidad || null, experiencia || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Docente no encontrado' });
    }
    
    res.json({ success: true, message: 'Docente actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error al actualizar docente:', error);
    res.status(500).json({ error: 'Error al actualizar docente: ' + error.message });
  }
});

// GET /api/docentes/:id - Obtener docente específico
app.get('/api/docentes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const docentes = await query(
      `SELECT d.*, u.nombre, u.apellido, u.correo, u.rol, u.estado
       FROM docente d
       JOIN usuario u ON d.usuario_id = u.id_usuario
       WHERE d.id_docente = ?`,
      [id]
    );
    
    if (docentes.length > 0) {
      res.json(docentes[0]);
    } else {
      res.status(404).json({ error: 'Docente no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener docente:', error);
    res.status(500).json({ error: 'Error al obtener docente' });
  }
});

// ========================================
// GESTIÓN DE CATEGORÍAS (CRUD COMPLETO)
// ========================================

// POST /api/categorias - Crear categoría
app.post('/api/categorias', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const result = await query(
      'INSERT INTO categoria (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    
    res.json({ 
      success: true, 
      categoria_id: result.insertId,
      message: 'Categoría creada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear categoría: ' + error.message });
  }
});

// PUT /api/categorias/:id - Actualizar categoría
app.put('/api/categorias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const result = await query(
      'UPDATE categoria SET nombre = ?, descripcion = ? WHERE id_categoria = ?',
      [nombre, descripcion || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json({ success: true, message: 'Categoría actualizada exitosamente' });
    
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(500).json({ error: 'Error al actualizar categoría: ' + error.message });
  }
});

// DELETE /api/categorias/:id - Eliminar categoría
app.delete('/api/categorias/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay cursos usando esta categoría
    const cursos = await query('SELECT id_curso FROM curso WHERE id_categoria = ?', [id]);
    if (cursos.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la categoría porque tiene cursos asociados' 
      });
    }
    
    const result = await query('DELETE FROM categoria WHERE id_categoria = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json({ success: true, message: 'Categoría eliminada exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar categoría: ' + error.message });
  }
});

// ========================================
// GESTIÓN DE GRADOS (CRUD COMPLETO)
// ========================================

// POST /api/grados - Crear grado
app.post('/api/grados', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const result = await query(
      'INSERT INTO grado (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    
    res.json({ 
      success: true, 
      grado_id: result.insertId,
      message: 'Grado creado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al crear grado:', error);
    res.status(500).json({ error: 'Error al crear grado: ' + error.message });
  }
});

// PUT /api/grados/:id - Actualizar grado
app.put('/api/grados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const result = await query(
      'UPDATE grado SET nombre = ?, descripcion = ? WHERE id_grado = ?',
      [nombre, descripcion || null, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Grado no encontrado' });
    }
    
    res.json({ success: true, message: 'Grado actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error al actualizar grado:', error);
    res.status(500).json({ error: 'Error al actualizar grado: ' + error.message });
  }
});

// DELETE /api/grados/:id - Eliminar grado
app.delete('/api/grados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay cursos usando este grado
    const cursos = await query('SELECT id_curso FROM curso WHERE id_grado = ?', [id]);
    if (cursos.length > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el grado porque tiene cursos asociados' 
      });
    }
    
    const result = await query('DELETE FROM grado WHERE id_grado = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Grado no encontrado' });
    }
    
    res.json({ success: true, message: 'Grado eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar grado:', error);
    res.status(500).json({ error: 'Error al eliminar grado: ' + error.message });
  }
});

// ========================================
// GESTIÓN DE RECURSOS (CRUD COMPLETO)
// ========================================

// GET /api/recursos - Obtener todos los recursos
app.get('/api/recursos', async (req, res) => {
  try {
    const recursos = await query(
      `SELECT r.*, tr.nombre_tipo AS tipo,
              CONCAT(u.nombre, ' ', u.apellido) AS autor
       FROM recurso r
       LEFT JOIN tipo_recurso tr ON r.tipo_id = tr.id_tipo
       LEFT JOIN usuario u ON r.usuario_id = u.id_usuario
       ORDER BY r.fecha_subida DESC`
    );
    
    res.json(recursos);
  } catch (error) {
    console.error('Error al obtener recursos:', error);
    res.status(500).json({ error: 'Error al obtener recursos' });
  }
});

// GET /api/recursos/:id - Obtener recurso específico
app.get('/api/recursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const recursos = await query(
      `SELECT r.*, tr.nombre_tipo AS tipo,
              CONCAT(u.nombre, ' ', u.apellido) AS autor
       FROM recurso r
       LEFT JOIN tipo_recurso tr ON r.tipo_id = tr.id_tipo
       LEFT JOIN usuario u ON r.usuario_id = u.id_usuario
       WHERE r.id_recurso = ?`,
      [id]
    );
    
    if (recursos.length > 0) {
      res.json(recursos[0]);
    } else {
      res.status(404).json({ error: 'Recurso no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener recurso:', error);
    res.status(500).json({ error: 'Error al obtener recurso' });
  }
});

// PUT /api/recursos/:id - Actualizar recurso
app.put('/api/recursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_id, titulo, url, descripcion, estado } = req.body;
    
    const result = await query(
      `UPDATE recurso 
       SET tipo_id = ?, titulo = ?, url = ?, descripcion = ?, estado = ?
       WHERE id_recurso = ?`,
      [tipo_id || null, titulo || null, url || null, descripcion || null, estado || 'pendiente', id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }
    
    res.json({ success: true, message: 'Recurso actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error al actualizar recurso:', error);
    res.status(500).json({ error: 'Error al actualizar recurso: ' + error.message });
  }
});

// DELETE /api/recursos/:id - Eliminar recurso
app.delete('/api/recursos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM recurso WHERE id_recurso = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }
    
    res.json({ success: true, message: 'Recurso eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar recurso:', error);
    res.status(500).json({ error: 'Error al eliminar recurso: ' + error.message });
  }
});

// ========================================
// ENCUESTAS DE SATISFACCIÓN
// ========================================

// GET /api/encuestas - Obtener todas las encuestas
app.get('/api/encuestas', async (req, res) => {
  try {
    const { curso_id, alumno_id } = req.query;
    
    let sql = `
      SELECT e.*, 
             c.titulo AS curso_titulo,
             CONCAT(u.nombre, ' ', u.apellido) AS alumno_nombre,
             u.correo AS alumno_correo
      FROM encuesta_satisfaccion e
      LEFT JOIN curso c ON e.curso_id = c.id_curso
      LEFT JOIN alumno a ON e.alumno_id = a.id_alumno
      LEFT JOIN usuario u ON a.usuario_id = u.id_usuario
      WHERE 1=1
    `;
    
    const params = [];
    
    if (curso_id) {
      sql += ' AND e.curso_id = ?';
      params.push(curso_id);
    }
    
    if (alumno_id) {
      sql += ' AND e.alumno_id = ?';
      params.push(alumno_id);
    }
    
    sql += ' ORDER BY e.fecha_respuesta DESC';
    
    const encuestas = await query(sql, params);
    res.json(encuestas);
    
  } catch (error) {
    console.error('Error al obtener encuestas:', error);
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// GET /api/cursos/:id/encuestas - Obtener encuestas de un curso
app.get('/api/cursos/:id/encuestas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const encuestas = await query(
      `SELECT e.*, 
              CONCAT(u.nombre, ' ', u.apellido) AS alumno_nombre,
              u.correo AS alumno_correo
       FROM encuesta_satisfaccion e
       LEFT JOIN alumno a ON e.alumno_id = a.id_alumno
       LEFT JOIN usuario u ON a.usuario_id = u.id_usuario
       WHERE e.curso_id = ?
       ORDER BY e.fecha_respuesta DESC`,
      [id]
    );
    
    res.json(encuestas);
  } catch (error) {
    console.error('Error al obtener encuestas del curso:', error);
    res.status(500).json({ error: 'Error al obtener encuestas' });
  }
});

// ========================================
// SISTEMA DE APROBACIÓN POR ADMINISTRADORES
// ========================================

// POST /api/aprobaciones - Crear registro de aprobación
app.post('/api/aprobaciones', async (req, res) => {
  try {
    const { admin_id, objeto_tipo, objeto_id, estado, comentario } = req.body;
    
    if (!admin_id || !objeto_tipo || !objeto_id || !estado) {
      return res.status(400).json({ error: 'Admin ID, tipo de objeto, ID de objeto y estado son requeridos' });
    }
    
    if (!['curso', 'contenido', 'recurso'].includes(objeto_tipo)) {
      return res.status(400).json({ error: 'El tipo de objeto debe ser "curso", "contenido" o "recurso"' });
    }
    
    if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'El estado debe ser "pendiente", "aprobado" o "rechazado"' });
    }
    
    // Verificar que el objeto existe
    let tablaObjeto = '';
    let campoId = '';
    
    switch (objeto_tipo) {
      case 'curso':
        tablaObjeto = 'curso';
        campoId = 'id_curso';
        break;
      case 'contenido':
        tablaObjeto = 'contenido';
        campoId = 'id_contenido';
        break;
      case 'recurso':
        tablaObjeto = 'recurso';
        campoId = 'id_recurso';
        break;
    }
    
    const objeto = await query(`SELECT ${campoId} FROM ${tablaObjeto} WHERE ${campoId} = ?`, [objeto_id]);
    if (objeto.length === 0) {
      return res.status(404).json({ error: `${objeto_tipo} no encontrado` });
    }
    
    // Crear registro de aprobación
    const result = await query(
      `INSERT INTO aprobacion_admin (admin_id, objeto_tipo, objeto_id, estado, comentario)
       VALUES (?, ?, ?, ?, ?)`,
      [admin_id, objeto_tipo, objeto_id, estado, comentario || null]
    );
    
    // Actualizar el estado del objeto según el tipo
    await query(
      `UPDATE ${tablaObjeto} SET estado = ? WHERE ${campoId} = ?`,
      [estado, objeto_id]
    );
    
    res.json({ 
      success: true, 
      aprobacion_id: result.insertId,
      message: `${objeto_tipo} ${estado === 'aprobado' ? 'aprobado' : estado === 'rechazado' ? 'rechazado' : 'marcado como pendiente'} exitosamente`
    });
    
  } catch (error) {
    console.error('Error al crear aprobación:', error);
    res.status(500).json({ error: 'Error al procesar aprobación: ' + error.message });
  }
});

// GET /api/aprobaciones - Obtener todas las aprobaciones
app.get('/api/aprobaciones', async (req, res) => {
  try {
    const { objeto_tipo, estado } = req.query;
    
    let sql = `
      SELECT a.*, 
             CONCAT(u.nombre, ' ', u.apellido) AS admin_nombre,
             CASE 
               WHEN a.objeto_tipo = 'curso' THEN c.titulo
               WHEN a.objeto_tipo = 'contenido' THEN cont.seccion
               WHEN a.objeto_tipo = 'recurso' THEN r.titulo
             END AS objeto_nombre
      FROM aprobacion_admin a
      JOIN usuario u ON a.admin_id = u.id_usuario
      LEFT JOIN curso c ON a.objeto_tipo = 'curso' AND a.objeto_id = c.id_curso
      LEFT JOIN contenido cont ON a.objeto_tipo = 'contenido' AND a.objeto_id = cont.id_contenido
      LEFT JOIN recurso r ON a.objeto_tipo = 'recurso' AND a.objeto_id = r.id_recurso
      WHERE 1=1
    `;
    
    const params = [];
    
    if (objeto_tipo) {
      sql += ' AND a.objeto_tipo = ?';
      params.push(objeto_tipo);
    }
    
    if (estado) {
      sql += ' AND a.estado = ?';
      params.push(estado);
    }
    
    sql += ' ORDER BY a.fecha_revision DESC';
    
    const aprobaciones = await query(sql, params);
    res.json(aprobaciones);
    
  } catch (error) {
    console.error('Error al obtener aprobaciones:', error);
    res.status(500).json({ error: 'Error al obtener aprobaciones' });
  }
});

// GET /api/aprobaciones/pendientes - Obtener objetos pendientes de aprobación
app.get('/api/aprobaciones/pendientes', async (req, res) => {
  try {
    const { tipo } = req.query;
    
    let pendientes = {
      cursos: [],
      contenidos: [],
      recursos: []
    };
    
    if (!tipo || tipo === 'curso') {
      const cursos = await query(
        `SELECT c.*, 
                cat.nombre AS categoria, g.nombre AS grado,
                CONCAT(u.nombre, ' ', u.apellido) AS docente_nombre
         FROM curso c
         LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
         LEFT JOIN grado g ON c.id_grado = g.id_grado
         LEFT JOIN docente d ON c.docente_id = d.id_docente
         LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
         WHERE c.estado = 'pendiente'
         ORDER BY c.fecha_creacion DESC`
      );
      pendientes.cursos = cursos;
    }
    
    if (!tipo || tipo === 'contenido') {
      const contenidos = await query(
        `SELECT c.*, 
                cur.titulo AS curso_titulo,
                CONCAT(u.nombre, ' ', u.apellido) AS autor_nombre
         FROM contenido c
         LEFT JOIN curso cur ON c.curso_id = cur.id_curso
         LEFT JOIN usuario u ON c.usuario_id = u.id_usuario
         WHERE c.estado = 'pendiente'
         ORDER BY c.fecha_subida DESC`
      );
      pendientes.contenidos = contenidos;
    }
    
    if (!tipo || tipo === 'recurso') {
      const recursos = await query(
        `SELECT r.*, 
                cur.titulo AS curso_titulo,
                tr.nombre_tipo AS tipo_recurso,
                CONCAT(u.nombre, ' ', u.apellido) AS autor_nombre
         FROM recurso r
         LEFT JOIN curso cur ON r.curso_id = cur.id_curso
         LEFT JOIN tipo_recurso tr ON r.tipo_id = tr.id_tipo
         LEFT JOIN usuario u ON r.usuario_id = u.id_usuario
         WHERE r.estado = 'pendiente'
         ORDER BY r.fecha_subida DESC`
      );
      pendientes.recursos = recursos;
    }
    
    res.json(pendientes);
    
  } catch (error) {
    console.error('Error al obtener pendientes:', error);
    res.status(500).json({ error: 'Error al obtener objetos pendientes' });
  }
});

// PUT /api/aprobaciones/:id - Actualizar aprobación
app.put('/api/aprobaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, comentario } = req.body;
    
    if (!estado || !['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'El estado debe ser "pendiente", "aprobado" o "rechazado"' });
    }
    
    // Obtener la aprobación
    const aprobacion = await query('SELECT * FROM aprobacion_admin WHERE id_aprobacion = ?', [id]);
    if (aprobacion.length === 0) {
      return res.status(404).json({ error: 'Aprobación no encontrada' });
    }
    
    const ap = aprobacion[0];
    
    // Actualizar aprobación
    await query(
      'UPDATE aprobacion_admin SET estado = ?, comentario = ?, fecha_revision = NOW() WHERE id_aprobacion = ?',
      [estado, comentario || null, id]
    );
    
    // Actualizar el estado del objeto
    let tablaObjeto = '';
    let campoId = '';
    
    switch (ap.objeto_tipo) {
      case 'curso':
        tablaObjeto = 'curso';
        campoId = 'id_curso';
        break;
      case 'contenido':
        tablaObjeto = 'contenido';
        campoId = 'id_contenido';
        break;
      case 'recurso':
        tablaObjeto = 'recurso';
        campoId = 'id_recurso';
        break;
    }
    
    await query(
      `UPDATE ${tablaObjeto} SET estado = ? WHERE ${campoId} = ?`,
      [estado, ap.objeto_id]
    );
    
    res.json({ 
      success: true, 
      message: `${ap.objeto_tipo} ${estado === 'aprobado' ? 'aprobado' : estado === 'rechazado' ? 'rechazado' : 'marcado como pendiente'} exitosamente`
    });
    
  } catch (error) {
    console.error('Error al actualizar aprobación:', error);
    res.status(500).json({ error: 'Error al actualizar aprobación: ' + error.message });
  }
});

// ========================================
// ACTUALIZAR CURSO CON CUESTIONARIO ASOCIADO
// ========================================

// Actualizar el endpoint PUT de cursos para incluir id_cuestionario
// (Ya existe, solo necesito verificar que incluya id_cuestionario)

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// 404 handler general (debe estar al final)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  } else {
    res.status(404).send('Página no encontrada');
  }
});

// ========================================
// INICIO DEL SERVIDOR
// ========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor EduVision corriendo en puerto ${PORT}`);
  console.log(`📊 Base de datos: ${dbConfig.database}`);
  console.log(`📡 API disponible en http://0.0.0.0:${PORT}/api`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});
