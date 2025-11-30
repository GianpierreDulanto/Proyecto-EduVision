// src/teacher/teacher-controller.js
// Controlador para funcionalidades de docentes

import API from '../api/api.js';

export class TeacherController {
  constructor() {
    this.currentCourse = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.exposeGlobalMethods();
  }

  setupEventListeners() {
    // Formulario de pregunta
    const formPregunta = document.getElementById('formPregunta');
    if (formPregunta) {
      formPregunta.addEventListener('submit', (e) => this.handleAddQuestion(e));
    }
    // Botón para crear nuevo curso
    const btnCrearCurso = document.getElementById('btnCrearCurso');
    if (btnCrearCurso) {
      btnCrearCurso.addEventListener('click', () => this.showCreateCourseModal());
    }

    // Formulario de creación de curso
    const formCrearCurso = document.getElementById('formCrearCurso');
    if (formCrearCurso) {
      formCrearCurso.addEventListener('submit', (e) => this.handleCreateCourse(e));
    }

    // Formulario de contenido
    const formAgregarContenido = document.getElementById('formAgregarContenido');
    if (formAgregarContenido) {
      formAgregarContenido.addEventListener('submit', (e) => this.handleAddContent(e));
    }

    // Formulario de quiz
    const formCrearQuiz = document.getElementById('formCrearQuiz');
    if (formCrearQuiz) {
      formCrearQuiz.addEventListener('submit', (e) => this.handleCreateQuiz(e));
    }

    // Cambio de tipo de contenido
    const contenidoTipo = document.getElementById('contenidoTipo');
    if (contenidoTipo) {
      contenidoTipo.addEventListener('change', () => this.handleContenidoTipoChange());
    }
  }

  // ================== GESTIÓN DE CURSOS ==================

  async loadTeacherCourses() {
    try {
      // Obtener docente_id de la sesión
      const sessionData = localStorage.getItem('eduVisionSession');
      if (!sessionData) {
        console.error('No hay sesión activa');
        this.showError('No hay sesión activa');
        return;
      }
      
      const session = JSON.parse(sessionData);
      const user = session.user;
      
      if (!user) {
        console.error('No se encontró usuario en la sesión');
        this.showError('No se pudo identificar al docente');
        return;
      }
      
      // Usar id_docente si existe, sino id_usuario
      const docenteId = user.id_docente || user.id_usuario;
      
      if (!docenteId) {
        console.error('No se encontró docente_id en la sesión');
        this.showError('No se pudo identificar al docente');
        return;
      }
      
      const cursos = await API.getTeacherCourses(docenteId);
      this.renderTeacherCourses(cursos);
    } catch (error) {
      console.error('Error al cargar cursos del docente:', error);
      this.showError('No se pudieron cargar los cursos');
    }
  }

