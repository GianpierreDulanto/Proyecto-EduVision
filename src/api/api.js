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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en la petición');
    }

    return data;
  } catch (error) {
    console.error(`Error en ${endpoint}:`, error);
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
  testDatabase
};

export default API;


