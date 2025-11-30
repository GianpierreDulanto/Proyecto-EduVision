const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
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
// IMPORTANTE: En Railway con proyectos separados, NO uses mysql.railway.internal
// Usa el MYSQLHOST real del proyecto MySQL (ej: containers-us-east-XXX.railway.app)
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'sistema_cursos',
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Configuración SSL para Railway (si el host es de Railway)
  ssl: process.env.MYSQLHOST && process.env.MYSQLHOST.includes('railway.app') ? {
    rejectUnauthorized: false
  } : false
};

// Validación y advertencias al iniciar
if (process.env.MYSQLHOST && process.env.MYSQLHOST.includes('railway.internal')) {
  console.error('❌ ERROR: mysql.railway.internal solo funciona cuando MySQL está en el mismo proyecto');
  console.error('❌ Como tienes proyectos separados, usa el MYSQLHOST real del proyecto MySQL');
  console.error('❌ Ejemplo: containers-us-east-XXX.railway.app');
}

// Pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función helper para ejecutar queries
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Error en query:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    console.error('Error completo:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
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

    // Buscar usuario por correo
    const usuarios = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.contraseña, u.rol, u.estado,
              d.id_docente, d.especialidad,
              a.id_alumno
       FROM usuario u
       LEFT JOIN docente d ON u.id_usuario = d.usuario_id
       LEFT JOIN alumno a ON u.id_usuario = a.usuario_id
       WHERE u.correo = ? AND u.estado = 'activo'`,
      [correo]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
    }

    const user = usuarios[0];
    
    // Verificar contraseña (puede estar hasheada o en texto plano para compatibilidad)
    let passwordMatch = false;
    
    // Intentar comparar con bcrypt primero
    if (user.contraseña && user.contraseña.startsWith('$2')) {
      // Contraseña hasheada
      passwordMatch = await bcrypt.compare(contraseña, user.contraseña);
    } else {
      // Contraseña en texto plano (para compatibilidad con datos existentes)
      passwordMatch = user.contraseña === contraseña;
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // No enviar contraseña al cliente
    delete user.contraseña;
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Error en el servidor' });
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
    console.error('❌ Error al obtener categorías:', error.message);
    console.error('Detalles:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      error: 'Error al obtener categorías',
      details: error.message,
      code: error.code
    });
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
    
    // Validar que el alumno existe
    const alumno = await query('SELECT id_alumno FROM alumno WHERE id_alumno = ?', [alumno_id]);
    if (alumno.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }
    
    // Validar que el curso existe
    const curso = await query('SELECT id_curso FROM curso WHERE id_curso = ?', [curso_id]);
    if (curso.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
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
    console.error('Detalles del error:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      message: error.message,
      stack: error.stack
    });
    
    // Proporcionar mensaje de error más detallado
    let errorMessage = 'Error al inscribir';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Error: La tabla alumno_curso no existe en la base de datos';
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Error: El alumno o curso especificado no existe';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'Ya estás inscrito en este curso';
    } else if (error.sqlMessage) {
      errorMessage = `Error de base de datos: ${error.sqlMessage}`;
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        sqlMessage: error.sqlMessage,
        message: error.message
      } : undefined
    });
  }
});

// GET /api/alumnos/:id/cursos - Obtener cursos de un alumno
app.get('/api/alumnos/:id/cursos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const cursos = await query(
      `SELECT DISTINCT c.*, 
              MAX(ac.fecha_inscripcion) AS fecha_inscripcion, 
              MAX(ac.finalizado) AS finalizado,
              cat.nombre AS categoria, 
              g.nombre AS grado,
              CONCAT(u.nombre, ' ', u.apellido) AS docente
       FROM alumno_curso ac
       INNER JOIN curso c ON ac.curso_id = c.id_curso
       LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
       LEFT JOIN grado g ON c.id_grado = g.id_grado
       LEFT JOIN docente d ON c.docente_id = d.id_docente
       LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
       WHERE ac.alumno_id = ?
       GROUP BY c.id_curso, cat.nombre, g.nombre, u.nombre, u.apellido
       ORDER BY fecha_inscripcion DESC`,
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

// PUT /api/contenido/:id - Actualizar contenido
app.put('/api/contenido/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, tipo, url, orden, curso_id } = req.body;
    
    if (!titulo || !tipo || !url) {
      return res.status(400).json({ error: 'Título, tipo y URL son requeridos' });
    }
    
    await query(
      'UPDATE contenido SET titulo = ?, tipo = ?, url = ?, orden = ? WHERE id_contenido = ?',
      [titulo, tipo, url, orden || 1, id]
    );
    
    res.json({ success: true, message: 'Contenido actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({ error: 'Error al actualizar el contenido' });
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
    
    // Obtener preguntas
    const preguntas = await query(
      `SELECT p.id_pregunta, p.cuestionario_id, p.texto_pregunta
       FROM pregunta p
       WHERE p.cuestionario_id = ?
       ORDER BY p.id_pregunta`,
      [id]
    );
    
    if (!preguntas || preguntas.length === 0) {
      return res.json([]);
    }
    
    // Obtener opciones para cada pregunta
    const preguntasConOpciones = await Promise.all(
      preguntas.map(async (pregunta) => {
        const opciones = await query(
          `SELECT id_opcion, texto_opcion, es_correcta
           FROM opcion
           WHERE pregunta_id = ?
           ORDER BY id_opcion`,
          [pregunta.id_pregunta]
        );
        
        // Convertir es_correcta a booleano
        const opcionesFormateadas = (opciones || []).map(opcion => ({
          id_opcion: opcion.id_opcion,
          texto_opcion: opcion.texto_opcion,
          es_correcta: Boolean(opcion.es_correcta)
        }));
        
        return {
          id_pregunta: pregunta.id_pregunta,
          cuestionario_id: pregunta.cuestionario_id,
          texto_pregunta: pregunta.texto_pregunta,
          opciones: opcionesFormateadas
        };
      })
    );
    
    res.json(preguntasConOpciones);
    
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    res.status(500).json({ error: 'Error al obtener las preguntas: ' + error.message });
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
    console.log('🔍 Probando conexión a base de datos...');
    console.log('📊 Configuración DB:', {
      host: dbConfig.host,
      database: dbConfig.database,
      port: dbConfig.port,
      user: dbConfig.user,
      hasPassword: !!dbConfig.password
    });
    
    // Probar conexión básica
    const result = await query('SELECT 1 AS test');
    console.log('✅ Conexión exitosa');
    
    // Verificar que la tabla alumno_curso existe
    let tableExists = false;
    let tableStructure = null;
    try {
      const tables = await query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alumno_curso'",
        [dbConfig.database]
      );
      tableExists = tables.length > 0;
      
      if (tableExists) {
        // Obtener estructura de la tabla
        tableStructure = await query(
          "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alumno_curso' ORDER BY ORDINAL_POSITION",
          [dbConfig.database]
        );
      }
    } catch (tableError) {
      console.error('Error al verificar tabla:', tableError.message);
    }
    
    res.json({ 
      ok: true, 
      message: 'Conexión exitosa', 
      result,
      tableCheck: {
        alumno_curso: {
          exists: tableExists,
          structure: tableStructure
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en test-db:', error.message);
    console.error('Detalles:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      details: {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      }
    });
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

// ========================================
// ENDPOINTS DE GESTIÓN DE PERFIL DE USUARIO
// ========================================

// GET /api/usuarios/:id/perfil - Obtener perfil completo
app.get('/api/usuarios/:id/perfil', async (req, res) => {
  try {
    const { id } = req.params;
    
    const perfil = await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.estado,
              u.avatar, u.biografia, u.fecha_registro, u.ultima_conexion,
              u.telefono, u.pais, u.ciudad, u.sitio_web, u.linkedin, u.twitter, u.verificado,
              d.id_docente, d.especialidad, d.experiencia,
              a.id_alumno
       FROM usuario u
       LEFT JOIN docente d ON u.id_usuario = d.usuario_id
       LEFT JOIN alumno a ON u.id_usuario = a.usuario_id
       WHERE u.id_usuario = ?`,
      [id]
    );
    
    if (perfil.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(perfil[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/usuarios/:id/perfil - Actualizar perfil
app.put('/api/usuarios/:id/perfil', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, pais, ciudad, biografia, sitio_web, linkedin, twitter } = req.body;
    
    await query(
      `UPDATE usuario 
       SET nombre = ?, apellido = ?, telefono = ?, pais = ?, ciudad = ?,
           biografia = ?, sitio_web = ?, linkedin = ?, twitter = ?
       WHERE id_usuario = ?`,
      [nombre, apellido, telefono, pais, ciudad, biografia, sitio_web, linkedin, twitter, id]
    );
    
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// POST /api/usuarios/:id/avatar - Subir avatar
app.post('/api/usuarios/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    await query(
      'UPDATE usuario SET avatar = ? WHERE id_usuario = ?',
      [avatarUrl, id]
    );
    
    res.json({ message: 'Avatar actualizado correctamente', url: avatarUrl });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json({ error: 'Error al subir avatar' });
  }
});