  renderTeacherCourses(cursos) {
    const container = document.getElementById('listaCursosDocente');
    if (!container) return;

    // Actualizar estadísticas del dashboard
    this.updateDashboardStats(cursos);

    if (!cursos || cursos.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-6xl mb-4">📚</div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No tienes cursos creados
          </h3>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Crea tu primer curso para comenzar a enseñar
          </p>
          <button onclick="mostrarModalCrearCurso()" 
                  class="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold">
            Crear Primer Curso
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = cursos.map(curso => `
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">
            ${this.escapeHtml(curso.titulo)}
          </h3>
          <div class="flex gap-2">
            <button onclick="window.app.teacher.editarCurso(${curso.id_curso})" 
                    class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Editar curso">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button onclick="window.app.teacher.eliminarCurso(${curso.id_curso})" 
                    class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Eliminar curso">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        
        <p class="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
          ${this.escapeHtml(curso.descripcion)}
        </p>

        <div class="grid grid-cols-3 gap-4 mb-4">
          <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${curso.total_alumnos || 0}
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Alumnos</div>
          </div>
          <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div class="text-2xl font-bold text-green-600 dark:text-green-400">
              ${curso.total_contenidos || 0}
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Contenidos</div>
          </div>
          <div class="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${curso.total_quizzes || 0}
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-400">Quizzes</div>
          </div>
        </div>

        <div class="flex gap-2">
          <button onclick="mostrarModalContenido(${curso.id_curso}, '${this.escapeHtml(curso.titulo).replace(/'/g, "\\'")}')" 
                  class="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors">
            📁 Contenido
          </button>
          <button onclick="mostrarModalQuiz(${curso.id_curso}, '${this.escapeHtml(curso.titulo).replace(/'/g, "\\'")}')" 
                  class="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors">
            📝 Quizzes
          </button>
          <button onclick="mostrarModalEstadisticas(${curso.id_curso}, '${this.escapeHtml(curso.titulo).replace(/'/g, "\\'")}')" 
                  class="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors">
            📊 Stats
          </button>
        </div>
      </div>
    `).join('');
  }

  updateDashboardStats(cursos) {
    const statTotalCursos = document.getElementById('statTotalCursos');
    const statTotalAlumnos = document.getElementById('statTotalAlumnos');
    const statTotalContenidos = document.getElementById('statTotalContenidos');

    if (statTotalCursos) {
      statTotalCursos.textContent = cursos.length;
    }

    if (statTotalAlumnos) {
      const totalAlumnos = cursos.reduce((sum, curso) => sum + (curso.total_alumnos || 0), 0);
      statTotalAlumnos.textContent = totalAlumnos;
    }

    if (statTotalContenidos) {
      const totalContenidos = cursos.reduce((sum, curso) => sum + (curso.total_contenidos || 0), 0);
      statTotalContenidos.textContent = totalContenidos;
    }
  }

  showCreateCourseModal() {
    const modal = document.getElementById('modalCrearCurso');
    if (modal) {
      modal.classList.remove('hidden');
      // Cargar categorías y grados
      this.loadCategoriasYGrados();
    }
  }

  async loadCategoriasYGrados() {
    try {
      const [categorias, grados] = await Promise.all([
        API.getCategories(),
        API.getGrades()
      ]);

      const selectCategoria = document.getElementById('cursoCategoria');
      const selectGrado = document.getElementById('cursoGrado');

      if (selectCategoria) {
        selectCategoria.innerHTML = categorias.map(cat => 
          `<option value="${cat.id}">${this.escapeHtml(cat.nombre)}</option>`
        ).join('');
      }

      if (selectGrado) {
        selectGrado.innerHTML = grados.map(grado => 
          `<option value="${grado.id}">${this.escapeHtml(grado.nombre)}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Error al cargar categorías y grados:', error);
    }
  }

  async handleCreateCourse(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const cursoData = {
      titulo: formData.get('titulo'),
      descripcion: formData.get('descripcion'),
      id_categoria: parseInt(formData.get('categoria_id')) || null,
      id_grado: parseInt(formData.get('grado_id')) || null
    };

    try {
      const response = await API.createCourse(cursoData);
      
      if (response.success) {
        this.showSuccess('Curso creado exitosamente');
        this.closeModal('modalCrearCurso');
        this.loadTeacherCourses();
        event.target.reset();
      }
    } catch (error) {
      console.error('Error al crear curso:', error);
      this.showError('No se pudo crear el curso');
    }
  }

  // ================== GESTIÓN DE CONTENIDO ==================

  async gestionarContenido(cursoId) {
    this.currentCourse = cursoId;
    await this.loadCourseContent(cursoId);
    
    // Mostrar sección de gestión de contenido
    const section = document.getElementById('gestionContenido');
    if (section) {
      section.classList.remove('hidden');
      // Navegar a la sección
      if (window.router) {
        window.router.navigateTo('gestionContenido');
      }
    }
  }

  async loadCourseContent(cursoId) {
    try {
      const contenidos = await API.getCourseContent(cursoId);
      this.renderCourseContent(contenidos);
    } catch (error) {
      console.error('Error al cargar contenido:', error);
    }
  }

  renderCourseContent(contenidos) {
    const container = document.getElementById('listaContenidoCurso');
    if (!container) return;

    if (!contenidos || contenidos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-600 dark:text-slate-400">
          No hay contenido en este curso aún
        </div>
      `;
      return;
    }

    container.innerHTML = contenidos.map(contenido => `
      <div class="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary text-2xl">
            ${this.getContentIcon(contenido.tipo)}
          </span>
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white">
              ${this.escapeHtml(contenido.titulo)}
            </h4>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              ${this.getContentTypeName(contenido.tipo)}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <button onclick="editarContenido(${contenido.id})" 
                  class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button onclick="eliminarContenido(${contenido.id})" 
                  class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Eliminar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  async handleAddContent(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    // Obtener usuario_id de la sesión
    const sessionData = localStorage.getItem('eduVisionSession');
    if (!sessionData) {
      this.showError('No hay sesión activa');
      return;
    }
    
    const session = JSON.parse(sessionData);
    const user = session.user;
    const usuarioId = user?.id_usuario;
    
    if (!usuarioId) {
      this.showError('No se pudo identificar al usuario');
      return;
    }
    
    const contentData = {
      curso_id: this.currentCourse,
      seccion: formData.get('seccion') || null,
      texto: formData.get('texto') || null,
      usuario_id: usuarioId,
      estado: formData.get('estado') || 'pendiente'
    };

    try {
      const response = await API.addCourseContent(contentData);
      
      if (response.success) {
        this.showSuccess('Contenido agregado exitosamente');
        this.loadCourseContent(this.currentCourse);
        event.target.reset();
      }
    } catch (error) {
      console.error('Error al agregar contenido:', error);
      this.showError('No se pudo agregar el contenido');
    }
  }

  // ================== GESTIÓN DE QUIZZES ==================

  async handleCreateQuiz(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const quizData = {
      curso_id: this.currentCourse,
      titulo: formData.get('titulo'),
      descripcion: formData.get('descripcion') || null,
      estado: formData.get('estado') || 'activo'
    };

    try {
      const response = await API.createQuiz(quizData);
      
      if (response.success) {
        this.showSuccess('Quiz creado exitosamente');
        // Navegar a la edición de preguntas
        this.editQuizQuestions(response.quiz_id);
        event.target.reset();
      }
    } catch (error) {
      console.error('Error al crear quiz:', error);
      this.showError('No se pudo crear el quiz');
    }
  }

  async editQuizQuestions(quizId) {
    // Abrir modal para agregar preguntas
    const modal = document.getElementById('modalEditarQuiz');
    if (modal) {
      modal.classList.remove('hidden');
      await this.loadQuizQuestions(quizId);
    }
  }

  async loadQuizQuestions(quizId) {
    try {
      const preguntas = await API.getQuizQuestions(quizId);
      this.renderQuizQuestions(preguntas);
    } catch (error) {
      console.error('Error al cargar preguntas:', error);
    }
  }

  renderQuizQuestions(preguntas) {
    const container = document.getElementById('listaPreguntasQuiz');
    if (!container) return;

    if (!preguntas || preguntas.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-600 dark:text-slate-400">
          No hay preguntas en este quiz aún. Agrega la primera pregunta usando el formulario de arriba.
        </div>
      `;
      return;
    }

    container.innerHTML = preguntas.map((pregunta, index) => {
      // Parsear opciones si vienen como JSON string
      let opciones = pregunta.opciones;
      if (typeof opciones === 'string') {
        try {
          opciones = JSON.parse(opciones);
        } catch (e) {
          opciones = [];
        }
      }
      
      return `
      <div class="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
        <div class="flex items-start justify-between mb-3">
          <h4 class="font-semibold text-slate-900 dark:text-white flex-1">
            ${index + 1}. ${this.escapeHtml(pregunta.texto_pregunta || pregunta.pregunta || 'Sin texto')}
          </h4>
        </div>
        <div class="space-y-2">
          ${(opciones || []).map(opcion => `
            <div class="flex items-center gap-2 text-sm">
              <span class="${opcion.es_correcta ? 'text-green-600' : 'text-slate-600 dark:text-slate-400'}">
                ${opcion.es_correcta ? '✓' : '○'}
              </span>
              <span class="${opcion.es_correcta ? 'font-semibold' : ''}">
                ${this.escapeHtml(opcion.texto_opcion || opcion.opcion || '')}
              </span>
            </div>
          `).join('')}
        </div>
        <div class="mt-3 flex justify-end">
          <button onclick="window.app.teacher.eliminarPregunta(${pregunta.id_pregunta || pregunta.id})" 
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
            <span class="material-symbols-outlined inline-block align-middle mr-1 text-sm">delete</span>
            Eliminar Pregunta
          </button>
        </div>
      </div>
    `;
    }).join('');
  }

  async eliminarPregunta(preguntaId) {
    if (!confirm('¿Estás seguro de eliminar esta pregunta? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await API.deleteQuestion(preguntaId);
      this.showSuccess('Pregunta eliminada exitosamente');
      
      // Recargar preguntas
      const quizId = document.getElementById('preguntaQuizId').value;
      if (quizId) {
        await this.cargarPreguntasQuiz(quizId);
      }
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
      this.showError('No se pudo eliminar la pregunta: ' + (error.message || 'Error desconocido'));
    }
  }

  // ================== ESTADÍSTICAS ==================

  async verEstadisticas(cursoId) {
    try {
      const stats = await API.getTeacherStats(cursoId);
      this.renderStats(stats);
      
      // Mostrar sección de estadísticas
      const section = document.getElementById('estadisticasCurso');
      if (section) {
        section.classList.remove('hidden');
        if (window.router) {
          window.router.navigateTo('estadisticasCurso');
        }
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      this.showError('No se pudieron cargar las estadísticas');
    }
  }

  renderStats(stats) {
    const container = document.getElementById('contenedorEstadisticas');
    if (!container) return;

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <span class="material-symbols-outlined text-blue-600 text-4xl">people</span>
            <div class="text-right">
              <div class="text-3xl font-bold text-slate-900 dark:text-white">${stats.total_alumnos}</div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Alumnos Activos</div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <span class="material-symbols-outlined text-green-600 text-4xl">trending_up</span>
            <div class="text-right">
              <div class="text-3xl font-bold text-slate-900 dark:text-white">${stats.promedio_general}%</div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Promedio General</div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <span class="material-symbols-outlined text-purple-600 text-4xl">task_alt</span>
            <div class="text-right">
              <div class="text-3xl font-bold text-slate-900 dark:text-white">${stats.tasa_completado}%</div>
              <div class="text-sm text-slate-600 dark:text-slate-400">Tasa de Completado</div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg mb-8">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Rendimiento por Alumno
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Alumno</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Progreso</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Promedio</th>
                <th class="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Último Acceso</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
              ${stats.alumnos.map(alumno => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td class="px-4 py-3 text-sm text-slate-900 dark:text-white">${this.escapeHtml(alumno.nombre)}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                        <div class="bg-primary h-2 rounded-full" style="width: ${alumno.progreso}%"></div>
                      </div>
                      <span class="text-sm text-slate-600 dark:text-slate-400">${alumno.progreso}%</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-sm font-semibold ${alumno.promedio >= 70 ? 'text-green-600' : 'text-red-600'}">
                    ${alumno.promedio}%
                  </td>
                  <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">${this.formatDate(alumno.ultimo_acceso)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ================== UTILIDADES ==================

  getContentIcon(tipo) {
    const icons = {
      'video': 'play_circle',
      'documento': 'description',
      'audio': 'headphones',
      'imagen': 'image',
      'enlace': 'link',
      'interactivo': 'touch_app'
    };
    return icons[tipo] || 'article';
  }

  getContentTypeName(tipo) {
    const names = {
      'video': 'Video',
      'documento': 'Documento',
      'audio': 'Audio',
      'imagen': 'Imagen',
      'enlace': 'Enlace',
      'interactivo': 'Contenido Interactivo'
    };
    return names[tipo] || 'Contenido';
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  showSuccess(message) {
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(message);
    }
    // Mostrar notificación visual
    this.showNotification(message, 'success');
  }

  showError(message) {
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar('Error: ' + message);
    }
    // Mostrar notificación visual
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-600' :
      type === 'error' ? 'bg-red-600' : 'bg-blue-600'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Exponer métodos globalmente
  exposeGlobalMethods() {
    window.mostrarModalCrearCurso = () => this.showCreateCourseModal();
    window.editarCurso = (id) => this.editCourse(id);
    window.eliminarCurso = (id) => this.deleteCourse(id);
    window.gestionarContenido = (id) => this.gestionarContenido(id);
    window.verEstadisticas = (id) => this.verEstadisticas(id);
    window.editarContenido = (id) => this.editContent(id);
    window.eliminarContenido = (id) => this.deleteContent(id);
    window.eliminarPregunta = (id) => this.deleteQuestion(id);
  }

  // Métodos stub que se implementarán según necesidad
  async editCourse(id) {
    // Usar el método existente editarCurso que ya está implementado
    await this.editarCurso(id);
  }

  async deleteCourse(id) {
    if (confirm('¿Estás seguro de eliminar este curso?')) {
      try {
        await API.deleteCourse(id);
        this.showSuccess('Curso eliminado');
        this.loadTeacherCourses();
      } catch (error) {
        this.showError('No se pudo eliminar el curso');
      }
    }
  }

  async editContent(id) {
    try {
      // Obtener el contenido actual
      const cursoId = this.currentCourse;
      if (!cursoId) {
        this.showError('No hay curso seleccionado');
        return;
      }

      // Cargar contenido del curso
      const contenidos = await API.getCourseContent(cursoId);
      const contenido = contenidos.find(c => c.id_contenido === id);
      
      if (!contenido) {
        this.showError('No se encontró el contenido');
        return;
      }

      // Llenar formulario de edición
      document.getElementById('contenidoId').value = contenido.id_contenido;
      document.getElementById('contenidoTitulo').value = contenido.titulo || '';
      const tipo = contenido.tipo || 'lectura';
      document.getElementById('contenidoTipo').value = tipo;
      document.getElementById('contenidoOrden').value = contenido.orden || 1;
      document.getElementById('contenidoCursoId').value = cursoId;

      // Manejar campos según el tipo
      if (tipo === 'lectura') {
        // Si es lectura, usar el editor de texto
        document.getElementById('contenidoUrl').value = '';
        // Inicializar editor si no está inicializado
        if (!window.contenidoTextoEditor) {
          const { default: RichTextEditor } = await import('../editor/rich-text-editor.js');
          window.contenidoTextoEditor = new RichTextEditor('contenidoTextoEditor', {
            placeholder: 'Escribe el contenido de lectura aquí...'
          });
        }
        // Cargar contenido en el editor
        if (window.contenidoTextoEditor && contenido.texto) {
          window.contenidoTextoEditor.setContent(contenido.texto);
        }
        // Mostrar editor, ocultar URL
        document.getElementById('contenidoUrlContainer').classList.add('hidden');
        document.getElementById('contenidoTextoContainer').classList.remove('hidden');
      } else {
        // Si no es lectura, usar campo URL
        document.getElementById('contenidoUrl').value = contenido.url || '';
        // Ocultar editor, mostrar URL
        document.getElementById('contenidoUrlContainer').classList.remove('hidden');
        document.getElementById('contenidoTextoContainer').classList.add('hidden');
      }

      // Cambiar título del formulario
      const formTitle = document.querySelector('#modalContenido h3');
      if (formTitle) {
        formTitle.textContent = 'Editar Contenido';
      }

      // Cambiar texto del botón
      const submitBtn = document.querySelector('#formContenido button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined inline-block align-middle mr-2">save</span>Guardar Cambios';
      }

      // Mostrar modal si no está visible
      const modal = document.getElementById('modalContenido');
      if (modal) {
        modal.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error al cargar contenido:', error);
      this.showError('No se pudo cargar el contenido');
    }
  }

  async handleContenidoTipoChange() {
    const tipo = document.getElementById('contenidoTipo').value;
    const urlContainer = document.getElementById('contenidoUrlContainer');
    const textoContainer = document.getElementById('contenidoTextoContainer');
    const urlInput = document.getElementById('contenidoUrl');
    
    if (tipo === 'lectura') {
      // Mostrar editor de texto, ocultar campo URL
      if (urlContainer) urlContainer.classList.add('hidden');
      if (textoContainer) textoContainer.classList.remove('hidden');
      if (urlInput) urlInput.removeAttribute('required');
      
      // Inicializar editor si no está inicializado
      if (!window.contenidoTextoEditor) {
        try {
          const { default: RichTextEditor } = await import('../editor/rich-text-editor.js');
          window.contenidoTextoEditor = new RichTextEditor('contenidoTextoEditor', {
            placeholder: 'Escribe el contenido de lectura aquí...'
          });
        } catch (error) {
          console.error('Error al cargar editor:', error);
        }
      }
    } else {
      // Mostrar campo URL, ocultar editor
      if (urlContainer) urlContainer.classList.remove('hidden');
      if (textoContainer) textoContainer.classList.add('hidden');
      if (urlInput) urlInput.setAttribute('required', 'required');
    }
  }

  async guardarContenido() {
    try {
      const contenidoId = document.getElementById('contenidoId').value;
      const tipo = document.getElementById('contenidoTipo').value;
      
      const contenidoData = {
        curso_id: document.getElementById('contenidoCursoId').value,
        titulo: document.getElementById('contenidoTitulo').value,
        tipo: tipo,
        orden: document.getElementById('contenidoOrden').value
      };

      // Si es tipo lectura, usar el contenido del editor; si no, usar la URL
      if (tipo === 'lectura') {
        if (window.contenidoTextoEditor) {
          const texto = window.contenidoTextoEditor.getContent();
          contenidoData.texto = texto;
          contenidoData.url = null;
        } else {
          throw new Error('El editor de texto no está inicializado');
        }
      } else {
        const url = document.getElementById('contenidoUrl').value;
        if (!url || url.trim() === '') {
          this.showError('Por favor, ingresa una URL o ruta');
          return;
        }
        contenidoData.url = url;
        contenidoData.texto = null;
      }

      if (contenidoId) {
        // Actualizar contenido existente
        await API.updateContenido(contenidoId, contenidoData);
        this.showSuccess('Contenido actualizado exitosamente');
      } else {
        // Crear nuevo contenido
        await API.createContenido(contenidoData);
        this.showSuccess('Contenido agregado exitosamente');
      }
      
      // Limpiar formulario
      document.getElementById('formContenido').reset();
      document.getElementById('contenidoId').value = '';
      document.getElementById('contenidoOrden').value = '1';
      
      // Limpiar editor si existe
      if (window.contenidoTextoEditor) {
        window.contenidoTextoEditor.setContent('');
      }
      
      // Restaurar visibilidad de campos
      const urlContainer = document.getElementById('contenidoUrlContainer');
      const textoContainer = document.getElementById('contenidoTextoContainer');
      if (urlContainer) urlContainer.classList.remove('hidden');
      if (textoContainer) textoContainer.classList.add('hidden');
      
      // Restaurar título y botón
      const formTitle = document.querySelector('#modalContenido h3');
      if (formTitle) {
        formTitle.textContent = 'Agregar Nuevo Contenido';
      }
      const submitBtn = document.querySelector('#formContenido button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined inline-block align-middle mr-2">add</span>Agregar Contenido';
      }
      
      // Recargar lista
      this.cargarContenidoCurso(contenidoData.curso_id);
      
      // Cerrar modal
      window.cerrarModalContenido();
    } catch (error) {
      console.error('Error al guardar contenido:', error);
      this.showError('No se pudo guardar el contenido: ' + (error.message || 'Error desconocido'));
    }
  }

  async deleteContent(id) {
    if (confirm('¿Estás seguro de eliminar este contenido?')) {
      try {
        await API.deleteContent(id);
        this.showSuccess('Contenido eliminado');
        this.loadCourseContent(this.currentCourse);
      } catch (error) {
        this.showError('No se pudo eliminar el contenido');
      }
    }
  }

  async deleteQuestion(id) {
    if (confirm('¿Estás seguro de eliminar esta pregunta?')) {
      try {
        await API.deleteQuestion(id);
        this.showSuccess('Pregunta eliminada');
        // Recargar preguntas del quiz actual
      } catch (error) {
        this.showError('No se pudo eliminar la pregunta');
      }
    }
  }

  // ================== MÉTODOS PARA MODALES ==================

  async guardarCurso() {
    try {
      const cursoId = document.getElementById('cursoId').value;
      
      // Obtener descripción del editor WYSIWYG si existe
      let descripcion = '';
      if (window.cursoDescripcionEditor && window.cursoDescripcionEditor.getHTML) {
        descripcion = window.cursoDescripcionEditor.getHTML();
      } else {
        descripcion = document.getElementById('cursoDescripcion').value;
      }
      
      const cursoData = {
        titulo: document.getElementById('cursoTitulo').value,
        descripcion: descripcion,
        id_categoria: document.getElementById('cursoCategoria').value || null,
        id_grado: document.getElementById('cursoGrado').value || null
      };

      // Obtener el docente_id de la sesión
      const sessionData = localStorage.getItem('eduVisionSession');
      if (!sessionData) {
        this.showError('No hay sesión activa');
        return;
      }
      
      const session = JSON.parse(sessionData);
      const user = session.user;
      cursoData.docente_id = user?.id_docente || user?.id_usuario;
      
      if (!cursoData.docente_id) {
        this.showError('No se pudo identificar al docente');
        return;
      }

      if (cursoId) {
        // Actualizar curso existente
        await API.updateCurso(cursoId, cursoData);
        this.showSuccess('Curso actualizado exitosamente');
      } else {
        // Crear nuevo curso
        await API.createCurso(cursoData);
        this.showSuccess('Curso creado exitosamente');
      }

      window.cerrarModalCurso();
      this.loadTeacherCourses();
    } catch (error) {
      console.error('Error al guardar curso:', error);
      this.showError('No se pudo guardar el curso');
    }
  }

  async editarCurso(cursoId) {
    try {
      // Obtener docente_id de la sesión
      const sessionData = localStorage.getItem('eduVisionSession');
      if (!sessionData) {
        this.showError('No hay sesión activa');
        return;
      }
      
      const session = JSON.parse(sessionData);
      const user = session.user;
      const docenteId = user?.id_docente || user?.id_usuario;
      
      if (!docenteId) {
        this.showError('No se pudo identificar al docente');
        return;
      }
      
      // Cargar datos del curso
      const cursos = await API.getTeacherCourses(docenteId);
      const curso = cursos.find(c => c.id_curso === cursoId);
      
      if (!curso) {
        this.showError('No se encontró el curso');
        return;
      }

      // Llenar formulario
      document.getElementById('modalCursoTitulo').textContent = 'Editar Curso';
      document.getElementById('cursoId').value = curso.id_curso;
      document.getElementById('cursoTitulo').value = curso.titulo || '';
      
      // Inicializar editor WYSIWYG si no está inicializado
      if (!window.cursoDescripcionEditor) {
        const { default: RichTextEditor } = await import('../editor/rich-text-editor.js');
        window.cursoDescripcionEditor = new RichTextEditor('cursoDescripcionEditor', {
          placeholder: 'Describe el contenido y objetivos del curso'
        });
        window.cursoDescripcionEditor.init();
      }
      
      // Establecer contenido en el editor
      if (window.cursoDescripcionEditor && curso.descripcion) {
        window.cursoDescripcionEditor.setHTML(curso.descripcion);
      } else {
        document.getElementById('cursoDescripcion').value = curso.descripcion || '';
      }
      
      // Usar id_categoria e id_grado según la estructura de la BD
      document.getElementById('cursoCategoria').value = curso.id_categoria || curso.categoria_id || '';
      document.getElementById('cursoGrado').value = curso.id_grado || curso.grado_id || '';

      // Mostrar modal
      document.getElementById('modalCurso').classList.remove('hidden');
    } catch (error) {
      console.error('Error al cargar curso:', error);
      this.showError('No se pudo cargar el curso');
    }
  }

  async eliminarCurso(cursoId) {
    if (confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) {
      try {
        await API.deleteCurso(cursoId);
        this.showSuccess('Curso eliminado exitosamente');
        this.loadTeacherCourses();
      } catch (error) {
        console.error('Error al eliminar curso:', error);
        this.showError('No se pudo eliminar el curso');
      }
    }
  }

  async cargarContenidoCurso(cursoId) {
    try {
      const contenidos = await API.getCourseContent(cursoId);
      const container = document.getElementById('listaContenidoCurso');
      
      if (!container) return;

      if (!contenidos || contenidos.length === 0) {
        container.innerHTML = `
          <p class="text-center text-slate-600 dark:text-slate-400 py-8">
            No hay contenido agregado aún
          </p>
        `;
        return;
      }

      container.innerHTML = contenidos.map(contenido => `
        <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${this.getTipoIcon(contenido.tipo)}</span>
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">${this.escapeHtml(contenido.titulo)}</p>
              <p class="text-sm text-slate-600 dark:text-slate-400">Orden: ${contenido.orden}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="window.app.teacher.editContent(${contenido.id_contenido})" 
                    class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    aria-label="Editar contenido">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button onclick="window.app.teacher.eliminarContenido(${contenido.id_contenido})" 
                    class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    aria-label="Eliminar contenido">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error al cargar contenido:', error);
      this.showError('No se pudo cargar el contenido');
    }
  }

  async agregarContenido() {
    // Usar el método guardarContenido que maneja tanto creación como edición
    await this.guardarContenido();
  }

  async eliminarContenido(contenidoId) {
    if (confirm('¿Estás seguro de eliminar este contenido?')) {
      try {
        await API.deleteContenido(contenidoId);
        this.showSuccess('Contenido eliminado exitosamente');
        
        // Recargar lista
        const cursoId = document.getElementById('contenidoCursoId').value;
        this.cargarContenidoCurso(cursoId);
      } catch (error) {
        console.error('Error al eliminar contenido:', error);
        this.showError('No se pudo eliminar el contenido');
      }
    }
  }

  async cargarQuizzesCurso(cursoId) {
    try {
      const quizzes = await API.getQuizzesCurso(cursoId);
      const container = document.getElementById('listaQuizzesCurso');
      
      if (!container) return;

      if (!quizzes || quizzes.length === 0) {
        container.innerHTML = `
          <p class="text-center text-slate-600 dark:text-slate-400 py-8">
            No hay cuestionarios creados aún
          </p>
        `;
        return;
      }

      container.innerHTML = quizzes.map(quiz => `
        <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div class="flex-1">
            <p class="font-semibold text-slate-900 dark:text-white">${this.escapeHtml(quiz.titulo)}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400">${this.escapeHtml(quiz.descripcion || 'Sin descripción')}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="window.app.teacher.verPreguntasQuiz(${quiz.id_cuestionario})" 
                    class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              Ver Preguntas
            </button>
            <button onclick="window.app.teacher.eliminarQuiz(${quiz.id_cuestionario})" 
                    class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error al cargar quizzes:', error);
      this.showError('No se pudo cargar los cuestionarios');
    }
  }

  async crearQuiz() {
    try {
      const quizData = {
        curso_id: document.getElementById('quizCursoId').value,
        titulo: document.getElementById('quizTitulo').value,
        descripcion: document.getElementById('quizDescripcion').value
      };

      await API.createCuestionario(quizData);
      this.showSuccess('Cuestionario creado exitosamente');
      
      // Limpiar formulario
      document.getElementById('formQuiz').reset();
      
      // Recargar lista
      this.cargarQuizzesCurso(quizData.curso_id);
    } catch (error) {
      console.error('Error al crear quiz:', error);
      this.showError('No se pudo crear el cuestionario');
    }
  }

  async verPreguntasQuiz(quizId) {
    try {
      // Obtener cursoId del modal o del contexto actual
      const cursoId = document.getElementById('quizCursoId')?.value || this.currentCourse;
      
      if (!cursoId) {
        this.showError('No se pudo identificar el curso');
        return;
      }
      
      // Obtener información del quiz
      const quizzes = await API.getQuizzesCurso(cursoId);
      const quiz = quizzes.find(q => q.id_cuestionario === quizId);
      
      if (!quiz) {
        this.showError('Cuestionario no encontrado');
        return;
      }
      
      // Mostrar modal
      if (window.mostrarModalPreguntasQuiz) {
        window.mostrarModalPreguntasQuiz(quizId, quiz.titulo || 'Sin título');
      }
    } catch (error) {
      console.error('Error al abrir preguntas del quiz:', error);
      this.showError('No se pudieron cargar las preguntas: ' + (error.message || 'Error desconocido'));
    }
  }

  async eliminarQuiz(quizId) {
    if (!confirm('¿Estás seguro de eliminar este cuestionario? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await API.deleteQuiz(quizId);
      this.showSuccess('Cuestionario eliminado exitosamente');
      
      // Recargar la lista de quizzes - obtener cursoId del modal
      const cursoId = document.getElementById('quizCursoId')?.value || this.currentCourse;
      if (cursoId) {
        await this.cargarQuizzesCurso(cursoId);
      }
    } catch (error) {
      console.error('Error al eliminar quiz:', error);
      this.showError('No se pudo eliminar el cuestionario: ' + (error.message || 'Error desconocido'));
    }
  }

  async cargarPreguntasQuiz(quizId) {
    try {
      const preguntas = await API.getQuizQuestions(quizId);
      this.renderQuizQuestions(preguntas);
    } catch (error) {
      console.error('Error al cargar preguntas:', error);
      const container = document.getElementById('listaPreguntasQuiz');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8 text-red-600 dark:text-red-400">
            Error al cargar las preguntas
          </div>
        `;
      }
    }
  }

  async handleAddQuestion(event) {
    event.preventDefault();
    
    const quizId = document.getElementById('preguntaQuizId').value;
    const textoPregunta = document.getElementById('preguntaTexto').value;
    
    if (!textoPregunta.trim()) {
      this.showError('El texto de la pregunta es requerido');
      return;
    }
    
    // Obtener opciones
    const opcionesInputs = document.querySelectorAll('#opcionesContainer input[type="text"]');
    const opciones = [];
    
    opcionesInputs.forEach((input, index) => {
      const texto = input.value.trim();
      if (texto) {
        const checkbox = document.querySelector(`input.opcion-correcta[data-opcion-index="${input.dataset.opcionIndex}"]`);
        opciones.push({
          texto_opcion: texto,
          es_correcta: checkbox ? checkbox.checked : false
        });
      }
    });
    
    if (opciones.length < 2) {
      this.showError('Debe agregar al menos 2 opciones de respuesta');
      return;
    }
    
    // Verificar que al menos una opción sea correcta
    const tieneCorrecta = opciones.some(op => op.es_correcta);
    if (!tieneCorrecta) {
      this.showError('Debe marcar al menos una opción como correcta');
      return;
    }
    
    try {
      const questionData = {
        cuestionario_id: parseInt(quizId),
        texto_pregunta: textoPregunta,
        opciones: opciones
      };
      
      await API.addQuestion(questionData);
      this.showSuccess('Pregunta agregada exitosamente');
      
      // Limpiar formulario
      document.getElementById('formPregunta').reset();
      document.getElementById('opcionesContainer').innerHTML = '';
      
      // Recargar preguntas
      await this.cargarPreguntasQuiz(quizId);
    } catch (error) {
      console.error('Error al agregar pregunta:', error);
      this.showError('No se pudo agregar la pregunta: ' + (error.message || 'Error desconocido'));
    }
  }

  async cargarEstadisticasCurso(cursoId) {
    try {
      const stats = await API.getCourseStats(cursoId);
      
      // Actualizar métricas rápidas
      document.getElementById('statAlumnosInscritos').textContent = stats.total_alumnos || 0;
      document.getElementById('statPromedioGeneral').textContent = (stats.promedio_general || 0).toFixed(1);
      document.getElementById('statCompletado').textContent = `${stats.porcentaje_completado || 0}%`;
      document.getElementById('statEnProgreso').textContent = stats.en_progreso || 0;

      // Cargar tabla de alumnos
      const tbody = document.getElementById('tablaAlumnosEstadisticas');
      
      if (!tbody) return;

      if (!stats.alumnos || stats.alumnos.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="text-center py-8 text-slate-600 dark:text-slate-400">
              No hay alumnos inscritos
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = stats.alumnos.map(alumno => `
        <tr class="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
          <td class="py-3 px-4">
            <p class="font-medium text-slate-900 dark:text-white">${this.escapeHtml(alumno.nombre)}</p>
            ${alumno.email ? `<p class="text-sm text-slate-600 dark:text-slate-400">${this.escapeHtml(alumno.email)}</p>` : ''}
          </td>
          <td class="py-3 px-4 text-center">
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div class="bg-primary h-2 rounded-full" style="width: ${alumno.progreso || 0}%"></div>
            </div>
            <p class="text-sm mt-1 text-slate-600 dark:text-slate-400">${alumno.progreso || 0}%</p>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              alumno.calificacion >= 7 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              alumno.calificacion >= 5 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }">
              ${(alumno.calificacion || 0).toFixed(1)}
            </span>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              alumno.estado === 'completado' || alumno.estado === 'Completado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              alumno.estado === 'en_progreso' || alumno.estado === 'En Progreso' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
            }">
              ${(alumno.estado === 'completado' || alumno.estado === 'Completado') ? '✓ Completado' :
                (alumno.estado === 'en_progreso' || alumno.estado === 'En Progreso') ? '⏳ En Progreso' : '⏸ Sin Iniciar'}
            </span>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      this.showError('No se pudo cargar las estadísticas');
    }
  }

  getTipoIcon(tipo) {
    const icons = {
      'video': '🎥',
      'documento': '📄',
      'audio': '🎵',
      'lectura': '📖',
      'imagen': '🖼️',
      'enlace': '🔗'
    };
    return icons[tipo] || '📎';
  }

  showInfo(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2';
    notification.innerHTML = `
      <span class="material-symbols-outlined">info</span>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

export default TeacherController;

