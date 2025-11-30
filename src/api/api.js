// src/api/api.js
// Cliente API para comunicación con el backend

const API_BASE_URL = window.location.origin + '/api';

/**
 * Realiza una petición HTTP al servidor
 * @param {string} endpoint - Endpoint de la API
 * @param {object} options - Opciones de fetch
 * @returns {Promise} Respuesta del servidor
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Intentar parsear JSON, pero si falla, usar texto
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      throw new Error(text || `Error ${response.status}: ${response.statusText}`);
    }

    if (!response.ok) {
      const errorMessage = data.error || data.message || `Error ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = data.details || data;
      throw error;
    }

    return data;
  } catch (error) {
    // Si ya tiene status, no hacer nada más
    if (error.status) {
      console.error(`❌ Error ${error.status} en ${endpoint}:`, error.message);
      if (error.details) {
        console.error('Detalles:', error.details);
      }
    } else {
      console.error(`❌ Error de red en ${endpoint}:`, error.message);
    }
    throw error;
  }
}

// ========================================
// AUTENTICACIÓN
// ========================================

export async function login(correo, contraseña) {
  return apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contraseña })
  });
}

export async function register(userData) {
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

// ========================================
// CURSOS
// ========================================

export async function getCursos(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.categoria) params.append('categoria', filters.categoria);
  if (filters.grado) params.append('grado', filters.grado);
  if (filters.estado) params.append('estado', filters.estado);
  
  const queryString = params.toString();
  return apiRequest(`/cursos${queryString ? '?' + queryString : ''}`);
}

export async function getCurso(id) {
  return apiRequest(`/cursos/${id}`);
}

export async function createCurso(cursoData) {
  return apiRequest('/cursos', {
    method: 'POST',
    body: JSON.stringify(cursoData)
  });
}

// ========================================
// CATEGORÍAS Y GRADOS
// ========================================

export async function getCategorias() {
  return apiRequest('/categorias');
}

export async function getGrados() {
  return apiRequest('/grados');
}

// ========================================
// CONTENIDO
// ========================================

export async function getCursoContenido(cursoId) {
  return apiRequest(`/cursos/${cursoId}/contenido`);
}

export async function createContenido(contenidoData) {
  return apiRequest('/contenido', {
    method: 'POST',
    body: JSON.stringify(contenidoData)
  });
}

// ========================================
// RECURSOS
// ========================================

export async function getCursoRecursos(cursoId) {
  return apiRequest(`/cursos/${cursoId}/recursos`);
}

export async function createRecurso(recursoData) {
  return apiRequest('/recursos', {
    method: 'POST',
    body: JSON.stringify(recursoData)
  });
}

// ========================================
// INSCRIPCIÓN
// ========================================

export async function inscribirAlumno(alumnoId, cursoId) {
  return apiRequest('/inscribir', {
    method: 'POST',
    body: JSON.stringify({ alumno_id: alumnoId, curso_id: cursoId })
  });
}

export async function getAlumnoCursos(alumnoId) {
  return apiRequest(`/alumnos/${alumnoId}/cursos`);
}

// ========================================
// CUESTIONARIOS
// ========================================

export async function getCursoCuestionario(cursoId) {
  return apiRequest(`/cursos/${cursoId}/cuestionario`);
}

export async function getCursoCuestionarios(cursoId) {
  return apiRequest(`/cursos/${cursoId}/cuestionarios`);
}

// ========================================
// ENCUESTAS
// ========================================

export async function enviarEncuesta(encuestaData) {
  return apiRequest('/encuestas', {
    method: 'POST',
    body: JSON.stringify(encuestaData)
  });
}

// ========================================
// DOCENTES
// ========================================

export async function getDocenteCursos(docenteId) {
  return apiRequest(`/docentes/${docenteId}/cursos`);
}

export async function getDocenteEstadisticas(docenteId) {
  return apiRequest(`/docentes/${docenteId}/estadisticas`);
}

// ========================================
// PRUEBAS
// ========================================

export async function testDatabase() {
  return apiRequest('/test-db');
}

// Exportar objeto API completo
export const API = {
  // Auth
  login,
  register,
  
  // Cursos
  getCursos,
  getCurso,
  createCurso,
  
  // Categorías y Grados
  getCategorias,
  getGrados,
  
  // Contenido
  getCursoContenido,
  createContenido,
  
  // Recursos
  getCursoRecursos,
  createRecurso,
  
  // Inscripción
  inscribirAlumno,
  getAlumnoCursos,
  
  // Cuestionarios
  getCursoCuestionario,
  getCursoCuestionarios,
  
  // Encuestas
  enviarEncuesta,
  
  // Docentes
  getDocenteCursos,
  getDocenteEstadisticas,
  
  // Gestión de cursos (docentes)
  getTeacherCourses: getDocenteCursos,
  createCourse: createCurso,
  createCurso: async (cursoData) => {
    return apiRequest('/cursos', {
      method: 'POST',
      body: JSON.stringify(cursoData)
    });
  },
  updateCurso: async (cursoId, data) => {
    return apiRequest('/cursos/' + cursoId, { 
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteCurso: async (cursoId) => {
    return apiRequest('/cursos/' + cursoId, { method: 'DELETE' });
  },
  deleteCourse: async (cursoId) => {
    return apiRequest('/cursos/' + cursoId, { method: 'DELETE' });
  },
  updateCourse: async (cursoId, data) => {
    return apiRequest('/cursos/' + cursoId, { 
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // Gestión de contenido
  getCourseContent: getCursoContenido,
  addCourseContent: createContenido,
  getCursoSecciones: async (cursoId) => {
    return apiRequest(`/cursos/${cursoId}/secciones`);
  },
  createContenido: async (contenidoData) => {
    return apiRequest('/contenido', {
      method: 'POST',
      body: JSON.stringify(contenidoData)
    });
  },
  deleteContenido: async (contentId) => {
    return apiRequest('/contenido/' + contentId, { method: 'DELETE' });
  },
  deleteContent: async (contentId) => {
    return apiRequest('/contenido/' + contentId, { method: 'DELETE' });
  },
  
  // Gestión de quizzes
  createQuiz: async (quizData) => {
    return apiRequest('/cuestionarios', {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },
  createCuestionario: async (quizData) => {
    return apiRequest('/cuestionarios', {
      method: 'POST',
      body: JSON.stringify(quizData)
    });
  },
  getQuizzesCurso: async (cursoId) => {
    return apiRequest('/cursos/' + cursoId + '/cuestionarios');
  },
  getQuizQuestions: async (quizId) => {
    return apiRequest('/cuestionarios/' + quizId + '/preguntas');
  },
  addQuestion: async (questionData) => {
    return apiRequest('/preguntas', {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  },
  deleteQuestion: async (questionId) => {
    return apiRequest('/preguntas/' + questionId, { method: 'DELETE' });
  },
  deleteQuiz: async (quizId) => {
    return apiRequest('/cuestionarios/' + quizId, { method: 'DELETE' });
  },
  
  // Estadísticas
  getTeacherStats: getDocenteEstadisticas,
  getCourseStats: async (cursoId) => {
    return apiRequest('/cursos/' + cursoId + '/estadisticas');
  },
  
  // Categorías y Grados (aliases)
  getCategories: getCategorias,
  getGrades: getGrados,
  
  // ========================================
  // GESTIÓN DE USUARIOS (ADMIN)
  // ========================================
  getUsuarios: async () => {
    return apiRequest('/usuarios');
  },
  updateUsuario: async (usuarioId, data) => {
    return apiRequest('/usuarios/' + usuarioId, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  cambiarEstadoUsuario: async (usuarioId, estado) => {
    return apiRequest('/usuarios/' + usuarioId + '/estado', {
      method: 'PUT',
      body: JSON.stringify({ estado })
    });
  },
  
  // ========================================
  // GESTIÓN DE DOCENTES
  // ========================================
  getDocente: async (docenteId) => {
    return apiRequest('/docentes/' + docenteId);
  },
  updateDocente: async (docenteId, data) => {
    return apiRequest('/docentes/' + docenteId, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // ========================================
  // GESTIÓN DE CATEGORÍAS (CRUD)
  // ========================================
  createCategoria: async (data) => {
    return apiRequest('/categorias', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateCategoria: async (categoriaId, data) => {
    return apiRequest('/categorias/' + categoriaId, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteCategoria: async (categoriaId) => {
    return apiRequest('/categorias/' + categoriaId, { method: 'DELETE' });
  },
  
  // ========================================
  // GESTIÓN DE GRADOS (CRUD)
  // ========================================
  createGrado: async (data) => {
    return apiRequest('/grados', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateGrado: async (gradoId, data) => {
    return apiRequest('/grados/' + gradoId, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteGrado: async (gradoId) => {
    return apiRequest('/grados/' + gradoId, { method: 'DELETE' });
  },
  
  // ========================================
  // GESTIÓN DE RECURSOS (CRUD)
  // ========================================
  getRecursos: async () => {
    return apiRequest('/recursos');
  },
  getRecurso: async (recursoId) => {
    return apiRequest('/recursos/' + recursoId);
  },
  updateRecurso: async (recursoId, data) => {
    return apiRequest('/recursos/' + recursoId, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteRecurso: async (recursoId) => {
    return apiRequest('/recursos/' + recursoId, { method: 'DELETE' });
  },
  
  // ========================================
  // ENCUESTAS DE SATISFACCIÓN
  // ========================================
  getEncuestas: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.curso_id) params.append('curso_id', filters.curso_id);
    if (filters.alumno_id) params.append('alumno_id', filters.alumno_id);
    const queryString = params.toString();
    return apiRequest('/encuestas' + (queryString ? '?' + queryString : ''));
  },
  getEncuestasCurso: async (cursoId) => {
    return apiRequest('/cursos/' + cursoId + '/encuestas');
  },
  
  // ========================================
  // SISTEMA DE APROBACIÓN (ADMIN)
  // ========================================
  crearAprobacion: async (data) => {
    return apiRequest('/aprobaciones', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getAprobaciones: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.objeto_tipo) params.append('objeto_tipo', filters.objeto_tipo);
    if (filters.estado) params.append('estado', filters.estado);
    const queryString = params.toString();
    return apiRequest('/aprobaciones' + (queryString ? '?' + queryString : ''));
  },
  getPendientesAprobacion: async (tipo = null) => {
    const params = tipo ? '?tipo=' + tipo : '';
    return apiRequest('/aprobaciones/pendientes' + params);
  },
  updateAprobacion: async (aprobacionId, data) => {
    return apiRequest('/aprobaciones/' + aprobacionId, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // Test
  testDatabase,
  
  // ========================================
  // GESTIÓN DE PERFIL DE USUARIO
  // ========================================
  getUserProfile: async (usuarioId) => {
    return apiRequest(`/usuarios/${usuarioId}/perfil`);
  },
  updateUserProfile: async (usuarioId, data) => {
    return apiRequest(`/usuarios/${usuarioId}/perfil`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  uploadAvatar: async (usuarioId, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return fetch(`${API_BASE_URL}/usuarios/${usuarioId}/avatar`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  },
  
  // ========================================
  // CONFIGURACIÓN DE ACCESIBILIDAD
  // ========================================
  getAccessibilityConfig: async (usuarioId) => {
    return apiRequest(`/usuarios/${usuarioId}/accesibilidad`);
  },
  updateAccessibilityConfig: async (usuarioId, config) => {
    return apiRequest(`/usuarios/${usuarioId}/accesibilidad`, {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  },
  
  // ========================================
  // NOTIFICACIONES
  // ========================================
  getNotifications: async (usuarioId, leida = null) => {
    const params = leida !== null ? `?leida=${leida}` : '';
    return apiRequest(`/usuarios/${usuarioId}/notificaciones${params}`);
  },
  markNotificationRead: async (notificationId) => {
    return apiRequest(`/notificaciones/${notificationId}/leer`, {
      method: 'PUT'
    });
  },
  markAllNotificationsRead: async (usuarioId) => {
    return apiRequest(`/usuarios/${usuarioId}/notificaciones/leer-todas`, {
      method: 'PUT'
    });
  },
  
  // ========================================
  // SECCIONES Y LECCIONES
  // ========================================
  getCourseSections: async (cursoId) => {
    return apiRequest(`/cursos/${cursoId}/secciones`);
  },
  createSection: async (cursoId, data) => {
    return apiRequest(`/cursos/${cursoId}/secciones`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  createLesson: async (seccionId, data) => {
    return apiRequest(`/secciones/${seccionId}/lecciones`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateLesson: async (leccionId, data) => {
    return apiRequest(`/lecciones/${leccionId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  deleteLesson: async (leccionId) => {
    return apiRequest(`/lecciones/${leccionId}`, {
      method: 'DELETE'
    });
  },
  
  // ========================================
  // PROGRESO
  // ========================================
  getStudentProgress: async (alumnoId) => {
    return apiRequest(`/alumnos/${alumnoId}/progreso`);
  },
  getCourseProgress: async (alumnoId, cursoId) => {
    return apiRequest(`/alumnos/${alumnoId}/cursos/${cursoId}/progreso`);
  },
  updateLessonProgress: async (alumnoId, data) => {
    return apiRequest(`/alumnos/${alumnoId}/progreso/leccion`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getLeccionProgreso: async (alumnoId, leccionId) => {
    return apiRequest(`/alumnos/${alumnoId}/lecciones/${leccionId}/progreso`);
  },
  
  // ========================================
  // LISTA DE DESEOS
  // ========================================
  getWishlist: async (alumnoId) => {
    return apiRequest(`/alumnos/${alumnoId}/lista-deseos`);
  },
  addToWishlist: async (alumnoId, cursoId) => {
    return apiRequest(`/alumnos/${alumnoId}/lista-deseos`, {
      method: 'POST',
      body: JSON.stringify({ curso_id: cursoId })
    });
  },
  removeFromWishlist: async (alumnoId, cursoId) => {
    return apiRequest(`/alumnos/${alumnoId}/lista-deseos/${cursoId}`, {
      method: 'DELETE'
    });
  },
  
  // ========================================
  // REVIEWS Y RATINGS
  // ========================================
  getCourseReviews: async (cursoId, ordenar = 'recientes') => {
    return apiRequest(`/cursos/${cursoId}/resenas?ordenar=${ordenar}`);
  },
  createReview: async (cursoId, data) => {
    return apiRequest(`/cursos/${cursoId}/resenas`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateReview: async (resenaId, data) => {
    return apiRequest(`/resenas/${resenaId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  voteReview: async (resenaId, usuarioId, tipo) => {
    return apiRequest(`/resenas/${resenaId}/votar`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId, tipo })
    });
  },
  respondToReview: async (resenaId, docenteId, respuesta) => {
    return apiRequest(`/resenas/${resenaId}/responder`, {
      method: 'POST',
      body: JSON.stringify({ docente_id: docenteId, respuesta })
    });
  },
  
  // ========================================
  // CERTIFICADOS
  // ========================================
  getStudentCertificates: async (alumnoId) => {
    return apiRequest(`/alumnos/${alumnoId}/certificados`);
  },
  verifyCertificate: async (codigo) => {
    return apiRequest(`/certificados/verificar/${codigo}`);
  },
  
  // ========================================
  // FOROS
  // ========================================
  getForumTopics: async (cursoId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.categoria) params.append('categoria', filters.categoria);
    if (filters.buscar) params.append('buscar', filters.buscar);
    const query = params.toString();
    return apiRequest(`/cursos/${cursoId}/foros${query ? '?' + query : ''}`);
  },
  createForumTopic: async (cursoId, data) => {
    return apiRequest(`/cursos/${cursoId}/foros`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getForumTopic: async (temaId) => {
    return apiRequest(`/foros/${temaId}`);
  },
  replyToTopic: async (temaId, data) => {
    return apiRequest(`/foros/${temaId}/responder`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  voteForumResponse: async (respuestaId, usuarioId, tipo) => {
    return apiRequest(`/foros/respuestas/${respuestaId}/votar`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id: usuarioId, tipo })
    });
  },
  markResponseCorrect: async (respuestaId) => {
    return apiRequest(`/foros/respuestas/${respuestaId}/marcar-correcta`, {
      method: 'PUT'
    });
  },
  
  // ========================================
  // MENSAJERÍA
  // ========================================
  getMessages: async (usuarioId, tipo = 'recibidos') => {
    return apiRequest(`/usuarios/${usuarioId}/mensajes?tipo=${tipo}`);
  },
  sendMessage: async (data) => {
    return apiRequest('/mensajes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  markMessageRead: async (mensajeId) => {
    return apiRequest(`/mensajes/${mensajeId}/leer`, {
      method: 'PUT'
    });
  },
  
  // ========================================
  // INTENTOS DE CUESTIONARIOS
  // ========================================
  getQuizAttempts: async (alumnoId, quizId) => {
    return apiRequest(`/alumnos/${alumnoId}/cuestionarios/${quizId}/intentos`);
  },
  submitQuizAttempt: async (alumnoId, quizId, data) => {
    return apiRequest(`/alumnos/${alumnoId}/cuestionarios/${quizId}/intentos`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // ========================================
  // TAREAS
  // ========================================
  getCourseTasks: async (cursoId) => {
    return apiRequest(`/cursos/${cursoId}/tareas`);
  },
  createTask: async (cursoId, data) => {
    return apiRequest(`/cursos/${cursoId}/tareas`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  submitTask: async (tareaId, alumnoId, data) => {
    return apiRequest(`/tareas/${tareaId}/entregar`, {
      method: 'POST',
      body: JSON.stringify({ alumno_id: alumnoId, ...data })
    });
  },
  gradeTask: async (entregaId, data) => {
    return apiRequest(`/entregas/${entregaId}/calificar`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // ========================================
  // ESTADÍSTICAS AVANZADAS
  // ========================================
  getCourseStats: async () => {
    return apiRequest('/estadisticas/cursos');
  },
  getTeacherRanking: async () => {
    return apiRequest('/estadisticas/docentes');
  }
};

export default API;