// PUT /api/usuarios/:id/contraseña - Cambiar contraseña
app.put('/api/usuarios/:id/contraseña', async (req, res) => {
  try {
    const { id } = req.params;
    const { contraseña_actual, contraseña_nueva } = req.body;
    
    if (!contraseña_actual || !contraseña_nueva) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    
    if (contraseña_nueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    
    // Obtener usuario actual
    const usuarios = await query('SELECT contraseña FROM usuario WHERE id_usuario = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const user = usuarios[0];
    
    // Verificar contraseña actual
    let passwordMatch = false;
    if (user.contraseña && user.contraseña.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(contraseña_actual, user.contraseña);
    } else {
      passwordMatch = user.contraseña === contraseña_actual;
    }
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(contraseña_nueva, 10);
    
    // Actualizar contraseña
    await query('UPDATE usuario SET contraseña = ? WHERE id_usuario = ?', [hashedPassword, id]);
    
    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// ========================================
// ENDPOINTS DE CONFIGURACIÓN DE ACCESIBILIDAD
// ========================================

// GET /api/usuarios/:id/accesibilidad - Obtener configuración
app.get('/api/usuarios/:id/accesibilidad', async (req, res) => {
  try {
    const { id } = req.params;
    
    let config = await query(
      'SELECT * FROM configuracion_accesibilidad WHERE usuario_id = ?',
      [id]
    );
    
    // Si no existe, crear configuración por defecto
    if (config.length === 0) {
      await query(
        'INSERT INTO configuracion_accesibilidad (usuario_id) VALUES (?)',
        [id]
      );
      config = await query(
        'SELECT * FROM configuracion_accesibilidad WHERE usuario_id = ?',
        [id]
      );
    }
    
    res.json(config[0]);
  } catch (error) {
    console.error('Error al obtener configuración de accesibilidad:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/usuarios/:id/accesibilidad - Actualizar configuración
app.put('/api/usuarios/:id/accesibilidad', async (req, res) => {
  try {
    const { id } = req.params;
    const config = req.body;
    
    await query(
      `UPDATE configuracion_accesibilidad 
       SET alto_contraste = ?, tipografia_legible = ?, tamano_texto = ?,
           espaciado_linea = ?, espaciado_letra = ?, modo_daltonismo = ?,
           lector_pantalla = ?, velocidad_lector = ?, reducir_movimiento = ?,
           subrayar_enlaces = ?, enfoque_mejorado = ?, cursor_grande = ?, guia_lectura = ?
       WHERE usuario_id = ?`,
      [
        config.alto_contraste, config.tipografia_legible, config.tamano_texto,
        config.espaciado_linea, config.espaciado_letra, config.modo_daltonismo,
        config.lector_pantalla, config.velocidad_lector, config.reducir_movimiento,
        config.subrayar_enlaces, config.enfoque_mejorado, config.cursor_grande,
        config.guia_lectura, id
      ]
    );
    
    res.json({ message: 'Configuración actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// ========================================
// ENDPOINTS DE NOTIFICACIONES
// ========================================

// GET /api/usuarios/:id/notificaciones - Obtener notificaciones
app.get('/api/usuarios/:id/notificaciones', async (req, res) => {
  try {
    const { id } = req.params;
    const { leida } = req.query;
    
    let sql = 'SELECT * FROM notificacion WHERE usuario_id = ?';
    const params = [id];
    
    if (leida !== undefined) {
      sql += ' AND leida = ?';
      params.push(leida === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY fecha_creacion DESC LIMIT 50';
    
    const notificaciones = await query(sql, params);
    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PUT /api/notificaciones/:id/leer - Marcar como leída
app.put('/api/notificaciones/:id/leer', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(
      'UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ?',
      [id]
    );
    
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
});

// PUT /api/usuarios/:id/notificaciones/leer-todas - Marcar todas como leídas
app.put('/api/usuarios/:id/notificaciones/leer-todas', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(
      'UPDATE notificacion SET leida = TRUE WHERE usuario_id = ?',
      [id]
    );
    
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

// ========================================
// ENDPOINTS DE SECCIONES Y LECCIONES
// ========================================

// GET /api/cursos/:id/secciones - Obtener secciones con lecciones
app.get('/api/cursos/:id/secciones', async (req, res) => {
  try {
    const { id } = req.params;
    
    const secciones = await query(
      `SELECT * FROM seccion_curso WHERE curso_id = ? ORDER BY orden`,
      [id]
    );
    
    // Obtener lecciones para cada sección
    for (let seccion of secciones) {
      seccion.lecciones = await query(
        `SELECT * FROM leccion WHERE seccion_id = ? ORDER BY orden`,
        [seccion.id_seccion]
      );
    }
    
    res.json(secciones);
  } catch (error) {
    console.error('Error al obtener secciones:', error);
    res.status(500).json({ error: 'Error al obtener secciones' });
  }
});

// POST /api/cursos/:id/secciones - Crear sección
app.post('/api/cursos/:id/secciones', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, orden, duracion_estimada } = req.body;
    
    const result = await query(
      `INSERT INTO seccion_curso (curso_id, titulo, descripcion, orden, duracion_estimada)
       VALUES (?, ?, ?, ?, ?)`,
      [id, titulo, descripcion, orden, duracion_estimada || 0]
    );
    
    res.json({ 
      message: 'Sección creada correctamente',
      id_seccion: result.insertId
    });
  } catch (error) {
    console.error('Error al crear sección:', error);
    res.status(500).json({ error: 'Error al crear sección' });
  }
});

// POST /api/secciones/:id/lecciones - Crear lección
app.post('/api/secciones/:id/lecciones', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, tipo, contenido, url_recurso, duracion, orden, es_vista_previa, transcripcion } = req.body;
    
    const result = await query(
      `INSERT INTO leccion (seccion_id, titulo, descripcion, tipo, contenido, url_recurso, 
                            duracion, orden, es_vista_previa, transcripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, titulo, descripcion, tipo, contenido, url_recurso, duracion || 0, orden, 
       es_vista_previa || false, transcripcion]
    );
    
    res.json({ 
      message: 'Lección creada correctamente',
      id_leccion: result.insertId
    });
  } catch (error) {
    console.error('Error al crear lección:', error);
    res.status(500).json({ error: 'Error al crear lección' });
  }
});

// PUT /api/lecciones/:id - Actualizar lección
app.put('/api/lecciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, contenido, url_recurso, duracion, transcripcion } = req.body;
    
    await query(
      `UPDATE leccion 
       SET titulo = ?, descripcion = ?, contenido = ?, url_recurso = ?,
           duracion = ?, transcripcion = ?
       WHERE id_leccion = ?`,
      [titulo, descripcion, contenido, url_recurso, duracion, transcripcion, id]
    );
    
    res.json({ message: 'Lección actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar lección:', error);
    res.status(500).json({ error: 'Error al actualizar lección' });
  }
});

// DELETE /api/lecciones/:id - Eliminar lección
app.delete('/api/lecciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM leccion WHERE id_leccion = ?', [id]);
    
    res.json({ message: 'Lección eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar lección:', error);
    res.status(500).json({ error: 'Error al eliminar lección' });
  }
});

// ========================================
// ENDPOINTS DE PROGRESO
// ========================================

// GET /api/alumnos/:id/lecciones/:leccionId/progreso - Obtener progreso de lección
// IMPORTANTE: Esta ruta debe estar ANTES de rutas más generales como /api/alumnos/:id/progreso
app.get('/api/alumnos/:id/lecciones/:leccionId/progreso', async (req, res) => {
  try {
    const { id, leccionId } = req.params;
    
    console.log(`[DEBUG] Obteniendo progreso para alumno ${id}, lección ${leccionId}`);
    
    const progreso = await query(
      `SELECT * FROM progreso_leccion 
       WHERE alumno_id = ? AND leccion_id = ?`,
      [id, leccionId]
    );
    
    if (progreso.length === 0) {
      console.log(`[DEBUG] No se encontró progreso, retornando valores por defecto`);
      return res.json({ completada: false, tiempo_visto: 0 });
    }
    
    // Asegurar que completada sea un booleano (MySQL puede retornar 0/1)
    const progresoData = progreso[0];
    if (progresoData.completada !== undefined) {
      progresoData.completada = progresoData.completada === true || progresoData.completada === 1;
    }
    
    console.log(`[DEBUG] Progreso encontrado:`, progresoData);
    res.json(progresoData);
  } catch (error) {
    console.error('Error al obtener progreso de lección:', error);
    res.status(500).json({ error: 'Error al obtener progreso: ' + error.message });
  }
});

// GET /api/alumnos/:alumnoId/cursos/:cursoId/progreso - Progreso de un curso específico
app.get('/api/alumnos/:alumnoId/cursos/:cursoId/progreso', async (req, res) => {
  try {
    const { alumnoId, cursoId } = req.params;
    
    const progreso = await query(
      'SELECT * FROM v_progreso_alumno WHERE id_alumno = ? AND id_curso = ?',
      [alumnoId, cursoId]
    );
    
    if (progreso.length === 0) {
      return res.json({ 
        porcentaje_completado: 0,
        lecciones_completadas: 0,
        total_lecciones_curso: 0
      });
    }
    
    res.json(progreso[0]);
  } catch (error) {
    console.error('Error al obtener progreso del curso:', error);
    res.status(500).json({ error: 'Error al obtener progreso' });
  }
});

// GET /api/alumnos/:id/progreso - Obtener progreso general
app.get('/api/alumnos/:id/progreso', async (req, res) => {
  try {
    const { id } = req.params;
    
    const progreso = await query(
      'SELECT * FROM v_progreso_alumno WHERE id_alumno = ?',
      [id]
    );
    
    res.json(progreso);
  } catch (error) {
    console.error('Error al obtener progreso:', error);
    res.status(500).json({ error: 'Error al obtener progreso' });
  }
});

// POST /api/alumnos/:id/progreso/leccion - Actualizar progreso de lección
app.post('/api/alumnos/:id/progreso/leccion', async (req, res) => {
  try {
    const { id } = req.params;
    const { leccion_id, completada, tiempo_visto, ultima_posicion, notas_alumno } = req.body;
    
    console.log('[DEBUG] Actualizando progreso de lección:', {
      alumno_id: id,
      leccion_id,
      completada,
      tiempo_visto,
      ultima_posicion,
      notas_alumno
    });
    
    // Validar que leccion_id existe
    if (!leccion_id) {
      return res.status(400).json({ error: 'leccion_id es requerido' });
    }
    
    // Convertir IDs a números
    const alumnoId = parseInt(id, 10);
    const leccionId = parseInt(leccion_id, 10);
    
    if (isNaN(alumnoId) || isNaN(leccionId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }
    
    // Verificar que el alumno existe
    const alumnoCheck = await query('SELECT id_alumno FROM alumno WHERE id_alumno = ?', [alumnoId]);
    if (alumnoCheck.length === 0) {
      return res.status(404).json({ error: `Alumno con ID ${alumnoId} no encontrado` });
    }
    
    // Verificar que la lección existe
    const leccionCheck = await query('SELECT id_leccion FROM leccion WHERE id_leccion = ?', [leccionId]);
    if (leccionCheck.length === 0) {
      console.warn(`[WARN] Lección con ID ${leccionId} no encontrada en tabla leccion`);
      // Intentar buscar en contenido antiguo como fallback
      const contenidoCheck = await query('SELECT id_contenido FROM contenido WHERE id_contenido = ?', [leccionId]);
      if (contenidoCheck.length === 0) {
        return res.status(404).json({ error: `Lección con ID ${leccionId} no encontrada` });
      }
      // Si existe en contenido, usar ese ID pero no podemos insertar en progreso_leccion
      // porque requiere una lección válida
      console.warn(`[WARN] Lección ${leccionId} existe en contenido antiguo, pero no en tabla leccion`);
    }
    
    // Convertir completada a boolean si viene como string
    const completadaBool = completada === true || completada === 'true' || completada === 1;
    
    // Insertar o actualizar progreso
    try {
      await query(
        `INSERT INTO progreso_leccion 
         (alumno_id, leccion_id, completada, tiempo_visto, ultima_posicion, notas_alumno, fecha_completado)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           completada = VALUES(completada),
           tiempo_visto = VALUES(tiempo_visto),
           ultima_posicion = VALUES(ultima_posicion),
           notas_alumno = VALUES(notas_alumno),
           fecha_completado = IF(VALUES(completada) = TRUE, NOW(), fecha_completado)`,
        [
          alumnoId, 
          leccionId, 
          completadaBool, 
          tiempo_visto || 0, 
          ultima_posicion || 0, 
          notas_alumno || null, 
          completadaBool ? new Date() : null
        ]
      );
    } catch (dbError) {
      console.error('[ERROR] Error en INSERT/UPDATE progreso_leccion:', dbError);
      console.error('[ERROR] Código de error:', dbError.code);
      console.error('[ERROR] Mensaje:', dbError.message);
      
      // Si es un error de clave foránea, dar un mensaje más claro
      if (dbError.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ 
          error: 'Error de referencia: La lección o el alumno no existen en la base de datos',
          details: dbError.message 
        });
      }
      
      throw dbError; // Re-lanzar para que se capture en el catch general
    }
    
    // Si completó la lección, intentar llamar al procedimiento almacenado (si existe)
    if (completadaBool) {
      try {
        await query('CALL sp_completar_leccion(?, ?)', [alumnoId, leccionId]);
      } catch (procError) {
        // Si el procedimiento no existe o falla, solo registrar el warning pero continuar
        console.warn('No se pudo ejecutar sp_completar_leccion:', procError.message);
      }
    }
    
    res.json({ message: 'Progreso actualizado correctamente' });
  } catch (error) {
    console.error('[ERROR] Error al actualizar progreso:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Error al actualizar progreso',
      details: error.message,
      code: error.code
    });
  }
});

// ========================================
// ENDPOINTS DE LISTA DE DESEOS
// ========================================

// GET /api/alumnos/:id/lista-deseos - Obtener lista de deseos
app.get('/api/alumnos/:id/lista-deseos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const lista = await query(
      `SELECT c.*, ld.fecha_agregado,
              CONCAT(u.nombre, ' ', u.apellido) as nombre_docente,
              cat.nombre as categoria
       FROM lista_deseos ld
       JOIN curso c ON ld.curso_id = c.id_curso
       LEFT JOIN docente d ON c.docente_id = d.id_docente
       LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
       LEFT JOIN categoria cat ON c.id_categoria = cat.id_categoria
       WHERE ld.alumno_id = ?
       ORDER BY ld.fecha_agregado DESC`,
      [id]
    );
    
    res.json(lista);
  } catch (error) {
    console.error('Error al obtener lista de deseos:', error);
    res.status(500).json({ error: 'Error al obtener lista de deseos' });
  }
});

// POST /api/alumnos/:id/lista-deseos - Agregar a lista de deseos
app.post('/api/alumnos/:id/lista-deseos', async (req, res) => {
  try {
    const { id } = req.params;
    const { curso_id } = req.body;
    
    await query(
      'INSERT INTO lista_deseos (alumno_id, curso_id) VALUES (?, ?)',
      [id, curso_id]
    );
    
    res.json({ message: 'Curso agregado a lista de deseos' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El curso ya está en tu lista de deseos' });
    }
    console.error('Error al agregar a lista de deseos:', error);
    res.status(500).json({ error: 'Error al agregar a lista de deseos' });
  }
});

// DELETE /api/alumnos/:id/lista-deseos/:cursoId - Eliminar de lista de deseos
app.delete('/api/alumnos/:id/lista-deseos/:cursoId', async (req, res) => {
  try {
    const { id, cursoId } = req.params;
    
    await query(
      'DELETE FROM lista_deseos WHERE alumno_id = ? AND curso_id = ?',
      [id, cursoId]
    );
    
    res.json({ message: 'Curso eliminado de lista de deseos' });
  } catch (error) {
    console.error('Error al eliminar de lista de deseos:', error);
    res.status(500).json({ error: 'Error al eliminar de lista de deseos' });
  }
});

// ========================================
// ENDPOINTS DE REVIEWS Y RATINGS
// ========================================

// GET /api/cursos/:id/resenas - Obtener reseñas de un curso
app.get('/api/cursos/:id/resenas', async (req, res) => {
  try {
    const { id } = req.params;
    const { ordenar } = req.query; // 'recientes', 'utiles', 'calificacion'
    
    let orderBy = 'r.fecha_publicacion DESC';
    if (ordenar === 'utiles') orderBy = 'r.util_count DESC';
    if (ordenar === 'calificacion') orderBy = 'r.calificacion DESC';
    
    const resenas = await query(
      `SELECT r.*, 
              CONCAT(u.nombre, ' ', u.apellido) as nombre_alumno,
              u.avatar as avatar_alumno,
              resp.respuesta as respuesta_docente,
              resp.fecha_respuesta
       FROM resena_curso r
       JOIN alumno a ON r.alumno_id = a.id_alumno
       JOIN usuario u ON a.usuario_id = u.id_usuario
       LEFT JOIN respuesta_resena resp ON r.id_resena = resp.resena_id
       WHERE r.curso_id = ? AND r.visible = TRUE
       ORDER BY ${orderBy}`,
      [id]
    );
    
    res.json(resenas);
  } catch (error) {
    console.error('Error al obtener reseñas:', error);
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// POST /api/cursos/:id/resenas - Crear reseña
app.post('/api/cursos/:id/resenas', async (req, res) => {
  try {
    const { id } = req.params;
    const { alumno_id, calificacion, titulo, comentario, accesibilidad_calificacion, aspectos_positivos, aspectos_mejorar } = req.body;
    
    // Verificar que el alumno esté inscrito
    const inscrito = await query(
      'SELECT * FROM alumno_curso WHERE alumno_id = ? AND curso_id = ?',
      [alumno_id, id]
    );
    
    if (inscrito.length === 0) {
      return res.status(400).json({ error: 'Debes estar inscrito en el curso para dejar una reseña' });
    }
    
    const result = await query(
      `INSERT INTO resena_curso 
       (curso_id, alumno_id, calificacion, titulo, comentario, accesibilidad_calificacion, 
        aspectos_positivos, aspectos_mejorar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, alumno_id, calificacion, titulo, comentario, accesibilidad_calificacion, aspectos_positivos, aspectos_mejorar]
    );
    
    // Actualizar rating del curso
    await query('CALL sp_actualizar_rating_curso(?)', [id]);
    
    res.json({ 
      message: 'Reseña publicada correctamente',
      id_resena: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya has dejado una reseña para este curso' });
    }
    console.error('Error al crear reseña:', error);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

// PUT /api/resenas/:id - Actualizar reseña
app.put('/api/resenas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { calificacion, titulo, comentario, accesibilidad_calificacion, aspectos_positivos, aspectos_mejorar } = req.body;
    
    await query(
      `UPDATE resena_curso 
       SET calificacion = ?, titulo = ?, comentario = ?, 
           accesibilidad_calificacion = ?, aspectos_positivos = ?, aspectos_mejorar = ?,
           fecha_modificacion = NOW()
       WHERE id_resena = ?`,
      [calificacion, titulo, comentario, accesibilidad_calificacion, aspectos_positivos, aspectos_mejorar, id]
    );
    
    res.json({ message: 'Reseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar reseña:', error);
    res.status(500).json({ error: 'Error al actualizar reseña' });
  }
});

// POST /api/resenas/:id/votar - Votar reseña como útil
app.post('/api/resenas/:id/votar', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, tipo } = req.body; // tipo: 'util' o 'no_util'
    
    await query(
      'INSERT INTO voto_resena (resena_id, usuario_id, tipo) VALUES (?, ?, ?)',
      [id, usuario_id, tipo]
    );
    
    res.json({ message: 'Voto registrado correctamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya has votado esta reseña' });
    }
    console.error('Error al votar reseña:', error);
    res.status(500).json({ error: 'Error al votar reseña' });
  }
});

// POST /api/resenas/:id/responder - Docente responde a reseña
app.post('/api/resenas/:id/responder', async (req, res) => {
  try {
    const { id } = req.params;
    const { docente_id, respuesta } = req.body;
    
    await query(
      'INSERT INTO respuesta_resena (resena_id, docente_id, respuesta) VALUES (?, ?, ?)',
      [id, docente_id, respuesta]
    );
    
    res.json({ message: 'Respuesta publicada correctamente' });
  } catch (error) {
    console.error('Error al responder reseña:', error);
    res.status(500).json({ error: 'Error al responder reseña' });
  }
});

// ========================================
// ENDPOINTS DE CERTIFICADOS
// ========================================

// GET /api/alumnos/:id/certificados - Obtener certificados del alumno
app.get('/api/alumnos/:id/certificados', async (req, res) => {
  try {
    const { id } = req.params;
    
    const certificados = await query(
      `SELECT c.*, curso.titulo as titulo_curso, curso.imagen_portada,
              CONCAT(u.nombre, ' ', u.apellido) as nombre_docente
       FROM certificado c
       JOIN curso ON c.curso_id = curso.id_curso
       LEFT JOIN docente d ON curso.docente_id = d.id_docente
       LEFT JOIN usuario u ON d.usuario_id = u.id_usuario
       WHERE c.alumno_id = ? AND c.visible = TRUE
       ORDER BY c.fecha_emision DESC`,
      [id]
    );
    
    res.json(certificados);
  } catch (error) {
    console.error('Error al obtener certificados:', error);
    res.status(500).json({ error: 'Error al obtener certificados' });
  }
});

// GET /api/certificados/verificar/:codigo - Verificar certificado
app.get('/api/certificados/verificar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const certificado = await query(
      `SELECT c.*, 
              CONCAT(u_alumno.nombre, ' ', u_alumno.apellido) as nombre_alumno,
              curso.titulo as titulo_curso,
              CONCAT(u_docente.nombre, ' ', u_docente.apellido) as nombre_docente
       FROM certificado c
       JOIN alumno a ON c.alumno_id = a.id_alumno
       JOIN usuario u_alumno ON a.usuario_id = u_alumno.id_usuario
       JOIN curso ON c.curso_id = curso.id_curso
       LEFT JOIN docente d ON curso.docente_id = d.id_docente
       LEFT JOIN usuario u_docente ON d.usuario_id = u_docente.id_usuario
       WHERE c.codigo_verificacion = ? AND c.visible = TRUE`,
      [codigo]
    );
    
    if (certificado.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }
    
    res.json(certificado[0]);
  } catch (error) {
    console.error('Error al verificar certificado:', error);
    res.status(500).json({ error: 'Error al verificar certificado' });
  }
});

// ========================================
// ENDPOINTS DE FOROS
// ========================================

// GET /api/cursos/:id/foros - Obtener temas del foro
app.get('/api/cursos/:id/foros', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria, buscar } = req.query;
    
    let sql = `
      SELECT ft.*, 
             CONCAT(u.nombre, ' ', u.apellido) as nombre_usuario,
             u.avatar as avatar_usuario,
             u.rol as rol_usuario,
             COUNT(DISTINCT fr.id_respuesta) as total_respuestas
      FROM foro_tema ft
      JOIN usuario u ON ft.usuario_id = u.id_usuario
      LEFT JOIN foro_respuesta fr ON ft.id_tema = fr.tema_id
      WHERE ft.curso_id = ?
    `;
    const params = [id];
    
    if (categoria) {
      sql += ' AND ft.categoria = ?';
      params.push(categoria);
    }
    
    if (buscar) {
      sql += ' AND (ft.titulo LIKE ? OR ft.contenido LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`);
    }
    
    sql += ' GROUP BY ft.id_tema ORDER BY ft.fijado DESC, ft.fecha_actualizacion DESC';
    
    const temas = await query(sql, params);
    res.json(temas);
  } catch (error) {
    console.error('Error al obtener foros:', error);
    res.status(500).json({ error: 'Error al obtener foros' });
  }
});

// POST /api/cursos/:id/foros - Crear tema de foro
app.post('/api/cursos/:id/foros', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, leccion_id, titulo, contenido, categoria } = req.body;
    
    const result = await query(
      `INSERT INTO foro_tema (curso_id, leccion_id, usuario_id, titulo, contenido, categoria)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, leccion_id, usuario_id, titulo, contenido, categoria || 'pregunta']
    );
    
    res.json({ 
      message: 'Tema creado correctamente',
      id_tema: result.insertId
    });
  } catch (error) {
    console.error('Error al crear tema:', error);
    res.status(500).json({ error: 'Error al crear tema' });
  }
});

// GET /api/foros/:id - Obtener detalles del tema con respuestas
app.get('/api/foros/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Incrementar vistas
    await query('UPDATE foro_tema SET vistas = vistas + 1 WHERE id_tema = ?', [id]);
    
    // Obtener tema
    const tema = await query(
      `SELECT ft.*, 
              CONCAT(u.nombre, ' ', u.apellido) as nombre_usuario,
              u.avatar as avatar_usuario,
              u.rol as rol_usuario
       FROM foro_tema ft
       JOIN usuario u ON ft.usuario_id = u.id_usuario
       WHERE ft.id_tema = ?`,
      [id]
    );
    
    if (tema.length === 0) {
      return res.status(404).json({ error: 'Tema no encontrado' });
    }
    
    // Obtener respuestas
    const respuestas = await query(
      `SELECT fr.*, 
              CONCAT(u.nombre, ' ', u.apellido) as nombre_usuario,
              u.avatar as avatar_usuario,
              u.rol as rol_usuario
       FROM foro_respuesta fr
       JOIN usuario u ON fr.usuario_id = u.id_usuario
       WHERE fr.tema_id = ?
       ORDER BY fr.marcada_correcta DESC, fr.votos_positivos DESC, fr.fecha_publicacion ASC`,
      [id]
    );
    
    res.json({
      tema: tema[0],
      respuestas: respuestas
    });
  } catch (error) {
    console.error('Error al obtener tema:', error);
    res.status(500).json({ error: 'Error al obtener tema' });
  }
});

// POST /api/foros/:id/responder - Responder a tema
app.post('/api/foros/:id/responder', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, contenido, es_respuesta_docente } = req.body;
    
    const result = await query(
      `INSERT INTO foro_respuesta (tema_id, usuario_id, contenido, es_respuesta_docente)
       VALUES (?, ?, ?, ?)`,
      [id, usuario_id, contenido, es_respuesta_docente || false]
    );
    
    res.json({ 
      message: 'Respuesta publicada correctamente',
      id_respuesta: result.insertId
    });
  } catch (error) {
    console.error('Error al responder:', error);
    res.status(500).json({ error: 'Error al responder' });
  }
});

// POST /api/foros/respuestas/:id/votar - Votar respuesta
app.post('/api/foros/respuestas/:id/votar', async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id, tipo } = req.body; // 'positivo' o 'negativo'
    
    await query(
      'INSERT INTO foro_voto (respuesta_id, usuario_id, tipo) VALUES (?, ?, ?)',
      [id, usuario_id, tipo]
    );
    
    res.json({ message: 'Voto registrado correctamente' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya has votado esta respuesta' });
    }
    console.error('Error al votar respuesta:', error);
    res.status(500).json({ error: 'Error al votar respuesta' });
  }
});

// PUT /api/foros/respuestas/:id/marcar-correcta - Marcar respuesta como correcta
app.put('/api/foros/respuestas/:id/marcar-correcta', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Desmarcar otras respuestas del mismo tema
    await query(
      `UPDATE foro_respuesta fr
       JOIN foro_respuesta fr2 ON fr.tema_id = fr2.tema_id
       SET fr.marcada_correcta = FALSE
       WHERE fr2.id_respuesta = ?`,
      [id]
    );
    
    // Marcar esta respuesta
    await query(
      'UPDATE foro_respuesta SET marcada_correcta = TRUE WHERE id_respuesta = ?',
      [id]
    );
    
    // Marcar tema como resuelto
    await query(
      `UPDATE foro_tema ft
       JOIN foro_respuesta fr ON ft.id_tema = fr.tema_id
       SET ft.resuelto = TRUE
       WHERE fr.id_respuesta = ?`,
      [id]
    );
    
    res.json({ message: 'Respuesta marcada como correcta' });
  } catch (error) {
    console.error('Error al marcar respuesta:', error);
    res.status(500).json({ error: 'Error al marcar respuesta' });
  }
});

// ========================================
// ENDPOINTS DE MENSAJERÍA
// ========================================

// GET /api/usuarios/:id/mensajes - Obtener mensajes
app.get('/api/usuarios/:id/mensajes', async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.query; // 'recibidos', 'enviados'
    
    let sql;
    if (tipo === 'enviados') {
      sql = `
        SELECT m.*, 
               CONCAT(u.nombre, ' ', u.apellido) as nombre_destinatario,
               u.avatar as avatar_destinatario
        FROM mensaje m
        JOIN usuario u ON m.destinatario_id = u.id_usuario
        WHERE m.remitente_id = ? AND m.archivado = FALSE
        ORDER BY m.fecha_envio DESC
      `;
    } else {
      sql = `
        SELECT m.*, 
               CONCAT(u.nombre, ' ', u.apellido) as nombre_remitente,
               u.avatar as avatar_remitente
        FROM mensaje m
        JOIN usuario u ON m.remitente_id = u.id_usuario
        WHERE m.destinatario_id = ? AND m.archivado = FALSE
        ORDER BY m.fecha_envio DESC
      `;
    }
    
    const mensajes = await query(sql, [id]);
    res.json(mensajes);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// POST /api/mensajes - Enviar mensaje
app.post('/api/mensajes', async (req, res) => {
  try {
    const { remitente_id, destinatario_id, asunto, contenido } = req.body;
    
    const result = await query(
      `INSERT INTO mensaje (remitente_id, destinatario_id, asunto, contenido)
       VALUES (?, ?, ?, ?)`,
      [remitente_id, destinatario_id, asunto, contenido]
    );
    
    // Crear notificación
    await query(
      `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, url)
       VALUES (?, 'mensaje', 'Nuevo mensaje', ?, '/mensajes')`,
      [destinatario_id, `Tienes un nuevo mensaje: ${asunto}`]
    );
    
    res.json({ 
      message: 'Mensaje enviado correctamente',
      id_mensaje: result.insertId
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// PUT /api/mensajes/:id/leer - Marcar mensaje como leído
app.put('/api/mensajes/:id/leer', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query(
      'UPDATE mensaje SET leido = TRUE WHERE id_mensaje = ?',
      [id]
    );
    
    res.json({ message: 'Mensaje marcado como leído' });
  } catch (error) {
    console.error('Error al marcar mensaje:', error);
    res.status(500).json({ error: 'Error al marcar mensaje' });
  }
});

// ========================================
// ENDPOINTS DE INTENTOS DE CUESTIONARIOS
// ========================================

// GET /api/alumnos/:id/cuestionarios/:quizId/intentos - Obtener intentos
app.get('/api/alumnos/:id/cuestionarios/:quizId/intentos', async (req, res) => {
  try {
    const { id, quizId } = req.params;
    
    const intentos = await query(
      `SELECT * FROM intento_cuestionario 
       WHERE alumno_id = ? AND cuestionario_id = ?
       ORDER BY numero_intento DESC`,
      [id, quizId]
    );
    
    res.json(intentos);
  } catch (error) {
    console.error('Error al obtener intentos:', error);
    res.status(500).json({ error: 'Error al obtener intentos' });
  }
});

// POST /api/alumnos/:id/cuestionarios/:quizId/intentos - Registrar intento
app.post('/api/alumnos/:id/cuestionarios/:quizId/intentos', async (req, res) => {
  try {
    const { id, quizId } = req.params;
    const { puntuacion, tiempo_usado, respuestas_json, aprobado } = req.body;
    
    // Obtener número de intento
    const intentos = await query(
      'SELECT COALESCE(MAX(numero_intento), 0) + 1 as siguiente FROM intento_cuestionario WHERE alumno_id = ? AND cuestionario_id = ?',
      [id, quizId]
    );
    const numeroIntento = intentos[0].siguiente;
    
    const result = await query(
      `INSERT INTO intento_cuestionario 
       (cuestionario_id, alumno_id, numero_intento, fecha_finalizacion, puntuacion, aprobado, tiempo_usado, respuestas_json)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
      [quizId, id, numeroIntento, puntuacion, aprobado, tiempo_usado, JSON.stringify(respuestas_json)]
    );
    
    res.json({ 
      message: 'Intento registrado correctamente',
      id_intento: result.insertId,
      numero_intento: numeroIntento
    });
  } catch (error) {
    console.error('Error al registrar intento:', error);
    res.status(500).json({ error: 'Error al registrar intento' });
  }
});

// ========================================
// ENDPOINTS DE TAREAS
// ========================================

// GET /api/cursos/:id/tareas - Obtener tareas del curso
app.get('/api/cursos/:id/tareas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tareas = await query(
      'SELECT * FROM tarea WHERE curso_id = ? ORDER BY fecha_limite ASC',
      [id]
    );
    
    res.json(tareas);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// POST /api/cursos/:id/tareas - Crear tarea
app.post('/api/cursos/:id/tareas', async (req, res) => {
  try {
    const { id } = req.params;
    const { leccion_id, titulo, descripcion, tipo, puntuacion_maxima, fecha_limite, instrucciones_accesibilidad } = req.body;
    
    const result = await query(
      `INSERT INTO tarea (curso_id, leccion_id, titulo, descripcion, tipo, puntuacion_maxima, fecha_limite, instrucciones_accesibilidad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, leccion_id, titulo, descripcion, tipo, puntuacion_maxima || 100, fecha_limite, instrucciones_accesibilidad]
    );
    
    res.json({ 
      message: 'Tarea creada correctamente',
      id_tarea: result.insertId
    });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// POST /api/tareas/:id/entregar - Entregar tarea
app.post('/api/tareas/:id/entregar', async (req, res) => {
  try {
    const { id } = req.params;
    const { alumno_id, contenido, url_archivo } = req.body;
    
    // Verificar si es entrega tardía
    const tarea = await query('SELECT fecha_limite FROM tarea WHERE id_tarea = ?', [id]);
    const entregaTardia = new Date() > new Date(tarea[0].fecha_limite);
    
    const result = await query(
      `INSERT INTO entrega_tarea (tarea_id, alumno_id, contenido, url_archivo, entrega_tardia)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE contenido = VALUES(contenido), url_archivo = VALUES(url_archivo), fecha_entrega = NOW()`,
      [id, alumno_id, contenido, url_archivo, entregaTardia]
    );
    
    res.json({ 
      message: 'Tarea entregada correctamente',
      entrega_tardia: entregaTardia
    });
  } catch (error) {
    console.error('Error al entregar tarea:', error);
    res.status(500).json({ error: 'Error al entregar tarea' });
  }
});

// PUT /api/entregas/:id/calificar - Calificar entrega
app.put('/api/entregas/:id/calificar', async (req, res) => {
  try {
    const { id } = req.params;
    const { calificacion, retroalimentacion } = req.body;
    
    await query(
      `UPDATE entrega_tarea 
       SET calificacion = ?, retroalimentacion = ?, fecha_calificacion = NOW(), estado = 'calificada'
       WHERE id_entrega = ?`,
      [calificacion, retroalimentacion, id]
    );
    
    res.json({ message: 'Entrega calificada correctamente' });
  } catch (error) {
    console.error('Error al calificar entrega:', error);
    res.status(500).json({ error: 'Error al calificar entrega' });
  }
});

// ========================================
// ENDPOINTS DE ESTADÍSTICAS AVANZADAS
// ========================================

// GET /api/estadisticas/cursos - Estadísticas generales de cursos
app.get('/api/estadisticas/cursos', async (req, res) => {
  try {
    const stats = await query('SELECT * FROM v_estadisticas_curso WHERE estado = "publicado" ORDER BY total_inscritos DESC LIMIT 20');
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// GET /api/estadisticas/docentes - Ranking de docentes
app.get('/api/estadisticas/docentes', async (req, res) => {
  try {
    const ranking = await query('SELECT * FROM v_ranking_docentes LIMIT 20');
    res.json(ranking);
  } catch (error) {
    console.error('Error al obtener ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking' });
  }
});

// Ruta principal y catch-all para SPA
// ========================================
// ENDPOINTS DE LOGROS/BADGES
// ========================================

// GET /api/logros - Obtener todos los logros disponibles
app.get('/api/logros', async (req, res) => {
  try {
    const logros = await query('SELECT * FROM logro ORDER BY puntos DESC');
    res.json(logros);
  } catch (error) {
    console.error('Error al obtener logros:', error);
    res.status(500).json({ error: 'Error al obtener logros' });
  }
});

// GET /api/alumnos/:id/logros - Obtener logros de un alumno
app.get('/api/alumnos/:id/logros', async (req, res) => {
  try {
    const { id } = req.params;
    
    const logros = await query(
      `SELECT l.*, la.fecha_desbloqueo,
              CASE WHEN la.id_logro_alumno IS NOT NULL THEN TRUE ELSE FALSE END AS desbloqueado
       FROM logro l
       LEFT JOIN logro_alumno la ON l.id_logro = la.logro_id AND la.alumno_id = ?
       ORDER BY la.fecha_desbloqueo DESC, l.puntos DESC`,
      [id]
    );
    
    res.json(logros);
  } catch (error) {
    console.error('Error al obtener logros del alumno:', error);
    res.status(500).json({ error: 'Error al obtener logros' });
  }
});

// POST /api/alumnos/:id/logros/:logroId/desbloquear - Desbloquear logro (automático)
app.post('/api/alumnos/:id/logros/:logroId/desbloquear', async (req, res) => {
  try {
    const { id, logroId } = req.params;
    
    // Verificar si ya está desbloqueado
    const existente = await query(
      'SELECT * FROM logro_alumno WHERE logro_id = ? AND alumno_id = ?',
      [logroId, id]
    );
    
    if (existente.length > 0) {
      return res.json({ success: true, message: 'Logro ya estaba desbloqueado', ya_desbloqueado: true });
    }
    
    // Desbloquear logro
    await query(
      'INSERT INTO logro_alumno (logro_id, alumno_id) VALUES (?, ?)',
      [logroId, id]
    );
    
    // Obtener información del logro
    const logro = await query('SELECT * FROM logro WHERE id_logro = ?', [logroId]);
    
    // Crear notificación
    await query(
      `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, url)
       SELECT u.id_usuario, 'logro', '¡Logro Desbloqueado!', 
              CONCAT('Has desbloqueado el logro: ', ?), '#miPerfil'
       FROM alumno a
       JOIN usuario u ON a.usuario_id = u.id_usuario
       WHERE a.id_alumno = ?`,
      [logro[0]?.nombre || 'Nuevo logro', id]
    );
    
    res.json({ success: true, logro: logro[0], message: 'Logro desbloqueado exitosamente' });
  } catch (error) {
    console.error('Error al desbloquear logro:', error);
    res.status(500).json({ error: 'Error al desbloquear logro' });
  }
});

// GET /api/logros/verificar/:codigo - Verificar y desbloquear logro por código
app.get('/api/logros/verificar/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { alumno_id } = req.query;
    
    if (!alumno_id) {
      return res.status(400).json({ error: 'alumno_id es requerido' });
    }
    
    // Buscar logro por código
    const logros = await query('SELECT * FROM logro WHERE codigo = ?', [codigo]);
    if (logros.length === 0) {
      return res.status(404).json({ error: 'Logro no encontrado' });
    }
    
    const logro = logros[0];
    
    // Verificar si ya está desbloqueado
    const existente = await query(
      'SELECT * FROM logro_alumno WHERE logro_id = ? AND alumno_id = ?',
      [logro.id_logro, alumno_id]
    );
    
    if (existente.length > 0) {
      return res.json({ success: true, logro, ya_desbloqueado: true });
    }
    
    // Desbloquear
    await query(
      'INSERT INTO logro_alumno (logro_id, alumno_id) VALUES (?, ?)',
      [logro.id_logro, alumno_id]
    );
    
    // Crear notificación
    await query(
      `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, url)
       SELECT u.id_usuario, 'logro', '¡Logro Desbloqueado!', 
              CONCAT('Has desbloqueado el logro: ', ?), '#miPerfil'
       FROM alumno a
       JOIN usuario u ON a.usuario_id = u.id_usuario
       WHERE a.id_alumno = ?`,
      [logro.nombre, alumno_id]
    );
    
    res.json({ success: true, logro, desbloqueado: true });
  } catch (error) {
    console.error('Error al verificar logro:', error);
    res.status(500).json({ error: 'Error al verificar logro' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler global (debe ir antes del catch-all)
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Catch-all para rutas del SPA (debe ir al final, después de todas las rutas API)
// Usar app.use() sin ruta para compatibilidad con Express 5.x
app.use((req, res) => {
  // Si no es una ruta de API y no es un archivo estático, servir index.html para el SPA
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  } else {
    res.status(404).send('Recurso no encontrado');
  }
});

// ========================================
// INICIO DEL SERVIDOR
// ========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor EduVision corriendo en puerto ${PORT}`);
  console.log(`📊 Configuración de Base de Datos:`);
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   Password: ${dbConfig.password ? '***configurada***' : '❌ NO CONFIGURADA'}`);
  
  // Validar que las variables estén configuradas
  if (!process.env.MYSQLHOST || process.env.MYSQLHOST === 'localhost') {
    console.warn('⚠️  ADVERTENCIA: MYSQLHOST no está configurado o está en localhost');
    console.warn('⚠️  En Railway, asegúrate de configurar las variables de entorno:');
    console.warn('⚠️  - MYSQLHOST');
    console.warn('⚠️  - MYSQLUSER');
    console.warn('⚠️  - MYSQLPASSWORD');
    console.warn('⚠️  - MYSQLDATABASE');
    console.warn('⚠️  - MYSQLPORT');
  }
  
  if (dbConfig.host && dbConfig.host.includes('railway.internal')) {
    console.error('❌ ERROR: Se está usando mysql.railway.internal');
    console.error('❌ Esto solo funciona cuando MySQL está en el mismo proyecto');
    console.error('❌ Como tienes proyectos separados, usa el MYSQLHOST real');
    console.error('❌ Ejemplo: containers-us-east-XXX.railway.app');
  }
  
  console.log(`📡 API disponible en http://0.0.0.0:${PORT}/api`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n👋 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});
