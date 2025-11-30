// src/courses/courses-controller.js
// Controlador para gestionar cursos dinámicamente

import { getCursos, getCurso, getCursoRecursos, getCursoContenido, getCategorias, getGrados, inscribirAlumno, getAlumnoCursos } from '../api/api.js';
import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

export class CoursesController {
  constructor() {
    this.currentCurso = null;
    this.categorias = [];
    this.grados = [];
    this.cursosInscritos = [];
    this.alumnoId = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Verificar si hay un examen activo pendiente (ANTES de cargar otras cosas)
      await this.verificarExamenActivo();
      
      // Cargar categorías y grados (con manejo de errores)
      try {
        this.categorias = await getCategorias();
        this.grados = await getGrados();
        console.log('✓ Categorías y grados cargados');
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar categorías y grados. La aplicación continuará con datos limitados.');
        this.categorias = [];
        this.grados = [];
      }
      
      // Cargar ID de alumno si hay sesión
      this.loadAlumnoId();
      
      // Cargar cursos inscritos si hay alumno
      if (this.alumnoId) {
        try {
          await this.loadCursosInscritos();
        } catch (error) {
          console.warn('⚠️ No se pudieron cargar los cursos inscritos:', error.message);
          this.cursosInscritos = [];
        }
      }
      
      // Verificar si hay sesión activa
      this.checkSessionAndRender();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('✓ Controlador de cursos inicializado');
    } catch (error) {
      console.error('❌ Error crítico al inicializar controlador de cursos:', error);
      // Aún así, intentar renderizar con datos vacíos
      this.categorias = this.categorias || [];
      this.grados = this.grados || [];
      this.checkSessionAndRender();
    }
  }

  loadAlumnoId() {
    try {
      const sessionData = localStorage.getItem('eduVisionSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.user && session.user.rol === 'alumno') {
          this.alumnoId = session.user.id_alumno;
        }
      }
    } catch (error) {
      console.error('Error al cargar ID de alumno:', error);
      this.alumnoId = null;
    }
  }

  async checkSessionAndRender() {
    // Verificar si hay sesión
    const sessionData = localStorage.getItem('eduVisionSession');
    const isLoggedIn = sessionData && JSON.parse(sessionData).loggedIn;

    const vistaNoLogueado = document.getElementById('vistaCursosNoLogueado');
    const vistaLogueado = document.getElementById('vistaCursosLogueado');

    if (isLoggedIn) {
      // Usuario logueado - mostrar solo cursos inscritos
      if (vistaNoLogueado) vistaNoLogueado.classList.add('hidden');
      if (vistaLogueado) {
        vistaLogueado.classList.remove('hidden');
        this.loadAlumnoId();
        // Solo cargar cursos inscritos (no todos los cursos)
        await this.loadCursosInscritos();
      }
    } else {
      // Usuario NO logueado - mostrar vista informativa
      if (vistaLogueado) vistaLogueado.classList.add('hidden');
      if (vistaNoLogueado) {
        vistaNoLogueado.classList.remove('hidden');
        this.loadInformativeView();
      }
    }
  }

  async loadCursosInscritos() {
    if (!this.alumnoId) {
      this.loadAlumnoId();
      if (!this.alumnoId) return;
    }

    try {
      const cursos = await getAlumnoCursos(this.alumnoId);
      
      // Eliminar duplicados basándose en id_curso
      const cursosUnicos = cursos.reduce((acc, curso) => {
        const existe = acc.find(c => c.id_curso === curso.id_curso);
        if (!existe) {
          acc.push(curso);
        }
        return acc;
      }, []);
      
      this.cursosInscritos = cursosUnicos;
      this.renderCursosInscritos();
    } catch (error) {
      console.error('Error al cargar cursos inscritos:', error);
      this.cursosInscritos = [];
      this.renderCursosInscritos();
    }
  }

  async renderCursosInscritos() {
    const container = document.getElementById('cursosInscritosContainer');
    const contador = document.getElementById('contadorCursosInscritos');
    
    if (contador) {
      contador.textContent = `${this.cursosInscritos.length} ${this.cursosInscritos.length === 1 ? 'curso' : 'cursos'}`;
    }

    if (!container) return;

    if (this.cursosInscritos.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
          <div class="text-6xl mb-4">📚</div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Aún no tienes cursos inscritos
          </h3>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Explora el catálogo de cursos e inscríbete para comenzar tu aprendizaje
          </p>
          <button 
            onclick="window.app.router.navigateTo('cursos')" 
            class="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
          >
            <span class="material-symbols-outlined inline-block align-middle mr-2">explore</span>
            Explorar Cursos
          </button>
        </div>
      `;
      return;
    }

    // Ordenar por fecha de inscripción (más recientes primero)
    const cursosOrdenados = [...this.cursosInscritos].sort((a, b) => {
      const fechaA = new Date(a.fecha_inscripcion || 0);
      const fechaB = new Date(b.fecha_inscripcion || 0);
      return fechaB - fechaA;
    });

    // Cargar progreso para cada curso (async)
    const cursosConProgreso = await Promise.all(
      cursosOrdenados.map(async (curso) => {
        let progreso = 0;
        try {
          if (this.alumnoId && curso.id_curso) {
            const progresoData = await API.getCourseProgress(this.alumnoId, curso.id_curso);
            progreso = Math.round(progresoData?.porcentaje_completado || 0);
          }
        } catch (error) {
          console.error(`Error al obtener progreso del curso ${curso.id_curso}:`, error);
          progreso = curso.finalizado ? 100 : 0;
        }
        return { ...curso, progresoCalculado: progreso };
      })
    );

    container.innerHTML = cursosConProgreso.map(curso => {
      const progreso = curso.progresoCalculado || 0;
      // El curso está completado solo si el progreso es 100%
      const estaCompletado = progreso >= 100;
      const estado = estaCompletado ? 'Completado' : 'En progreso';
      const estadoColor = estaCompletado 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';

      return `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer"
             onclick="window.app.courses.verCursoDetalle(${curso.id_curso})"
             role="button"
             tabindex="0"
             onkeypress="if(event.key==='Enter') window.app.courses.verCursoDetalle(${curso.id_curso})">
          <div class="aspect-video bg-gradient-to-br from-primary/20 to-blue-100 dark:from-primary/30 dark:to-blue-900/30 flex items-center justify-center relative">
            <span class="material-symbols-outlined text-6xl text-primary">school</span>
            ${curso.progresoCalculado > 0 ? `
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                <div class="h-full bg-primary transition-all" style="width: ${curso.progresoCalculado}%"></div>
              </div>
            ` : ''}
          </div>
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-xl font-bold text-slate-900 dark:text-white flex-1">
                ${this.escapeHtml(curso.titulo)}
              </h3>
              <span class="px-2 py-1 ${estadoColor} text-xs font-semibold rounded ml-2">
                ${estado}
              </span>
            </div>
            <p class="text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
              ${this.escapeHtml(curso.descripcion || 'Sin descripción')}
            </p>
            <div class="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-base">person</span>
                ${this.escapeHtml(curso.docente || 'Docente')}
              </span>
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-base">school</span>
                ${this.escapeHtml(curso.grado || 'Todos')}
              </span>
            </div>
            ${curso.progresoCalculado > 0 ? `
              <div class="mb-4">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="text-slate-600 dark:text-slate-400">Progreso</span>
                  <span class="font-semibold text-primary">${curso.progresoCalculado}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div class="bg-primary h-2 rounded-full transition-all" style="width: ${curso.progresoCalculado}%"></div>
                </div>
              </div>
            ` : ''}
            <button 
              onclick="event.stopPropagation(); window.app.courses.verCursoDetalle(${curso.id_curso})"
              class="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
              aria-label="Continuar curso ${this.escapeHtml(curso.titulo)}">
              ${curso.finalizado ? 'Ver Curso' : 'Continuar'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async loadInformativeView() {
    try {
      // Cargar categorías para mostrar
      await this.loadCategoriasPreview();
      
      // Cargar algunos cursos de ejemplo (solo públicos)
      await this.loadCursosPreview();
      
      // Actualizar estadísticas
      await this.loadEstadisticas();
    } catch (error) {
      console.error('Error al cargar vista informativa:', error);
    }
  }

  async loadInformativeViewCatalogo() {
    try {
      // Cargar categorías para mostrar en el catálogo
      await this.loadCategoriasPreviewCatalogo();
      
      // Cargar algunos cursos de ejemplo (solo públicos)
      await this.loadCursosPreviewCatalogo();
      
      // Actualizar estadísticas
      await this.loadEstadisticas();
    } catch (error) {
      console.error('Error al cargar vista informativa del catálogo:', error);
    }
  }

  async loadCategoriasPreviewCatalogo() {
    try {
      const container = document.getElementById('categoriasCursosCatalogo');
      if (!container) return;

      if (this.categorias.length === 0) {
        try {
          this.categorias = await getCategorias();
        } catch (error) {
          console.warn('⚠️ No se pudieron cargar categorías:', error.message);
          this.categorias = [];
        }
      }

      if (this.categorias.length > 0) {
        container.innerHTML = this.categorias.slice(0, 8).map(cat => `
          <div class="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            <div class="text-3xl mb-2">📚</div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white">${this.escapeHtml(cat.nombre)}</div>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400">No hay categorías disponibles</p>';
      }
    } catch (error) {
      console.error('Error al cargar categorías preview:', error);
      const container = document.getElementById('categoriasCursosCatalogo');
      if (container) {
        container.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400">Error al cargar categorías</p>';
      }
    }
  }

  async loadCursosPreviewCatalogo() {
    try {
      const container = document.getElementById('previewCursosCatalogo');
      if (!container) return;

      // Cargar algunos cursos públicos
      let cursos = [];
      try {
        cursos = await getCursos({});
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar cursos:', error.message);
        cursos = [];
      }
      const cursosPreview = cursos.slice(0, 3);

      if (cursosPreview.length > 0) {
        container.innerHTML = cursosPreview.map(curso => `
          <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-6 border-2 border-slate-200 dark:border-slate-600">
            <div class="text-4xl mb-3">📖</div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">${this.escapeHtml(curso.titulo)}</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">${this.escapeHtml(curso.descripcion || 'Sin descripción')}</p>
            <p class="text-xs text-slate-500 dark:text-slate-500">${this.escapeHtml(curso.docente || 'Docente')} • ${this.escapeHtml(curso.grado || 'Todos')}</p>
          </div>
        `).join('');
      } else {
        container.innerHTML = `
          <div class="col-span-full text-center py-8">
            <p class="text-slate-600 dark:text-slate-400">
              Los cursos se cargarán cuando inicies sesión
            </p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error al cargar cursos preview:', error);
      const container = document.getElementById('previewCursosCatalogo');
      if (container) {
        container.innerHTML = `
          <div class="col-span-full text-center py-8">
            <p class="text-slate-600 dark:text-slate-400">
              Inicia sesión para ver los cursos disponibles
            </p>
          </div>
        `;
      }
    }
  }

  async loadEstadisticas() {
    try {
      // Obtener total de cursos aprobados/publicados
      const cursos = await getCursos();
      const totalCursos = cursos.length;
      
      const statsElement = document.getElementById('statsTotalCursosPublicos');
      if (statsElement) {
        statsElement.textContent = totalCursos > 0 ? `${totalCursos}+` : '50+';
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }

  async loadCategoriasPreview() {
    try {
      const container = document.getElementById('categoriasCursos');
      if (!container) return;

      if (this.categorias.length === 0) {
        try {
          this.categorias = await getCategorias();
        } catch (error) {
          console.warn('⚠️ No se pudieron cargar categorías:', error.message);
          this.categorias = [];
        }
      }

      if (this.categorias.length > 0) {
        container.innerHTML = this.categorias.slice(0, 8).map(cat => `
          <div class="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            <div class="text-3xl mb-2">📚</div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white">${this.escapeHtml(cat.nombre)}</div>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400">No hay categorías disponibles</p>';
      }
    } catch (error) {
      console.error('Error al cargar categorías preview:', error);
      const container = document.getElementById('categoriasCursos');
      if (container) {
        container.innerHTML = '<p class="text-center text-slate-500 dark:text-slate-400">Error al cargar categorías</p>';
      }
    }
  }

  async loadCursosPreview() {
    try {
      const container = document.getElementById('previewCursos');
      if (!container) return;

      // Cargar cursos públicos (sin filtro de estado, el backend devuelve aprobados/publicados por defecto)
      let cursos = [];
      try {
        cursos = await getCursos();
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar cursos:', error.message);
        cursos = [];
      }
      
      if (cursos.length > 0) {
        container.innerHTML = cursos.slice(0, 6).map(curso => `
          <div class="bg-slate-50 dark:bg-slate-700 rounded-xl p-6 border-2 border-slate-200 dark:border-slate-600 hover:border-primary transition-colors">
            <div class="flex items-start justify-between mb-3">
              <div class="text-4xl">📖</div>
              <span class="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                ${curso.categoria || 'General'}
              </span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
              ${this.escapeHtml(curso.titulo)}
            </h3>
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
              ${this.escapeHtml(curso.descripcion || 'Sin descripción')}
            </p>
            <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">school</span>
              <span>${curso.grado || 'Todos los niveles'}</span>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = `
          <div class="col-span-full text-center py-8">
            <p class="text-slate-600 dark:text-slate-400">
              Los cursos se cargarán cuando inicies sesión
            </p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error al cargar cursos preview:', error);
      const container = document.getElementById('previewCursos');
      if (container) {
        container.innerHTML = `
          <div class="col-span-full text-center py-8">
            <p class="text-slate-600 dark:text-slate-400">
              Inicia sesión para ver los cursos disponibles
            </p>
          </div>
        `;
      }
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupEventListeners() {
    // Botón de aplicar filtros
    const btnAplicarFiltros = document.querySelector('#cursos button');
    if (btnAplicarFiltros && btnAplicarFiltros.textContent.includes('Aplicar')) {
      btnAplicarFiltros.addEventListener('click', () => {
        this.applyFilters();
      });
    }

    // Búsqueda de cursos
    const searchInput = document.getElementById('course-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchCursos(e.target.value);
      });
    }
  }

  populateFilters() {
    // Poblar select de categorías para el catálogo
    const selectCategoriaCatalogo = document.getElementById('filtroCategoriaCatalogo');
    if (selectCategoriaCatalogo && this.categorias.length > 0) {
      selectCategoriaCatalogo.innerHTML = '<option value="">Todas las categorías</option>';
      this.categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id_categoria;
        option.textContent = cat.nombre;
        selectCategoriaCatalogo.appendChild(option);
      });
    }

    // Poblar select de grados para el catálogo
    const selectGradoCatalogo = document.getElementById('filtroGradoCatalogo');
    if (selectGradoCatalogo && this.grados.length > 0) {
      selectGradoCatalogo.innerHTML = '<option value="">Todos los grados</option>';
      this.grados.forEach(grado => {
        const option = document.createElement('option');
        option.value = grado.id_grado;
        option.textContent = grado.nombre;
        selectGradoCatalogo.appendChild(option);
      });
    }
  }

  async loadCatalogoCursos(filters = {}) {
    // Cargar cursos para el catálogo (todos los disponibles)
    try {
      const cursos = await getCursos(filters);
      this.renderCatalogoCursos(cursos);
    } catch (error) {
      console.error('Error al cargar catálogo de cursos:', error);
      this.showError('Error al cargar los cursos');
    }
  }

  renderCatalogoCursos(cursos) {
    const container = document.getElementById('listaCursosCatalogo');
    if (!container) return;

    if (cursos.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-6xl mb-4">📚</div>
          <p class="text-slate-600 dark:text-slate-400 text-lg">No se encontraron cursos</p>
          <p class="text-slate-500 dark:text-slate-500 text-sm mt-2">Intenta ajustar los filtros</p>
        </div>
      `;
      return;
    }

    // Obtener rol del usuario actual
    const sessionData = localStorage.getItem('eduVisionSession');
    const userRol = sessionData ? JSON.parse(sessionData).user?.rol : null;
    const esAdmin = userRol === 'admin';

    // Obtener IDs de cursos inscritos para verificar estado
    const cursosInscritosIds = this.cursosInscritos.map(c => c.id_curso);

    container.innerHTML = cursos.map(curso => {
      const estaInscrito = cursosInscritosIds.includes(curso.id_curso);
      const cursoInscrito = estaInscrito ? this.cursosInscritos.find(c => c.id_curso === curso.id_curso) : null;
      
      return `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="aspect-video bg-gradient-to-br from-primary/20 to-blue-100 dark:from-primary/30 dark:to-blue-900/30 flex items-center justify-center relative">
            <span class="material-symbols-outlined text-4xl sm:text-5xl md:text-6xl text-primary">school</span>
            ${estaInscrito && cursoInscrito && !cursoInscrito.finalizado ? `
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                <div class="h-full bg-primary transition-all" style="width: 0%"></div>
              </div>
            ` : ''}
          </div>
          <div class="p-4 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
              <h3 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex-1">
                ${this.escapeHtml(curso.titulo)}
              </h3>
              <span class="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded sm:ml-2 self-start">
                ${this.escapeHtml(curso.categoria || 'General')}
              </span>
            </div>
            <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
              ${this.escapeHtml(curso.descripcion || 'Sin descripción')}
            </p>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-sm sm:text-base">person</span>
                <span class="truncate">${this.escapeHtml(curso.docente || 'Docente')}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-sm sm:text-base">school</span>
                ${this.escapeHtml(curso.grado || 'Todos')}
              </span>
            </div>
            ${estaInscrito ? `
              <button 
                onclick="window.app.courses.verCursoDetalle(${curso.id_curso})"
                class="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
                aria-label="Ver curso ${this.escapeHtml(curso.titulo)}">
                ${cursoInscrito?.finalizado ? 'Ver Curso' : 'Continuar Curso'}
              </button>
            ` : esAdmin ? `
              <button 
                onclick="window.app.courses.verCursoDetalle(${curso.id_curso})"
                class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                aria-label="Ver detalles del curso ${this.escapeHtml(curso.titulo)}">
                <span class="material-symbols-outlined text-lg">visibility</span>
                Ver Detalles
              </button>
            ` : `
              <button 
                onclick="window.app.courses.inscribirseEnCurso(${curso.id_curso})"
                class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                aria-label="Inscribirse en el curso ${this.escapeHtml(curso.titulo)}">
                <span class="material-symbols-outlined text-lg">add</span>
                Inscribirse
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  async loadCursos(filters = {}) {
    // Este método ahora se usa solo para el catálogo
    return this.loadCatalogoCursos(filters);
  }

  renderCursos(cursos) {
    // Este método ahora redirige al método del catálogo
    this.renderCatalogoCursos(cursos);
  }

  async inscribirseEnCurso(cursoId) {
    if (!this.alumnoId) {
      this.loadAlumnoId();
      if (!this.alumnoId) {
        this.showError('No se pudo identificar tu cuenta. Por favor, inicia sesión nuevamente.');
        return;
      }
    }

    try {
      // Verificar si ya está inscrito
      const yaInscrito = this.cursosInscritos.some(c => c.id_curso === cursoId);
      if (yaInscrito) {
        this.showError('Ya estás inscrito en este curso');
        return;
      }

      // Mostrar loading
      const button = event.target.closest('button');
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Inscribiendo...';

      // Inscribir al curso
      await inscribirAlumno(this.alumnoId, cursoId);

      // Recargar cursos inscritos
      await this.loadCursosInscritos();
      
      // Si estamos en el catálogo, recargar también
      const seccionCatalogo = document.getElementById('cursos');
      if (seccionCatalogo && !seccionCatalogo.classList.contains('hidden')) {
        await this.loadCatalogoCursos();
      }

      // Mostrar mensaje de éxito
      this.showSuccess('¡Te has inscrito exitosamente al curso!');

    } catch (error) {
      console.error('Error al inscribirse:', error);
      this.showError('No se pudo completar la inscripción. Intenta nuevamente.');
    }
  }

  async applyFiltersCatalogo() {
    const selectCategoria = document.getElementById('filtroCategoriaCatalogo');
    const selectGrado = document.getElementById('filtroGradoCatalogo');

    const filters = {};
    
    if (selectCategoria && selectCategoria.value) {
      filters.categoria = selectCategoria.value;
    }
    
    if (selectGrado && selectGrado.value) {
      filters.grado = selectGrado.value;
    }

    await this.loadCatalogoCursos(filters);
  }

  async applyFilters() {
    // Alias para mantener compatibilidad
    await this.applyFiltersCatalogo();
  }

  searchCursos(query) {
    const cursosArticles = document.querySelectorAll('#cursos article');
    const lowerQuery = query.toLowerCase();

    cursosArticles.forEach(article => {
      const title = article.querySelector('h3').textContent.toLowerCase();
      const description = article.querySelector('p').textContent.toLowerCase();
      
      if (title.includes(lowerQuery) || description.includes(lowerQuery)) {
        article.style.display = '';
      } else {
        article.style.display = 'none';
      }
    });
  }

  async verCursoDetalle(cursoId) {
    try {
      // Verificar rol del usuario
      const sessionData = localStorage.getItem('eduVisionSession');
      const userRol = sessionData ? JSON.parse(sessionData).user?.rol : null;
      const esAdmin = userRol === 'admin';

      // Si no es admin, verificar si el alumno está inscrito
      if (!esAdmin) {
        if (!this.alumnoId) {
          this.loadAlumnoId();
        }

        const estaInscrito = this.cursosInscritos.some(c => c.id_curso === cursoId);
        
        if (!estaInscrito) {
          this.showError('Debes inscribirte en este curso para ver su contenido');
          return;
        }
      }

      this.currentCurso = await getCurso(cursoId);
      
      // Guardar en sesión para usar en otras secciones
      sessionStorage.setItem('currentCurso', JSON.stringify(this.currentCurso));
      
      // Navegar a recursos del curso
      if (window.app && window.app.router) {
        window.app.router.navigateTo('recursosCurso');
        
        // Cargar recursos del curso
        await this.loadCursoRecursos(cursoId);
      }
    } catch (error) {
      console.error('Error al ver detalle del curso:', error);
      this.showError('Error al cargar el curso');
    }
  }

  async loadCursoRecursos(cursoId) {
    try {
      // Verificar rol del usuario
      const sessionData = localStorage.getItem('eduVisionSession');
      const userRol = sessionData ? JSON.parse(sessionData).user?.rol : null;
      const esAdmin = userRol === 'admin';

      // Si no es admin, verificar que el alumno esté inscrito
      if (!esAdmin) {
        if (!this.alumnoId) {
          this.loadAlumnoId();
        }
        
        if (this.cursosInscritos.length === 0 && this.alumnoId) {
          await this.loadCursosInscritos();
        }
        
        const estaInscrito = this.cursosInscritos.some(c => c.id_curso === cursoId);
        if (!estaInscrito) {
          this.showError('Debes inscribirte en este curso para ver su contenido');
          if (window.app && window.app.router) {
            window.app.router.navigateTo('listaCursosAlumno');
          }
          return;
        }
      }
      
      // Cargar información completa del curso
      if (!this.currentCurso) {
        this.currentCurso = await getCurso(cursoId);
        sessionStorage.setItem('currentCurso', JSON.stringify(this.currentCurso));
      }
      
      // Cargar recursos, secciones con lecciones, contenido antiguo y cuestionarios
      const [recursos, secciones, contenido, cuestionarios] = await Promise.all([
        getCursoRecursos(cursoId).catch(() => []),
        API.getCourseSections(cursoId).catch(() => []),
        getCursoContenido(cursoId).catch(() => []),
        API.getCursoCuestionarios(cursoId).catch(() => [])
      ]);
      
      // Guardar secciones y contenido para uso en navegación
      this.seccionesActuales = secciones || [];
      this.contenidoActual = contenido || [];
      
      console.log('[DEBUG] Secciones cargadas:', this.seccionesActuales.length);
      console.log('[DEBUG] Contenido cargado:', this.contenidoActual.length);
      
      // Obtener progreso de lecciones si el alumno está inscrito
      let progresoLecciones = {};
      if (this.alumnoId && secciones && secciones.length > 0) {
        try {
          const progresoPromises = [];
          secciones.forEach(seccion => {
            if (seccion.lecciones && seccion.lecciones.length > 0) {
              seccion.lecciones.forEach(leccion => {
                progresoPromises.push(
                  API.getLeccionProgreso(this.alumnoId, leccion.id_leccion)
                    .then(progreso => {
                      console.log(`[DEBUG] Progreso obtenido para lección ${leccion.id_leccion}:`, progreso);
                      // Asegurar que completada sea un booleano
                      if (progreso && typeof progreso.completada !== 'undefined') {
                        progreso.completada = progreso.completada === true || progreso.completada === 1 || progreso.completada === 'true';
                      }
                      return { leccionId: leccion.id_leccion, progreso };
                    })
                    .catch((error) => {
                      console.warn(`[DEBUG] No se pudo obtener progreso para lección ${leccion.id_leccion}:`, error);
                      return { leccionId: leccion.id_leccion, progreso: { completada: false } };
                    })
                );
              });
            }
          });
          const resultados = await Promise.all(progresoPromises);
          resultados.forEach(({ leccionId, progreso }) => {
            progresoLecciones[leccionId] = progreso;
          });
          console.log('[DEBUG] Progreso de lecciones cargado:', progresoLecciones);
        } catch (error) {
          console.error('Error al obtener progreso de lecciones:', error);
        }
      }
      
      await this.renderDetallesCurso(recursos, secciones, contenido, cuestionarios, progresoLecciones);
      
      // Verificar si ya existe una encuesta para este curso (después de renderizar)
      // Usar setTimeout para asegurar que el DOM esté completamente renderizado
      setTimeout(async () => {
        await this.verificarEncuestaExistente(cursoId);
      }, 200);
    } catch (error) {
      console.error('Error al cargar detalles del curso:', error);
      this.showError('Error al cargar la información del curso');
    }
  }

  async renderDetallesCurso(recursos, secciones, contenido, cuestionarios, progresoLecciones = {}) {
    // Actualizar información del curso en el header
    await this.renderCursoHeader();
    
    // Renderizar contenido (secciones y lecciones en orden secuencial)
    this.renderContenidoCurso(secciones, contenido, progresoLecciones);
    
    // Renderizar recursos
    this.renderRecursosCurso(recursos);
    
    // Renderizar cuestionarios (bloqueados hasta completar lecciones)
    this.renderCuestionariosCurso(cuestionarios, secciones, progresoLecciones);
  }

  async renderCursoHeader() {
    if (!this.currentCurso) return;
    
    const curso = this.currentCurso;
    const cursoInscrito = this.cursosInscritos.find(c => c.id_curso === curso.id_curso);
    
    // Actualizar título
    const tituloElement = document.getElementById('cursoTituloDetalle');
    if (tituloElement) {
      tituloElement.textContent = curso.titulo || 'Sin título';
    }
    
    // Actualizar descripción
    const descripcionElement = document.getElementById('cursoDescripcionDetalle');
    if (descripcionElement) {
      descripcionElement.textContent = curso.descripcion || 'Este curso no tiene descripción disponible.';
    }
    
    // Actualizar docente
    const docenteElement = document.getElementById('cursoDocenteDetalle');
    if (docenteElement) {
      docenteElement.textContent = `Docente: ${curso.docente || 'No asignado'}`;
    }
    
    // Actualizar categoría
    const categoriaElement = document.getElementById('cursoCategoriaDetalle');
    if (categoriaElement) {
      categoriaElement.textContent = `Categoría: ${curso.categoria || 'Sin categoría'}`;
    }
    
    // Actualizar grado
    const gradoElement = document.getElementById('cursoGradoDetalle');
    if (gradoElement) {
      gradoElement.textContent = `Grado: ${curso.grado || 'Sin grado'}`;
    }
    
    // Mostrar progreso si está inscrito
    if (cursoInscrito) {
      // Obtener progreso real del servidor
      let progreso = 0;
      try {
        if (this.alumnoId && curso.id_curso) {
          const progresoData = await API.getCourseProgress(this.alumnoId, curso.id_curso);
          progreso = Math.round(progresoData?.porcentaje_completado || 0);
        }
      } catch (error) {
        console.error('Error al obtener progreso:', error);
        progreso = cursoInscrito.finalizado ? 100 : 0;
      }
      
      // El curso está completado solo si el progreso es 100%
      const estaCompletado = progreso >= 100;
      const estado = estaCompletado ? 'Completado' : 'En progreso';
      const estadoColor = estaCompletado 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      
      // Agregar información de progreso al header si no existe
      let progresoElement = document.getElementById('cursoProgresoDetalle');
      if (!progresoElement) {
        const headerDiv = document.querySelector('#recursosCurso .bg-white.dark\\:bg-slate-800');
        if (headerDiv) {
          const progresoDiv = document.createElement('div');
          progresoDiv.id = 'cursoProgresoDetalle';
          progresoDiv.className = 'mt-4 pt-4 border-t border-slate-200 dark:border-slate-700';
          progresoDiv.innerHTML = `
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Progreso del Curso</span>
              <span class="px-3 py-1 ${estadoColor} text-xs font-semibold rounded-full">${estado}</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-2">
              <div class="bg-primary h-3 rounded-full transition-all" style="width: ${progreso}%" 
                   role="progressbar" 
                   aria-valuenow="${progreso}" 
                   aria-valuemin="0" 
                   aria-valuemax="100"
                   aria-label="Progreso: ${progreso}%">
              </div>
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              ${progreso}% completado
            </p>
          `;
          headerDiv.appendChild(progresoDiv);
        }
      } else {
        // Actualizar progreso existente
        progresoElement.innerHTML = `
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Progreso del Curso</span>
            <span class="px-3 py-1 ${estadoColor} text-xs font-semibold rounded-full">${estado}</span>
          </div>
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-2">
            <div class="bg-primary h-3 rounded-full transition-all" style="width: ${progreso}%" 
                 role="progressbar" 
                 aria-valuenow="${progreso}" 
                 aria-valuemin="0" 
                 aria-valuemax="100"
                 aria-label="Progreso: ${progreso}%">
            </div>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            ${progreso}% completado
          </p>
        `;
      }
    } else {
      // Remover progreso si no está inscrito
      const progresoElement = document.getElementById('cursoProgresoDetalle');
      if (progresoElement) {
        progresoElement.remove();
      }
    }
  }

  renderContenidoCurso(secciones, contenidoAntiguo, progresoLecciones = {}) {
    const container = document.getElementById('listaContenidoCursoDetalle');
    if (!container) return;
    
    // Si hay secciones, usar el nuevo sistema de secciones y lecciones
    if (secciones && secciones.length > 0) {
      this.renderSeccionesYLecciones(secciones, progresoLecciones);
      return;
    }
    
    // Fallback al contenido antiguo si no hay secciones
    if (!contenidoAntiguo || contenidoAntiguo.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📚</div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No hay contenido disponible
          </h3>
          <p class="text-slate-600 dark:text-slate-400">
            El docente aún no ha agregado contenido a este curso
          </p>
        </div>
      `;
      return;
    }
    
    // Agregar event listeners después de renderizar
    setTimeout(() => {
      document.querySelectorAll('.btn-ver-leccion').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            this.mostrarLeccionModal({
              titulo: button.dataset.titulo,
              texto: button.dataset.texto,
              tipo: button.dataset.tipo,
              url: button.dataset.url,
              id: button.dataset.id,
              leccionId: button.dataset.leccionId || button.dataset.id
            });
          });
      });
    }, 100);
    
    container.innerHTML = contenidoAntiguo.map((item, index) => {
      const tipoIcon = {
        'video': 'play_circle',
        'documento': 'description',
        'audio': 'headphones',
        'lectura': 'menu_book'
      }[item.tipo || 'lectura'] || 'article';
      
      return `
        <div class="group bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl">
          <div class="flex items-start gap-5">
            <!-- Icono mejorado -->
            <div class="flex-shrink-0">
              <div class="w-16 h-16 bg-gradient-to-br from-primary/20 to-blue-500/20 dark:from-primary/30 dark:to-blue-500/30 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <span class="material-symbols-outlined text-primary dark:text-blue-400 text-3xl">${tipoIcon}</span>
              </div>
            </div>
            
            <!-- Contenido -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                    ${this.escapeHtml(item.seccion || `Lección ${index + 1}`)}
                  </h3>
                  <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800">
                    <span class="material-symbols-outlined text-xs">${tipoIcon}</span>
                    ${this.escapeHtml(item.tipo || 'lectura')}
                  </span>
                </div>
              </div>
              
              <p class="text-slate-600 dark:text-slate-300 mb-5 line-clamp-2 leading-relaxed">
                ${this.escapeHtml(item.texto || 'Sin descripción disponible')}
              </p>
              
              <!-- Botones de acción -->
              <div class="flex gap-3">
                <button 
                  class="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500 text-white rounded-lg font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 btn-ver-leccion transform hover:scale-105"
                  data-titulo="${this.escapeHtml(item.seccion || 'Lección')}"
                  data-texto="${this.escapeHtml(item.texto || '')}"
                  data-tipo="${item.tipo || 'lectura'}"
                  data-url="${item.url || ''}"
                  data-id="${item.id_contenido || index}"
                  aria-label="Ver lección completa"
                >
                  <span class="material-symbols-outlined">${item.tipo === 'video' ? 'play_circle' : item.tipo === 'audio' ? 'headphones' : 'menu_book'}</span>
                  <span>Ver Lección</span>
                </button>
                
                ${this.usuarioLogueado && this.esAlumno() ? `
                  <button 
                    onclick="window.app.courses.marcarComoCompletado('${item.id_contenido || index}')" 
                    class="px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-105"
                    aria-label="Marcar como completado"
                    title="Completar"
                  >
                    <span class="material-symbols-outlined">check_circle</span>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Renderizar secciones y lecciones en orden secuencial
   */
  renderSeccionesYLecciones(secciones, progresoLecciones = {}) {
    const container = document.getElementById('listaContenidoCursoDetalle');
    if (!container) return;
    
    // Aplanar todas las lecciones para verificar progreso
    const todasLasLecciones = [];
    secciones.forEach(seccion => {
      if (seccion.lecciones && seccion.lecciones.length > 0) {
        todasLasLecciones.push(...seccion.lecciones);
      }
    });
    
    console.log('[DEBUG] Renderizando secciones. Progreso recibido:', progresoLecciones);
    console.log('[DEBUG] Total lecciones:', todasLasLecciones.length);
    
    // Verificar qué lecciones están completadas
    const leccionesCompletadas = todasLasLecciones.filter(leccion => {
      const progreso = progresoLecciones[leccion.id_leccion];
      const completada = progreso && (
        progreso.completada === true || 
        progreso.completada === 1 || 
        progreso.completada === 'true' ||
        (progreso.completada !== undefined && progreso.completada !== false && progreso.completada !== 0 && progreso.completada !== 'false')
      );
      if (completada) {
        console.log(`[DEBUG] Lección ${leccion.id_leccion} (${leccion.titulo}) está completada`);
      }
      return completada;
    });
    
    console.log('[DEBUG] Lecciones completadas:', leccionesCompletadas.length);
    
    // Determinar qué lecciones están desbloqueadas (primera siempre, luego secuencial)
    const leccionesDesbloqueadas = new Set();
    todasLasLecciones.forEach((leccion, index) => {
      if (index === 0) {
        leccionesDesbloqueadas.add(leccion.id_leccion);
        console.log(`[DEBUG] Primera lección ${leccion.id_leccion} desbloqueada automáticamente`);
      } else {
        const leccionAnterior = todasLasLecciones[index - 1];
        const progresoAnterior = progresoLecciones[leccionAnterior.id_leccion];
        const anteriorCompletada = progresoAnterior && (
          progresoAnterior.completada === true || 
          progresoAnterior.completada === 1 || 
          progresoAnterior.completada === 'true' ||
          (progresoAnterior.completada !== undefined && progresoAnterior.completada !== false && progresoAnterior.completada !== 0 && progresoAnterior.completada !== 'false')
        );
        if (anteriorCompletada) {
          leccionesDesbloqueadas.add(leccion.id_leccion);
          console.log(`[DEBUG] Lección ${leccion.id_leccion} desbloqueada porque la anterior está completada`);
        } else {
          console.log(`[DEBUG] Lección ${leccion.id_leccion} bloqueada. Anterior ${leccionAnterior.id_leccion} completada:`, anteriorCompletada, 'Progreso anterior:', progresoAnterior);
        }
      }
    });
    
    console.log('[DEBUG] Lecciones desbloqueadas:', Array.from(leccionesDesbloqueadas));
    
    container.innerHTML = secciones.map((seccion, seccionIndex) => {
      const esIntroduccion = seccionIndex === 0;
      const leccionesHTML = seccion.lecciones && seccion.lecciones.length > 0 
        ? seccion.lecciones.map((leccion, leccionIndex) => {
            const progreso = progresoLecciones[leccion.id_leccion] || { completada: false };
            const estaCompletada = progreso && (
              progreso.completada === true || 
              progreso.completada === 1 || 
              progreso.completada === 'true' ||
              (progreso.completada !== undefined && progreso.completada !== false && progreso.completada !== 0 && progreso.completada !== 'false')
            );
            const estaDesbloqueada = leccionesDesbloqueadas.has(leccion.id_leccion);
            
            console.log(`[DEBUG] Lección ${leccion.id_leccion} (${leccion.titulo}): completada=${estaCompletada}, desbloqueada=${estaDesbloqueada}, progreso=`, progreso);
            const esPrimeraLeccion = seccionIndex === 0 && leccionIndex === 0;
            
            const tipoIcon = {
              'video': 'play_circle',
              'texto': 'menu_book',
              'audio': 'headphones',
              'pdf': 'description',
              'interactivo': 'interactive_space',
              'quiz': 'quiz'
            }[leccion.tipo] || 'menu_book';
            
            return `
              <div class="group bg-white dark:bg-slate-800 rounded-xl p-6 border-2 ${
                estaCompletada 
                  ? 'border-green-500 dark:border-green-600' 
                  : estaDesbloqueada 
                    ? 'border-primary dark:border-primary/50' 
                    : 'border-slate-300 dark:border-slate-600 opacity-60'
              } hover:border-primary dark:hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl ${
                !estaDesbloqueada ? 'cursor-not-allowed' : ''
              }">
                <div class="flex items-start gap-5">
                  <!-- Icono y estado -->
                  <div class="flex-shrink-0 relative">
                    <div class="w-16 h-16 bg-gradient-to-br ${
                      estaCompletada 
                        ? 'from-green-500/20 to-green-600/20' 
                        : estaDesbloqueada 
                          ? 'from-primary/20 to-blue-500/20' 
                          : 'from-slate-400/20 to-slate-500/20'
                    } rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <span class="material-symbols-outlined ${
                        estaCompletada 
                          ? 'text-green-500' 
                          : estaDesbloqueada 
                            ? 'text-primary dark:text-blue-400' 
                            : 'text-slate-400'
                      } text-3xl">${tipoIcon}</span>
                    </div>
                    ${estaCompletada ? `
                      <div class="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-sm">check</span>
                      </div>
                    ` : ''}
                    ${!estaDesbloqueada ? `
                      <div class="absolute inset-0 bg-slate-900/50 rounded-xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-xl">lock</span>
                      </div>
                    ` : ''}
                  </div>
                  
                  <!-- Contenido -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-3 mb-3">
                      <div class="flex-1">
                        <h3 class="text-xl font-bold ${
                          estaDesbloqueada 
                            ? 'text-slate-900 dark:text-white' 
                            : 'text-slate-500 dark:text-slate-400'
                        } mb-2 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                          ${this.escapeHtml(leccion.titulo || `Lección ${leccionIndex + 1}`)}
                        </h3>
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="inline-flex items-center gap-1 px-3 py-1 ${
                            estaDesbloqueada 
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          } text-xs font-semibold rounded-full border ${
                            estaDesbloqueada 
                              ? 'border-blue-200 dark:border-blue-800' 
                              : 'border-slate-300 dark:border-slate-600'
                          }">
                            <span class="material-symbols-outlined text-xs">${tipoIcon}</span>
                            ${this.escapeHtml(leccion.tipo || 'texto')}
                          </span>
                          ${estaCompletada ? `
                            <span class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full border border-green-200 dark:border-green-800">
                              <span class="material-symbols-outlined text-xs">check_circle</span>
                              Completada
                            </span>
                          ` : ''}
                          ${!estaDesbloqueada ? `
                            <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                              <span class="material-symbols-outlined text-xs">lock</span>
                              Bloqueada
                            </span>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                    
                    <p class="text-slate-600 dark:text-slate-300 mb-5 line-clamp-2 leading-relaxed">
                      ${this.escapeHtml(leccion.descripcion || leccion.contenido || 'Sin descripción disponible')}
                    </p>
                    
                    <!-- Botones de acción -->
                    <div class="flex gap-3">
                      <button 
                        class="flex-1 px-6 py-3 ${
                          estaDesbloqueada 
                            ? 'bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-500' 
                            : 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
                        } text-white rounded-lg font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 btn-ver-leccion transform hover:scale-105 ${
                          !estaDesbloqueada ? 'opacity-50' : ''
                        }"
                        data-titulo="${this.escapeHtml(leccion.titulo || 'Lección')}"
                        data-texto="${this.escapeHtml(leccion.contenido || leccion.descripcion || '')}"
                        data-tipo="${leccion.tipo || 'texto'}"
                        data-url="${leccion.url_recurso || ''}"
                        data-id="${leccion.id_leccion}"
                        data-leccion-id="${leccion.id_leccion}"
                        ${!estaDesbloqueada ? 'disabled' : ''}
                        aria-label="Ver lección completa"
                      >
                        <span class="material-symbols-outlined">${leccion.tipo === 'video' ? 'play_circle' : leccion.tipo === 'audio' ? 'headphones' : 'menu_book'}</span>
                        <span>${estaDesbloqueada ? 'Ver Lección' : 'Completa la lección anterior'}</span>
                      </button>
                      
                      ${this.esAlumno() && estaDesbloqueada ? `
                        <button 
                          class="btn-marcar-completada-lista px-5 py-3 ${
                            estaCompletada 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          } text-white rounded-lg font-semibold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-105"
                          data-leccion-id="${leccion.id_leccion}"
                          aria-label="${estaCompletada ? 'Ya completada' : 'Marcar como completado'}"
                          title="${estaCompletada ? 'Ya completada' : 'Completar'}"
                          ${estaCompletada ? 'disabled' : ''}
                        >
                          <span class="material-symbols-outlined">${estaCompletada ? 'check_circle' : 'check_circle'}</span>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')
        : '';
      
      return `
        <div class="mb-8">
          <div class="mb-4 pb-3 border-b-2 border-primary">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">${esIntroduccion ? 'info' : 'menu_book'}</span>
              ${this.escapeHtml(seccion.titulo || `Sección ${seccionIndex + 1}`)}
            </h2>
            ${seccion.descripcion ? `
              <p class="text-slate-600 dark:text-slate-400 mt-2">
                ${this.escapeHtml(seccion.descripcion)}
              </p>
            ` : ''}
          </div>
          <div class="space-y-4">
            ${leccionesHTML}
          </div>
        </div>
      `;
    }).join('');
    
    // Agregar event listeners después de renderizar
    setTimeout(() => {
      // Event listeners para botones "Ver Lección"
      document.querySelectorAll('.btn-ver-leccion').forEach(btn => {
        if (!btn.disabled) {
          btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            this.mostrarLeccionModal({
              titulo: button.dataset.titulo,
              texto: button.dataset.texto,
              tipo: button.dataset.tipo,
              url: button.dataset.url,
              id: button.dataset.id,
              leccionId: button.dataset.leccionId
            });
          });
        }
      });
      
      // Event listeners para botones "Marcar como completada" en la lista
      document.querySelectorAll('.btn-marcar-completada-lista').forEach(btn => {
        if (!btn.disabled) {
          btn.addEventListener('click', async (e) => {
            const button = e.currentTarget;
            const leccionId = button.dataset.leccionId;
            
            if (!leccionId) return;
            
            // Deshabilitar botón mientras se procesa
            button.disabled = true;
            const textoOriginal = button.innerHTML;
            button.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span>';
            
            try {
              await this.marcarLeccionCompletada(leccionId);
              // El método marcarLeccionCompletada ya recarga el curso, pero por si acaso
              if (this.currentCurso && this.currentCurso.id_curso) {
                await this.loadCursoRecursos(this.currentCurso.id_curso);
              }
            } catch (error) {
              console.error('[DEBUG] Error al marcar como completada desde lista:', error);
              // Restaurar botón en caso de error
              button.disabled = false;
              button.innerHTML = textoOriginal;
            }
          });
        }
      });
    }, 100);
  }

  renderRecursosCurso(recursos) {
    const container = document.getElementById('listaRecursosCursoDetalle');
    if (!container) return;
    
    if (!recursos || recursos.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-6xl mb-4">📁</div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No hay recursos disponibles
          </h3>
          <p class="text-slate-600 dark:text-slate-400">
            El docente aún no ha agregado recursos descargables a este curso
          </p>
        </div>
      `;
      return;
    }
    
    // Separar recursos por tipo
    const descargables = recursos.filter(r => r.tipo_nombre === 'PDF' || r.tipo_nombre === 'Audio' || r.url?.includes('uploads'));
    const externos = recursos.filter(r => r.tipo_nombre === 'Enlace YouTube' || (r.url && !r.url.includes('uploads')));
    
    container.innerHTML = `
      <!-- Materiales Descargables -->
      ${descargables.length > 0 ? `
        <div class="mb-8">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Materiales descargables</h3>
          <div class="space-y-3">
            ${descargables.map(recurso => this.renderRecursoDescargable(recurso)).join('')}
              </div>
            </div>
      ` : ''}

      <!-- Recursos Externos -->
      ${externos.length > 0 ? `
        <div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Recursos externos</h3>
          <div class="space-y-3">
            ${externos.map(recurso => this.renderRecursoExterno(recurso)).join('')}
            </div>
          </div>
      ` : ''}
    `;
  }

  renderCuestionariosCurso(cuestionarios, secciones = [], progresoLecciones = {}) {
    const container = document.getElementById('listaCuestionariosCursoDetalle');
    if (!container) return;
    
    if (!cuestionarios || cuestionarios.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📝</div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No hay cuestionarios disponibles
          </h3>
          <p class="text-slate-600 dark:text-slate-400">
            El docente aún no ha creado cuestionarios para este curso
          </p>
        </div>
      `;
      return;
    }
    
    // Verificar rol del usuario
    const sessionData = localStorage.getItem('eduVisionSession');
    const userRol = sessionData ? JSON.parse(sessionData).user?.rol : null;
    const esAdmin = userRol === 'admin';
    
    // Verificar si todas las lecciones están completadas (solo para alumnos)
    let todasLeccionesCompletadas = true;
    let leccionesPendientes = 0;
    
    if (!esAdmin && secciones && secciones.length > 0) {
      const todasLasLecciones = [];
      secciones.forEach(seccion => {
        if (seccion.lecciones && seccion.lecciones.length > 0) {
          todasLasLecciones.push(...seccion.lecciones);
        }
      });
      
      todasLasLecciones.forEach(leccion => {
        const progreso = progresoLecciones[leccion.id_leccion];
        if (!progreso || progreso.completada !== true) {
          todasLeccionesCompletadas = false;
          leccionesPendientes++;
        }
      });
    }
    
    container.innerHTML = cuestionarios.map(cuestionario => {
      const estado = cuestionario.estado === 'activo' ? 'Activo' : 'Inactivo';
      const estadoColor = cuestionario.estado === 'activo' 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400';
      
      // Los administradores siempre pueden ver, los alumnos necesitan cumplir requisitos
      const puedeAcceder = esAdmin ? true : (cuestionario.estado === 'activo' && (secciones.length === 0 || todasLeccionesCompletadas));
      
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border ${
          puedeAcceder 
            ? 'border-primary dark:border-primary/50' 
            : 'border-slate-200 dark:border-slate-600'
        } hover:border-primary transition-all ${
          !puedeAcceder ? 'opacity-75' : ''
        }">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                ${this.escapeHtml(cuestionario.titulo || 'Sin título')}
              </h3>
              <p class="text-slate-600 dark:text-slate-400 mb-3">
                ${this.escapeHtml(cuestionario.descripcion || 'Sin descripción')}
              </p>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-block px-3 py-1 ${estadoColor} text-xs font-semibold rounded-full">
                  ${estado}
                </span>
                ${!puedeAcceder && secciones.length > 0 ? `
                  <span class="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800">
                    <span class="material-symbols-outlined text-xs">lock</span>
                    Completa todas las lecciones primero
                  </span>
                ` : ''}
              </div>
              ${!puedeAcceder && secciones.length > 0 && leccionesPendientes > 0 ? `
                <p class="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ Debes completar ${leccionesPendientes} lección${leccionesPendientes > 1 ? 'es' : ''} antes de acceder a este cuestionario.
                </p>
              ` : ''}
            </div>
          </div>
          ${esAdmin ? `
            <button 
              onclick="window.app.courses.verCuestionarioAdmin(${cuestionario.id_cuestionario})"
              class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Ver cuestionario: ${this.escapeHtml(cuestionario.titulo || '')}">
              <span class="material-symbols-outlined">visibility</span>
              Ver Cuestionario
            </button>
          ` : `
            <button 
              onclick="${puedeAcceder ? `window.app.courses.iniciarCuestionario(${cuestionario.id_cuestionario})` : ''}"
              class="w-full px-4 py-3 ${
                puedeAcceder 
                  ? 'bg-primary hover:bg-primary/90' 
                  : 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed'
              } text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              ${!puedeAcceder ? 'disabled' : ''}
              aria-label="Iniciar cuestionario: ${this.escapeHtml(cuestionario.titulo || '')}">
              <span class="material-symbols-outlined">quiz</span>
              ${puedeAcceder 
                ? 'Iniciar Cuestionario' 
                : cuestionario.estado !== 'activo' 
                  ? 'Cuestionario Inactivo' 
                  : 'Completa las lecciones primero'}
            </button>
          `}
        </div>
      `;
    }).join('');
  }

  cambiarTabCurso(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.curso-tab-content').forEach(tab => {
      tab.classList.add('hidden');
    });
    
    // Remover active de todos los botones
    document.querySelectorAll('.curso-tab').forEach(btn => {
      btn.classList.remove('active', 'border-primary', 'text-slate-900', 'dark:text-white');
      btn.classList.add('text-slate-600', 'dark:text-slate-400', 'border-transparent');
    });
    
    // Mostrar tab seleccionado
    const tabContent = document.getElementById(`cursoTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (tabContent) {
      tabContent.classList.remove('hidden');
    }
    
    // Activar botón
    const activeBtn = Array.from(document.querySelectorAll('.curso-tab')).find(btn => 
      btn.textContent.includes(this.getTabLabel(tabName))
    );
    if (activeBtn) {
      activeBtn.classList.add('active', 'border-primary', 'text-slate-900', 'dark:text-white');
      activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400', 'border-transparent');
    }
  }

  getTabLabel(tabName) {
    const labels = {
      'contenido': 'Contenido',
      'recursos': 'Recursos',
      'cuestionario': 'Cuestionarios'
    };
    return labels[tabName] || tabName;
  }

  abrirContenido(url, tipo) {
    if (tipo === 'video' || tipo === 'audio') {
      // Abrir en nueva pestaña o modal
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  abrirRecurso(recursoId, url, esEnlace) {
    if (esEnlace && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (url) {
      // Descargar recurso
      const link = document.createElement('a');
      link.href = url;
      link.download = '';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      this.showError('No hay URL disponible para este recurso');
    }
  }

  /**
   * Ver cuestionario en modo solo lectura (para administradores)
   */
  async verCuestionarioAdmin(cuestionarioId) {
    try {
      // Obtener el cuestionario completo con preguntas y opciones
      const preguntas = await API.getQuizQuestions(cuestionarioId);
      
      if (!preguntas || preguntas.length === 0) {
        this.showError('Este cuestionario no tiene preguntas disponibles');
        return;
      }

      // Obtener información del cuestionario
      const cuestionarios = await API.getCursoCuestionarios(this.currentCurso?.id_curso);
      const cuestionario = cuestionarios.find(q => q.id_cuestionario === cuestionarioId);
      
      if (!cuestionario) {
        this.showError('No se pudo cargar la información del cuestionario');
        return;
      }

      // Crear modal para mostrar el cuestionario en modo solo lectura
      this.mostrarCuestionarioSoloLectura(cuestionario, preguntas);
    } catch (error) {
      console.error('Error al ver cuestionario:', error);
      this.showError('Error al cargar el cuestionario');
    }
  }

  /**
   * Mostrar cuestionario en modo solo lectura
   */
  mostrarCuestionarioSoloLectura(cuestionario, preguntas) {
    // Crear o actualizar modal
    let modal = document.getElementById('modalCuestionarioAdmin');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalCuestionarioAdmin';
      modal.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 md:p-8 my-8 border-2 border-blue-500">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-3xl font-bold text-white mb-2">${this.escapeHtml(cuestionario.titulo || 'Cuestionario')}</h2>
            <p class="text-slate-300">${this.escapeHtml(cuestionario.descripcion || 'Sin descripción')}</p>
            <div class="mt-3 flex items-center gap-4 text-sm text-slate-400">
              <span>Total de preguntas: <strong class="text-white">${preguntas.length}</strong></span>
              ${cuestionario.tiempo_limite ? `<span>Tiempo límite: <strong class="text-white">${cuestionario.tiempo_limite} minutos</strong></span>` : ''}
              <span>Calificación mínima: <strong class="text-white">${cuestionario.calificacion_minima || 60}%</strong></span>
            </div>
          </div>
          <button 
            onclick="document.getElementById('modalCuestionarioAdmin').remove()"
            class="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Cerrar modal">
            <span class="material-symbols-outlined text-white text-2xl">close</span>
          </button>
        </div>

        <div class="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6">
          <p class="text-blue-300 flex items-center gap-2">
            <span class="material-symbols-outlined">info</span>
            <strong>Modo de Inspección:</strong> Estás viendo este cuestionario en modo solo lectura. Las respuestas correctas están marcadas en verde.
          </p>
        </div>

        <div class="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          ${preguntas.map((pregunta, index) => {
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
              <div class="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
                <div class="flex items-start gap-3 mb-4">
                  <span class="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    ${index + 1}
                  </span>
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-white mb-3">
                      ${this.escapeHtml(pregunta.texto_pregunta || pregunta.pregunta || 'Sin texto')}
                    </h3>
                    <div class="space-y-2">
                      ${(opciones || []).map(opcion => {
                        const esCorrecta = opcion.es_correcta === 1 || opcion.es_correcta === true;
                        return `
                          <div class="flex items-center gap-3 p-3 rounded-lg ${
                            esCorrecta 
                              ? 'bg-green-900/50 border-2 border-green-500' 
                              : 'bg-slate-600/50 border border-slate-500'
                          }">
                            <span class="material-symbols-outlined text-xl ${
                              esCorrecta ? 'text-green-400' : 'text-slate-400'
                            }">
                              ${esCorrecta ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span class="flex-1 text-white ${esCorrecta ? 'font-semibold' : ''}">
                              ${this.escapeHtml(opcion.texto_opcion || opcion.opcion || '')}
                            </span>
                            ${esCorrecta ? `
                              <span class="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded">
                                Correcta
                              </span>
                            ` : ''}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="mt-6 flex justify-end">
          <button 
            onclick="document.getElementById('modalCuestionarioAdmin').remove()"
            class="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  async iniciarCuestionario(cuestionarioId) {
    try {
      // Obtener el cuestionario completo con preguntas y opciones
      const preguntas = await API.getQuizQuestions(cuestionarioId);
      
      if (!preguntas || preguntas.length === 0) {
        this.showError('Este cuestionario no tiene preguntas disponibles');
        return;
      }

      // Obtener información del cuestionario
      const cuestionarios = await API.getCursoCuestionarios(this.currentCurso?.id_curso);
      const cuestionario = cuestionarios.find(q => q.id_cuestionario === cuestionarioId);
      
      if (!cuestionario) {
        this.showError('No se pudo cargar la información del cuestionario');
        return;
      }

      // Verificar intentos permitidos
      let intentosInfo = null;
      if (cuestionario.intentos_permitidos > 0) {
        try {
          const intentos = await API.getQuizAttempts(this.alumnoId, cuestionarioId);
          const intentosRealizados = intentos ? intentos.length : 0;
          const intentosRestantes = cuestionario.intentos_permitidos - intentosRealizados;
          
          if (intentosRestantes <= 0) {
            this.showError(`Has alcanzado el límite de intentos (${cuestionario.intentos_permitidos}). No puedes realizar más intentos.`);
            return;
          }
          
          intentosInfo = {
            realizados: intentosRealizados,
            permitidos: cuestionario.intentos_permitidos,
            restantes: intentosRestantes
          };
        } catch (error) {
          console.error('Error al verificar intentos:', error);
        }
      }

      // Mostrar pantalla informativa antes de iniciar
      this.mostrarPantallaInformacionExamen(cuestionario, preguntas, intentosInfo);
      
    } catch (error) {
      console.error('Error al iniciar cuestionario:', error);
      this.showError('Error al cargar el cuestionario. Intenta nuevamente.');
    }
  }

  /**
   * Mostrar pantalla informativa antes de iniciar el examen
   */
  mostrarPantallaInformacionExamen(cuestionario, preguntas, intentosInfo) {
    // Crear o actualizar modal de información
    let modalInfo = document.getElementById('modalInfoExamen');
    if (!modalInfo) {
      modalInfo = document.createElement('div');
      modalInfo.id = 'modalInfoExamen';
      modalInfo.className = 'fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
      document.body.appendChild(modalInfo);
    }

    const tiempoLimite = cuestionario.tiempo_limite || 0;
    const calificacionMinima = cuestionario.calificacion_minima || 60;
    const intentosHtml = intentosInfo 
      ? `<div class="bg-amber-500/20 border border-amber-500 rounded-lg p-4 mb-4">
           <p class="text-amber-300 font-semibold mb-1">Intentos Disponibles</p>
           <p class="text-white">Has realizado <span class="font-bold">${intentosInfo.realizados}</span> de <span class="font-bold">${intentosInfo.permitidos}</span> intentos</p>
           <p class="text-amber-300 mt-1">Intentos restantes: <span class="font-bold">${intentosInfo.restantes}</span></p>
         </div>`
      : '<div class="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-4"><p class="text-blue-300">Intentos ilimitados</p></div>';

    modalInfo.innerHTML = `
      <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 md:p-8 border-2 border-primary mx-2 sm:mx-4">
        <div class="text-center mb-6">
          <div class="text-5xl mb-4">📋</div>
          <h2 class="text-3xl font-bold text-white mb-2">Información del Examen</h2>
          <p class="text-slate-300">${this.escapeHtml(cuestionario.titulo || 'Cuestionario')}</p>
        </div>

        <div class="space-y-4 mb-6">
          ${intentosHtml}
          
          <div class="bg-slate-700/50 rounded-lg p-4">
            <p class="text-slate-300 mb-2"><span class="font-semibold text-white">Total de preguntas:</span> ${preguntas.length}</p>
            ${tiempoLimite > 0 
              ? `<p class="text-slate-300 mb-2"><span class="font-semibold text-white">Tiempo límite:</span> <span class="text-yellow-400 font-bold">${tiempoLimite} minutos</span></p>`
              : '<p class="text-slate-300 mb-2"><span class="font-semibold text-white">Tiempo límite:</span> <span class="text-green-400">Sin límite</span></p>'
            }
            <p class="text-slate-300"><span class="font-semibold text-white">Calificación mínima para aprobar:</span> <span class="text-primary font-bold">${calificacionMinima}%</span></p>
          </div>

          <div class="bg-red-500/20 border-2 border-red-500 rounded-lg p-4">
            <p class="text-red-300 font-semibold mb-2">⚠️ Importante:</p>
            <ul class="text-red-200 text-sm space-y-1 text-left">
              <li>• Una vez iniciado el examen, <strong>NO podrás salir</strong> hasta completarlo o que se agote el tiempo</li>
              <li>• <strong>NO podrás cerrar la pestaña</strong> ni navegar a otras páginas</li>
              <li>• El examen se enviará <strong>automáticamente</strong> cuando se agote el tiempo</li>
              <li>• Si intentas salir, <strong>perderás el intento</strong> y se calificará con las respuestas que tengas</li>
            </ul>
          </div>
        </div>

        <div class="flex gap-4">
          <button 
            onclick="document.getElementById('modalInfoExamen').remove();"
            class="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button 
            onclick="window.app.courses.iniciarExamenBloqueado()"
            class="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
            data-cuestionario='${JSON.stringify(cuestionario)}'
            data-preguntas='${JSON.stringify(preguntas)}'
          >
            Iniciar Examen
          </button>
        </div>
      </div>
    `;

    modalInfo.classList.remove('hidden');
  }

  /**
   * Verificar si hay un examen activo pendiente
   */
  async verificarExamenActivo() {
    try {
      const examenData = localStorage.getItem('examenActivo');
      if (!examenData) return;

      const examen = JSON.parse(examenData);
      
      // Verificar que el examen no haya expirado
      const tiempoTranscurrido = Math.floor((Date.now() - examen.tiempoInicio) / 1000);
      const tiempoLimiteSegundos = (examen.cuestionario.tiempo_limite || 0) * 60;
      
      if (tiempoLimiteSegundos > 0 && tiempoTranscurrido >= tiempoLimiteSegundos) {
        // El examen expiró, finalizarlo automáticamente
        console.log('Examen expirado, finalizando automáticamente...');
        await this.finalizarExamenExpirado(examen);
        localStorage.removeItem('examenActivo');
        return;
      }

      // Restaurar examen activo
      console.log('Examen activo encontrado, restaurando...');
      await this.restaurarExamen(examen);
    } catch (error) {
      console.error('Error al verificar examen activo:', error);
      localStorage.removeItem('examenActivo');
    }
  }

  /**
   * Restaurar examen desde localStorage
   */
  async restaurarExamen(examenData) {
    try {
      // Obtener preguntas actualizadas del servidor
      const preguntas = await API.getQuizQuestions(examenData.cuestionario.id_cuestionario);
      
      if (!preguntas || preguntas.length === 0) {
        console.error('No se pudieron cargar las preguntas del examen');
        localStorage.removeItem('examenActivo');
        return;
      }

      // Ocultar toda la aplicación
      Array.from(document.body.children).forEach(child => {
        if (child.id !== 'examenBloqueado') {
          child.style.display = 'none';
        }
      });

      // Crear contenedor de examen bloqueado
      let examenContainer = document.getElementById('examenBloqueado');
      if (!examenContainer) {
        examenContainer = document.createElement('div');
        examenContainer.id = 'examenBloqueado';
        examenContainer.className = 'fixed inset-0 bg-slate-900 z-[9999] overflow-y-auto';
        document.body.appendChild(examenContainer);
      }

      // Restaurar estado
      examenContainer.dataset.currentQuestion = examenData.currentQuestion || '0';
      examenContainer.dataset.puntaje = examenData.puntaje || '0';
      examenContainer.dataset.respuestas = JSON.stringify(examenData.respuestas || []);
      examenContainer.dataset.tiempoInicio = examenData.tiempoInicio;
      examenContainer.dataset.examenActivo = 'true';

      // Guardar referencias globales
      window.examenContainer = examenContainer;
      window.examenPreguntas = preguntas;
      window.examenCuestionario = examenData.cuestionario;
      window.examenTimerInterval = null;

      // Bloquear navegación
      this.bloquearNavegacionExamen();

      // Calcular tiempo restante
      const tiempoTranscurrido = Math.floor((Date.now() - examenData.tiempoInicio) / 1000);
      const tiempoLimiteSegundos = (examenData.cuestionario.tiempo_limite || 0) * 60;
      const tiempoRestante = Math.max(0, tiempoLimiteSegundos - tiempoTranscurrido);

      // Reiniciar temporizador si hay tiempo límite y aún queda tiempo
      if (examenData.cuestionario.tiempo_limite && examenData.cuestionario.tiempo_limite > 0 && tiempoRestante > 0) {
        this.iniciarTemporizadorExamen(examenContainer, examenData.cuestionario.tiempo_limite, tiempoRestante);
      }

      // Renderizar pregunta actual
      this.renderPreguntaExamen(examenContainer, examenData.cuestionario, preguntas);

      // Mostrar contenedor
      examenContainer.style.display = 'block';
    } catch (error) {
      console.error('Error al restaurar examen:', error);
      localStorage.removeItem('examenActivo');
    }
  }

  /**
   * Finalizar examen expirado
   */
  async finalizarExamenExpirado(examenData) {
    try {
      if (!this.alumnoId) {
        this.loadAlumnoId();
      }

      if (!this.alumnoId) return;

      const porcentaje = Math.round((examenData.puntaje / examenData.totalPreguntas) * 100);
      const aprobado = porcentaje >= (examenData.cuestionario.calificacion_minima || 60);
      const tiempoLimiteSegundos = (examenData.cuestionario.tiempo_limite || 0) * 60;

      const data = {
        puntuacion: porcentaje,
        tiempo_usado: tiempoLimiteSegundos,
        respuestas_json: examenData.respuestas || [],
        aprobado: aprobado
      };

      await API.submitQuizAttempt(this.alumnoId, examenData.cuestionario.id_cuestionario, data);
      console.log('Examen expirado finalizado y guardado');
    } catch (error) {
      console.error('Error al finalizar examen expirado:', error);
    }
  }

  /**
   * Guardar estado del examen en localStorage
   */
  guardarEstadoExamen() {
    const container = document.getElementById('examenBloqueado');
    if (!container || container.dataset.examenActivo !== 'true') return;

    const estado = {
      cuestionario: window.examenCuestionario,
      currentQuestion: parseInt(container.dataset.currentQuestion || '0'),
      puntaje: parseInt(container.dataset.puntaje || '0'),
      respuestas: JSON.parse(container.dataset.respuestas || '[]'),
      tiempoInicio: parseInt(container.dataset.tiempoInicio || Date.now()),
      totalPreguntas: window.examenPreguntas?.length || 0
    };

    localStorage.setItem('examenActivo', JSON.stringify(estado));
  }

  /**
   * Limpiar estado del examen de localStorage
   */
  limpiarEstadoExamen() {
    localStorage.removeItem('examenActivo');
  }

  /**
   * Iniciar examen en modo bloqueado (pantalla completa)
   */
  iniciarExamenBloqueado(event) {
    // Obtener datos del botón que disparó el evento
    const boton = event?.target || event?.currentTarget || document.querySelector('[data-cuestionario]');
    if (!boton) {
      console.error('No se pudo encontrar el botón con los datos del examen');
      return;
    }

    let cuestionario, preguntas;
    try {
      cuestionario = JSON.parse(boton.dataset.cuestionario || '{}');
      preguntas = JSON.parse(boton.dataset.preguntas || '[]');
    } catch (error) {
      console.error('Error al parsear datos del examen:', error);
      this.showError('Error al cargar los datos del examen');
      return;
    }

    if (!cuestionario.id_cuestionario || !preguntas.length) {
      console.error('Datos del examen incompletos');
      this.showError('Error: Datos del examen incompletos');
      return;
    }
    // Cerrar modal de información
    const modalInfo = document.getElementById('modalInfoExamen');
    if (modalInfo) modalInfo.remove();

    // Ocultar toda la aplicación
    const appContainer = document.querySelector('body > *:not(#examenBloqueado)');
    if (appContainer) {
      Array.from(document.body.children).forEach(child => {
        if (child.id !== 'examenBloqueado') {
          child.style.display = 'none';
        }
      });
    }

    // Crear contenedor de examen bloqueado
    let examenContainer = document.getElementById('examenBloqueado');
    if (!examenContainer) {
      examenContainer = document.createElement('div');
      examenContainer.id = 'examenBloqueado';
      examenContainer.className = 'fixed inset-0 bg-slate-900 z-[9999] overflow-y-auto';
      document.body.appendChild(examenContainer);
    }

    // Estado del examen
    const tiempoInicio = Date.now();
    examenContainer.dataset.currentQuestion = '0';
    examenContainer.dataset.puntaje = '0';
    examenContainer.dataset.respuestas = '[]';
    examenContainer.dataset.tiempoInicio = tiempoInicio.toString();
    examenContainer.dataset.examenActivo = 'true';

    // Guardar referencias globales
    window.examenContainer = examenContainer;
    window.examenPreguntas = preguntas;
    window.examenCuestionario = cuestionario;
    window.examenTimerInterval = null;

    // Guardar estado inicial en localStorage
    this.guardarEstadoExamen();

    // Bloquear navegación y cierre
    this.bloquearNavegacionExamen();

    // Iniciar temporizador si hay tiempo límite
    if (cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0) {
      this.iniciarTemporizadorExamen(examenContainer, cuestionario.tiempo_limite);
    }

    // Renderizar primera pregunta
    this.renderPreguntaExamen(examenContainer, cuestionario, preguntas);

    // Mostrar contenedor
    examenContainer.style.display = 'block';
  }

  /**
   * Bloquear navegación durante el examen
   */
  bloquearNavegacionExamen() {
    // Prevenir cierre de pestaña/ventana
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Prevenir navegación con teclado
    document.addEventListener('keydown', this.handleKeyDownExamen);
    
    // Prevenir clic derecho
    document.addEventListener('contextmenu', this.handleContextMenuExamen);
    
    // Prevenir F5, Ctrl+R, etc.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.key === 'R')) {
        e.preventDefault();
        this.mostrarAdvertenciaSalida();
      }
    });
  }

  /**
   * Manejar intento de cerrar pestaña
   */
  handleBeforeUnload = (e) => {
    if (document.getElementById('examenBloqueado')?.dataset.examenActivo === 'true') {
      e.preventDefault();
      e.returnValue = '¿Estás seguro de que quieres salir? Perderás este intento del examen.';
      return e.returnValue;
    }
  }

  /**
   * Manejar teclas durante el examen
   */
  handleKeyDownExamen = (e) => {
    if (document.getElementById('examenBloqueado')?.dataset.examenActivo === 'true') {
      // Permitir solo teclas necesarias para el examen
      const teclasPermitidas = ['Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if (!teclasPermitidas.includes(e.key)) {
          e.preventDefault();
          this.mostrarAdvertenciaSalida();
        }
      }
    }
  }

  /**
   * Manejar clic derecho
   */
  handleContextMenuExamen = (e) => {
    if (document.getElementById('examenBloqueado')?.dataset.examenActivo === 'true') {
      e.preventDefault();
      this.mostrarAdvertenciaSalida();
    }
  }

  /**
   * Mostrar advertencia al intentar salir
   */
  mostrarAdvertenciaSalida() {
    const advertencia = document.createElement('div');
    advertencia.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-[10000] animate-fade-in';
    advertencia.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined">warning</span>
        <span>No puedes salir del examen. Si sales, perderás este intento.</span>
      </div>
    `;
    document.body.appendChild(advertencia);
    setTimeout(() => advertencia.remove(), 3000);
  }

  /**
   * Iniciar temporizador del examen
   */
  iniciarTemporizadorExamen(container, tiempoLimiteMinutos, tiempoRestanteInicial = null) {
    // Limpiar temporizador anterior si existe
    if (window.examenTimerInterval) {
      clearInterval(window.examenTimerInterval);
    }

    const tiempoLimiteSegundos = tiempoLimiteMinutos * 60;
    // Si hay tiempo restante inicial (al restaurar), usarlo; si no, usar el tiempo límite completo
    let tiempoRestante = tiempoRestanteInicial !== null ? tiempoRestanteInicial : tiempoLimiteSegundos;

    const actualizarTemporizador = () => {
      const minutos = Math.floor(tiempoRestante / 60);
      const segundos = tiempoRestante % 60;
      const tiempoFormateado = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      
      const timerElement = document.getElementById('examenTimer');
      if (timerElement) {
        timerElement.textContent = tiempoFormateado;
        
        // Cambiar color cuando queda poco tiempo
        if (tiempoRestante <= 60) {
          timerElement.classList.remove('text-yellow-400');
          timerElement.classList.add('text-red-500', 'animate-pulse', 'font-bold');
        } else if (tiempoRestante <= 300) {
          timerElement.classList.remove('text-white');
          timerElement.classList.add('text-yellow-400', 'font-semibold');
        }
      }

      if (tiempoRestante <= 0) {
        clearInterval(window.examenTimerInterval);
        this.finalizarExamenPorTiempo();
      }

      tiempoRestante--;
    };

    // Actualizar inmediatamente
    actualizarTemporizador();
    
    // Actualizar cada segundo
    window.examenTimerInterval = setInterval(actualizarTemporizador, 1000);
  }

  /**
   * Finalizar examen por tiempo agotado
   */
  async finalizarExamenPorTiempo() {
    const container = document.getElementById('examenBloqueado');
    if (!container || container.dataset.examenActivo !== 'true') return;

    const respuestas = JSON.parse(container.dataset.respuestas || '[]');
    const puntaje = parseInt(container.dataset.puntaje || '0');
    const preguntas = window.examenPreguntas;
    const cuestionario = window.examenCuestionario;
    const tiempoInicio = parseInt(container.dataset.tiempoInicio || Date.now());
    const tiempoUsado = Math.floor((Date.now() - tiempoInicio) / 1000);
    
    // Limpiar estado del examen
    this.limpiarEstadoExamen();
    
    // Guardar resultado
    await this.guardarResultadoExamen(cuestionario, preguntas, respuestas, puntaje, true, tiempoUsado);
    
    // Mostrar resultados y desbloquear
    this.mostrarResultadosExamen(cuestionario, preguntas, puntaje, respuestas, true, tiempoUsado);
    this.desbloquearNavegacionExamen();
  }

  /**
   * Renderizar pregunta del examen
   */
  renderPreguntaExamen(container, cuestionario, preguntas) {
    const currentQuestion = parseInt(container.dataset.currentQuestion || '0');
    const puntaje = parseInt(container.dataset.puntaje || '0');

    if (currentQuestion >= preguntas.length) {
      // Examen completado
      const respuestas = JSON.parse(container.dataset.respuestas || '[]');
      const tiempoInicio = parseInt(container.dataset.tiempoInicio || Date.now());
      const tiempoUsado = Math.floor((Date.now() - tiempoInicio) / 1000);
      
      // Detener temporizador
      if (window.examenTimerInterval) {
        clearInterval(window.examenTimerInterval);
        window.examenTimerInterval = null;
      }

      // Guardar resultado y mostrar resultados
      this.guardarResultadoExamen(cuestionario, preguntas, respuestas, puntaje, false, tiempoUsado)
        .then(() => {
          this.mostrarResultadosExamen(cuestionario, preguntas, puntaje, respuestas, false, tiempoUsado);
          this.desbloquearNavegacionExamen();
        })
        .catch(error => {
          console.error('Error al guardar resultado:', error);
          this.mostrarResultadosExamen(cuestionario, preguntas, puntaje, respuestas, false, tiempoUsado);
          this.desbloquearNavegacionExamen();
        });
      
      return;
    }

    const pregunta = preguntas[currentQuestion];
    const preguntaNum = currentQuestion + 1;
    const progreso = (preguntaNum / preguntas.length) * 100;

    // Mostrar temporizador si existe
    const timerHtml = cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0
      ? `<div class="flex items-center gap-2 text-white">
           <span class="material-symbols-outlined">timer</span>
           <span id="examenTimer" class="font-mono font-bold text-lg">00:00</span>
         </div>`
      : '';

    container.innerHTML = `
      <div class="min-h-screen bg-slate-900">
        <!-- Header fijo -->
        <div class="bg-gradient-to-r from-primary to-blue-600 px-3 sm:px-4 md:px-6 py-3 sm:py-4 sticky top-0 z-10 shadow-lg">
          <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <div class="flex-1 min-w-0">
              <h1 class="text-base sm:text-lg md:text-xl font-bold text-white truncate">${this.escapeHtml(cuestionario.titulo || 'Examen')}</h1>
              <p class="text-blue-100 text-xs sm:text-sm">Pregunta ${preguntaNum} de ${preguntas.length}</p>
            </div>
            ${timerHtml}
          </div>
          <div class="max-w-6xl mx-auto mt-2 sm:mt-3 w-full bg-white/20 rounded-full h-1.5 sm:h-2">
            <div class="bg-white h-1.5 sm:h-2 rounded-full transition-all" style="width: ${progreso}%"></div>
          </div>
        </div>

        <!-- Contenido -->
        <div class="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          <div class="bg-slate-800 rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
            <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4 sm:mb-6 md:mb-8">${this.escapeHtml(pregunta.texto_pregunta)}</h2>
            
            <div class="space-y-2 sm:space-y-3 mb-4 sm:mb-6 md:mb-8" id="opcionesExamen">
              ${pregunta.opciones.map((opcion, index) => `
                <button 
                  onclick="window.app.courses.seleccionarRespuestaExamen(${opcion.id_opcion}, ${opcion.es_correcta ? 'true' : 'false'}, ${currentQuestion})"
                  class="opcion-examen-btn w-full bg-slate-700 hover:bg-slate-600 text-white text-left px-4 sm:px-6 py-3 sm:py-4 rounded-xl flex items-center gap-3 sm:gap-4 transition-all border-2 border-transparent touch-manipulation"
                  data-opcion-id="${opcion.id_opcion}"
                  data-es-correcta="${opcion.es_correcta}"
                >
                  <span class="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-slate-400 flex-shrink-0"></span>
                  <span class="flex-1 text-sm sm:text-base">${this.escapeHtml(opcion.texto_opcion)}</span>
                </button>
              `).join('')}
            </div>

            <div id="feedbackExamen" class="hidden mb-4 p-4 rounded-lg"></div>

            <div class="flex gap-4">
              ${currentQuestion > 0 
                ? `<button 
                     onclick="window.app.courses.anteriorPreguntaExamen()"
                     class="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
                   >
                     Anterior
                   </button>`
                : ''
              }
              <button 
                id="btnSiguienteExamen"
                onclick="window.app.courses.siguientePreguntaExamen()"
                class="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                ${currentQuestion < preguntas.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Examen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Reiniciar temporizador visual si existe
    if (cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0 && window.examenTimerInterval) {
      // El temporizador ya está corriendo
    }
  }

  /**
   * Seleccionar respuesta en el examen
   */
  seleccionarRespuestaExamen(opcionId, esCorrecta, preguntaIndex) {
    const container = document.getElementById('examenBloqueado');
    if (!container) return;

    // Deshabilitar todas las opciones
    const opciones = container.querySelectorAll('.opcion-examen-btn');
    opciones.forEach(btn => {
      btn.disabled = true;
      btn.classList.remove('border-primary', 'border-green-500', 'border-red-500', 'bg-green-900', 'bg-red-900');
    });

    // Marcar la seleccionada
    const seleccionada = container.querySelector(`[data-opcion-id="${opcionId}"]`);
    if (seleccionada) {
      if (esCorrecta) {
        seleccionada.classList.add('border-green-500', 'bg-green-900');
        const circle = seleccionada.querySelector('span:first-child');
        circle.innerHTML = '<span class="material-symbols-outlined text-green-500">check_circle</span>';
      } else {
        seleccionada.classList.add('border-red-500', 'bg-red-900');
        const circle = seleccionada.querySelector('span:first-child');
        circle.innerHTML = '<span class="material-symbols-outlined text-red-500">cancel</span>';
        
        // Resaltar la correcta
        const correcta = container.querySelector('[data-es-correcta="true"]');
        if (correcta) {
          correcta.classList.add('border-green-500', 'bg-green-900');
          const correctCircle = correcta.querySelector('span:first-child');
          correctCircle.innerHTML = '<span class="material-symbols-outlined text-green-500">check_circle</span>';
        }
      }
    }

    // Mostrar feedback
    const feedback = document.getElementById('feedbackExamen');
    if (feedback) {
      feedback.classList.remove('hidden');
      if (esCorrecta) {
        feedback.className = 'mb-4 p-4 rounded-lg bg-green-900/50 border border-green-500';
        feedback.innerHTML = '<p class="text-green-400 font-medium">✓ ¡Correcto!</p>';
      } else {
        feedback.className = 'mb-4 p-4 rounded-lg bg-red-900/50 border border-red-500';
        feedback.innerHTML = '<p class="text-red-400 font-medium">✗ Incorrecto. La respuesta correcta está resaltada.</p>';
      }
    }

    // Actualizar estado
    let puntaje = parseInt(container.dataset.puntaje || '0');
    if (esCorrecta) puntaje++;
    container.dataset.puntaje = puntaje;

    let respuestas = JSON.parse(container.dataset.respuestas || '[]');
    respuestas.push({ opcionId, esCorrecta, preguntaIndex });
    container.dataset.respuestas = JSON.stringify(respuestas);

    // Guardar estado en localStorage
    this.guardarEstadoExamen();

    // Habilitar botón siguiente
    const btnSiguiente = document.getElementById('btnSiguienteExamen');
    if (btnSiguiente) btnSiguiente.disabled = false;
  }

  /**
   * Siguiente pregunta del examen
   */
  siguientePreguntaExamen() {
    const container = document.getElementById('examenBloqueado');
    if (!container || !window.examenPreguntas || !window.examenCuestionario) return;

    let currentQuestion = parseInt(container.dataset.currentQuestion || '0');
    currentQuestion++;
    container.dataset.currentQuestion = currentQuestion;

    // Guardar estado en localStorage
    this.guardarEstadoExamen();

    // Re-renderizar pregunta
    this.renderPreguntaExamen(container, window.examenCuestionario, window.examenPreguntas);
  }

  /**
   * Anterior pregunta del examen
   */
  anteriorPreguntaExamen() {
    const container = document.getElementById('examenBloqueado');
    if (!container || !window.examenPreguntas || !window.examenCuestionario) return;

    let currentQuestion = parseInt(container.dataset.currentQuestion || '0');
    if (currentQuestion > 0) {
      currentQuestion--;
      container.dataset.currentQuestion = currentQuestion;
      
      // Guardar estado en localStorage
      this.guardarEstadoExamen();
      
      this.renderPreguntaExamen(container, window.examenCuestionario, window.examenPreguntas);
    }
  }

  /**
   * Guardar resultado del examen
   */
  async guardarResultadoExamen(cuestionario, preguntas, respuestas, puntaje, tiempoAgotado = false, tiempoUsado = null) {
    try {
      if (!this.alumnoId) {
        this.loadAlumnoId();
      }

      if (!this.alumnoId) {
        console.warn('No se pudo obtener alumnoId para guardar resultado');
        return;
      }

      const porcentaje = Math.round((puntaje / preguntas.length) * 100);
      const aprobado = porcentaje >= (cuestionario.calificacion_minima || 60);

      const data = {
        puntuacion: porcentaje,
        tiempo_usado: tiempoUsado || Math.floor((Date.now() - parseInt(window.examenContainer?.dataset.tiempoInicio || Date.now())) / 1000),
        respuestas_json: respuestas,
        aprobado: aprobado
      };

      await API.submitQuizAttempt(this.alumnoId, cuestionario.id_cuestionario, data);
      console.log('Resultado del examen guardado correctamente');
      
      // Recargar progreso del curso después de completar el examen
      if (this.currentCurso?.id_curso) {
        await this.loadCursoDetalle(this.currentCurso.id_curso);
      }
    } catch (error) {
      console.error('Error al guardar resultado del examen:', error);
      throw error;
    }
  }

  /**
   * Mostrar resultados del examen
   */
  async mostrarResultadosExamen(cuestionario, preguntas, puntaje, respuestas, tiempoAgotado = false, tiempoUsado = null) {
    const container = document.getElementById('examenBloqueado');
    if (!container) return;

    container.dataset.examenActivo = 'false';
    
    // Limpiar estado del examen de localStorage
    this.limpiarEstadoExamen();

    const porcentaje = Math.round((puntaje / preguntas.length) * 100);
    const calificacionMinima = cuestionario.calificacion_minima || 60;
    const aprobado = porcentaje >= calificacionMinima;

    // Obtener información de intentos
    let intentosInfo = '';
    try {
      const intentos = await API.getQuizAttempts(this.alumnoId, cuestionario.id_cuestionario);
      if (intentos && cuestionario.intentos_permitidos > 0) {
        const intentosRestantes = cuestionario.intentos_permitidos - intentos.length;
        intentosInfo = `
          <div class="bg-slate-700/50 rounded-lg p-3 mb-4">
            <p class="text-slate-300 text-sm">
              <span class="font-semibold">Intentos realizados:</span> ${intentos.length} / ${cuestionario.intentos_permitidos}
              ${intentosRestantes > 0 ? `<span class="text-green-400">(${intentosRestantes} restantes)</span>` : '<span class="text-red-400">(Sin intentos restantes)</span>'}
            </p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error al obtener intentos:', error);
    }

    // Formatear tiempo usado
    const tiempoFormateado = tiempoUsado 
      ? `${Math.floor(tiempoUsado / 60)}:${(tiempoUsado % 60).toString().padStart(2, '0')}`
      : 'N/A';

    const tiempoInfo = cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0
      ? `<div class="bg-slate-700/50 rounded-lg p-3 mb-4">
           <p class="text-slate-300 text-sm">
             <span class="font-semibold">Tiempo límite:</span> ${cuestionario.tiempo_limite} minutos
             ${tiempoUsado ? `<span class="ml-4"><span class="font-semibold">Tiempo usado:</span> ${tiempoFormateado}</span>` : ''}
           </p>
         </div>`
      : '';

    const icono = aprobado ? '🎉' : '📝';
    const titulo = aprobado ? '¡Examen Aprobado!' : 'Examen Completado';
    const colorBorde = aprobado ? 'border-green-500' : 'border-yellow-500';
    const colorTexto = aprobado ? 'text-green-400' : 'text-yellow-400';

    container.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-2 sm:p-4 bg-slate-900">
        <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 md:p-8 mx-2 sm:mx-4">
          <div class="text-center">
            <div class="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">${icono}</div>
            <h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">${titulo}</h2>
            ${tiempoAgotado ? '<p class="text-red-400 mb-4">⏰ Tiempo agotado</p>' : ''}
            
            <div class="bg-slate-700 rounded-xl p-6 mb-4 ${colorBorde} border-2">
              <p class="text-4xl font-bold ${colorTexto} mb-2">${puntaje} / ${preguntas.length}</p>
              <p class="text-2xl font-semibold text-white mb-1">${porcentaje}%</p>
              <p class="text-slate-300">${porcentaje >= calificacionMinima ? 'Aprobado' : `No aprobado (Mínimo: ${calificacionMinima}%)`}</p>
            </div>

            ${tiempoInfo}
            ${intentosInfo}

            <div class="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
              <h3 class="text-white font-semibold mb-2">Resumen:</h3>
              <ul class="text-slate-300 text-sm space-y-1">
                <li>• Preguntas correctas: <span class="text-green-400 font-semibold">${puntaje}</span></li>
                <li>• Preguntas incorrectas: <span class="text-red-400 font-semibold">${preguntas.length - puntaje}</span></li>
                <li>• Total de preguntas: ${preguntas.length}</li>
                <li>• Calificación mínima: ${calificacionMinima}%</li>
              </ul>
            </div>

            <button 
              onclick="window.app.courses.cerrarExamen()"
              class="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
            >
              Volver al Curso
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Desbloquear navegación después del examen
   */
  desbloquearNavegacionExamen() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('keydown', this.handleKeyDownExamen);
    document.removeEventListener('contextmenu', this.handleContextMenuExamen);
  }

  /**
   * Cerrar examen y volver al curso
   */
  cerrarExamen() {
    const container = document.getElementById('examenBloqueado');
    if (container) {
      container.remove();
    }

    // Limpiar estado del examen
    this.limpiarEstadoExamen();

    // Mostrar aplicación nuevamente
    Array.from(document.body.children).forEach(child => {
      if (child.id !== 'examenBloqueado') {
        child.style.display = '';
      }
    });

    // Limpiar temporizador
    if (window.examenTimerInterval) {
      clearInterval(window.examenTimerInterval);
      window.examenTimerInterval = null;
    }

    // Desbloquear navegación
    this.desbloquearNavegacionExamen();

    // Recargar página para actualizar progreso
    window.location.reload();
  }

  /**
   * Mostrar quiz en modal (método antiguo - mantener para compatibilidad)
   */
  async mostrarQuizModal(cuestionario, preguntas) {
    // Verificar intentos permitidos
    if (cuestionario.intentos_permitidos > 0) {
      try {
        const intentos = await API.getQuizAttempts(this.alumnoId, cuestionario.id_cuestionario);
        if (intentos && intentos.length >= cuestionario.intentos_permitidos) {
          this.showError(`Has alcanzado el límite de intentos (${cuestionario.intentos_permitidos}). No puedes realizar más intentos.`);
          return;
        }
      } catch (error) {
        console.error('Error al verificar intentos:', error);
      }
    }

    // Crear o actualizar modal
    let modal = document.getElementById('modalQuiz');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalQuiz';
      modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden overflow-y-auto';
      document.body.appendChild(modal);
    }

    // Inicializar estado si no existe
    if (!modal.dataset.currentQuestion) {
      modal.dataset.currentQuestion = '0';
      modal.dataset.puntaje = '0';
      modal.dataset.respuestas = '[]';
      modal.dataset.tiempoInicio = Date.now().toString();
    }

    // Guardar referencias globales
    window.currentQuizModal = modal;
    window.currentQuizPreguntas = preguntas;
    window.currentQuizCuestionario = cuestionario;
    window.quizTimerInterval = null;

    // Renderizar pregunta actual
    this.renderQuizQuestion(modal, cuestionario, preguntas);

    // Iniciar temporizador si hay tiempo límite (después de renderizar para que exista el elemento)
    if (cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0) {
      setTimeout(() => {
        this.iniciarTemporizador(modal, cuestionario.tiempo_limite);
      }, 100);
    }

    // Mostrar modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Iniciar temporizador del quiz
   */
  iniciarTemporizador(modal, tiempoLimiteMinutos) {
    // Limpiar temporizador anterior si existe
    if (window.quizTimerInterval) {
      clearInterval(window.quizTimerInterval);
    }

    const tiempoLimiteSegundos = tiempoLimiteMinutos * 60;
    let tiempoRestante = tiempoLimiteSegundos;

    const actualizarTemporizador = () => {
      const minutos = Math.floor(tiempoRestante / 60);
      const segundos = tiempoRestante % 60;
      const tiempoFormateado = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
      
      const timerElement = document.getElementById('quizTimer');
      if (timerElement) {
        timerElement.textContent = tiempoFormateado;
        
        // Cambiar color cuando queda poco tiempo
        if (tiempoRestante <= 60) {
          timerElement.classList.remove('text-yellow-400');
          timerElement.classList.add('text-red-500', 'animate-pulse');
        } else if (tiempoRestante <= 300) {
          timerElement.classList.remove('text-white');
          timerElement.classList.add('text-yellow-400');
        }
      }

      if (tiempoRestante <= 0) {
        clearInterval(window.quizTimerInterval);
        this.finalizarQuizPorTiempo(modal);
      }

      tiempoRestante--;
    };

    // Actualizar inmediatamente
    actualizarTemporizador();
    
    // Actualizar cada segundo
    window.quizTimerInterval = setInterval(actualizarTemporizador, 1000);
  }

  /**
   * Finalizar quiz por tiempo agotado
   */
  async finalizarQuizPorTiempo(modal) {
    const respuestas = JSON.parse(modal.dataset.respuestas || '[]');
    const puntaje = parseInt(modal.dataset.puntaje || '0');
    const preguntas = window.currentQuizPreguntas;
    const cuestionario = window.currentQuizCuestionario;
    
    // Guardar resultado
    await this.guardarResultadoQuiz(cuestionario, preguntas, respuestas, puntaje, true);
    
    // Mostrar mensaje de tiempo agotado
    this.showError('⏰ Tiempo agotado. El cuestionario se ha finalizado automáticamente.');
    
    // Mostrar resultados
    this.mostrarResultadosQuiz(modal, cuestionario, preguntas, puntaje, respuestas, true);
  }

  /**
   * Renderizar pregunta del quiz
   */
  renderQuizQuestion(modal, cuestionario, preguntas) {
    const currentQuestion = parseInt(modal.dataset.currentQuestion || '0');
    const puntaje = parseInt(modal.dataset.puntaje || '0');

    if (currentQuestion >= preguntas.length) {
      // Quiz completado - guardar y mostrar resultados
      const respuestas = JSON.parse(modal.dataset.respuestas || '[]');
      const tiempoInicio = parseInt(modal.dataset.tiempoInicio || Date.now());
      const tiempoUsado = Math.floor((Date.now() - tiempoInicio) / 1000);
      
      // Detener temporizador
      if (window.quizTimerInterval) {
        clearInterval(window.quizTimerInterval);
        window.quizTimerInterval = null;
      }

      // Guardar resultado y mostrar pantalla de resultados
      this.guardarResultadoQuiz(cuestionario, preguntas, respuestas, puntaje, false, tiempoUsado)
        .then(() => {
          this.mostrarResultadosQuiz(modal, cuestionario, preguntas, puntaje, respuestas, false, tiempoUsado);
        })
        .catch(error => {
          console.error('Error al guardar resultado:', error);
          this.mostrarResultadosQuiz(modal, cuestionario, preguntas, puntaje, respuestas, false, tiempoUsado);
        });
      
      return;
    }

    const pregunta = preguntas[currentQuestion];
    const preguntaNum = currentQuestion + 1;
    const progreso = (preguntaNum / preguntas.length) * 100;

    // Mostrar temporizador si existe
    const timerHtml = cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0
      ? `<div class="flex items-center gap-2 text-white">
           <span class="material-symbols-outlined text-sm">timer</span>
           <span id="quizTimer" class="font-mono font-bold">00:00</span>
         </div>`
      : '';

    modal.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full mx-2 sm:mx-4 p-4 sm:p-6 md:p-8">
          <!-- Header -->
          <div class="bg-gradient-to-r from-primary to-blue-600 px-6 py-4 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <h2 class="text-xl font-bold text-white">${this.escapeHtml(cuestionario.titulo || 'Cuestionario')}</h2>
                <p class="text-blue-100 text-sm">Pregunta ${preguntaNum} de ${preguntas.length}</p>
              </div>
              ${timerHtml}
              <button 
                onclick="document.getElementById('modalQuiz').classList.add('hidden'); document.body.style.overflow = ''; if(window.quizTimerInterval) clearInterval(window.quizTimerInterval);"
                class="p-2 hover:bg-white/20 rounded-lg transition-colors ml-2"
                aria-label="Cerrar"
              >
                <span class="material-symbols-outlined text-white">close</span>
              </button>
            </div>
            <div class="mt-3 w-full bg-white/20 rounded-full h-2">
              <div class="bg-white h-2 rounded-full transition-all" style="width: ${progreso}%"></div>
            </div>
          </div>

          <!-- Contenido -->
          <div class="p-8">
            <h3 class="text-2xl font-bold text-white mb-6">${this.escapeHtml(pregunta.texto_pregunta)}</h3>
            
            <div class="space-y-3 mb-6" id="opcionesQuiz">
              ${pregunta.opciones.map((opcion, index) => `
                <button 
                  onclick="window.app.courses.seleccionarRespuestaQuiz(${opcion.id_opcion}, ${opcion.es_correcta ? 'true' : 'false'}, ${currentQuestion})"
                  class="opcion-quiz-btn w-full bg-slate-700 hover:bg-slate-600 text-white text-left px-6 py-4 rounded-xl flex items-center gap-4 transition-all border-2 border-transparent"
                  data-opcion-id="${opcion.id_opcion}"
                  data-es-correcta="${opcion.es_correcta}"
                >
                  <span class="w-6 h-6 rounded-full border-2 border-slate-400 flex-shrink-0"></span>
                  <span>${this.escapeHtml(opcion.texto_opcion)}</span>
                </button>
              `).join('')}
            </div>

            <div id="feedbackQuiz" class="hidden mb-4 p-4 rounded-lg"></div>

            <button 
              id="btnSiguienteQuiz"
              onclick="window.app.courses.siguientePreguntaQuiz()"
              class="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled
            >
              ${currentQuestion < preguntas.length - 1 ? 'Siguiente Pregunta' : 'Finalizar Cuestionario'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Seleccionar respuesta en el quiz
   */
  seleccionarRespuestaQuiz(opcionId, esCorrecta, preguntaIndex) {
    const modal = document.getElementById('modalQuiz');
    if (!modal) return;

    // Deshabilitar todas las opciones
    const opciones = modal.querySelectorAll('.opcion-quiz-btn');
    opciones.forEach(btn => {
      btn.disabled = true;
      btn.classList.remove('border-primary', 'border-green-500', 'border-red-500', 'bg-green-900', 'bg-red-900');
    });

    // Marcar la seleccionada
    const seleccionada = modal.querySelector(`[data-opcion-id="${opcionId}"]`);
    if (seleccionada) {
      if (esCorrecta) {
        seleccionada.classList.add('border-green-500', 'bg-green-900');
        const circle = seleccionada.querySelector('span:first-child');
        circle.innerHTML = '<span class="material-symbols-outlined text-green-500">check_circle</span>';
      } else {
        seleccionada.classList.add('border-red-500', 'bg-red-900');
        const circle = seleccionada.querySelector('span:first-child');
        circle.innerHTML = '<span class="material-symbols-outlined text-red-500">cancel</span>';
        
        // Resaltar la correcta
        const correcta = modal.querySelector('[data-es-correcta="true"]');
        if (correcta) {
          correcta.classList.add('border-green-500', 'bg-green-900');
          const correctCircle = correcta.querySelector('span:first-child');
          correctCircle.innerHTML = '<span class="material-symbols-outlined text-green-500">check_circle</span>';
        }
      }
    }

    // Mostrar feedback
    const feedback = document.getElementById('feedbackQuiz');
    if (feedback) {
      feedback.classList.remove('hidden');
      if (esCorrecta) {
        feedback.className = 'mb-4 p-4 rounded-lg bg-green-900/50 border border-green-500';
        feedback.innerHTML = '<p class="text-green-400 font-medium">✓ ¡Correcto!</p>';
      } else {
        feedback.className = 'mb-4 p-4 rounded-lg bg-red-900/50 border border-red-500';
        feedback.innerHTML = '<p class="text-red-400 font-medium">✗ Incorrecto. La respuesta correcta está resaltada.</p>';
      }
    }

    // Actualizar estado
    let puntaje = parseInt(modal.dataset.puntaje || '0');
    if (esCorrecta) puntaje++;
    modal.dataset.puntaje = puntaje;

    let respuestas = JSON.parse(modal.dataset.respuestas || '[]');
    respuestas.push({ opcionId, esCorrecta, preguntaIndex });
    modal.dataset.respuestas = JSON.stringify(respuestas);

    // Habilitar botón siguiente
    const btnSiguiente = document.getElementById('btnSiguienteQuiz');
    if (btnSiguiente) btnSiguiente.disabled = false;
  }

  /**
   * Siguiente pregunta del quiz
   */
  siguientePreguntaQuiz() {
    const modal = document.getElementById('modalQuiz');
    if (!modal || !window.currentQuizPreguntas || !window.currentQuizCuestionario) return;

    let currentQuestion = parseInt(modal.dataset.currentQuestion || '0');
    currentQuestion++;
    modal.dataset.currentQuestion = currentQuestion;

    // Re-renderizar pregunta
    this.renderQuizQuestion(modal, window.currentQuizCuestionario, window.currentQuizPreguntas);
    
    // Reiniciar temporizador visual si existe
    if (window.currentQuizCuestionario.tiempo_limite && window.currentQuizCuestionario.tiempo_limite > 0) {
      // El temporizador ya está corriendo, solo actualizar visual
    }
  }

  /**
   * Guardar resultado del quiz en la base de datos
   */
  async guardarResultadoQuiz(cuestionario, preguntas, respuestas, puntaje, tiempoAgotado = false, tiempoUsado = null) {
    try {
      if (!this.alumnoId) {
        this.loadAlumnoId();
      }

      if (!this.alumnoId) {
        console.warn('No se pudo obtener alumnoId para guardar resultado');
        return;
      }

      const porcentaje = Math.round((puntaje / preguntas.length) * 100);
      const aprobado = porcentaje >= (cuestionario.calificacion_minima || 60);

      const data = {
        puntuacion: porcentaje,
        tiempo_usado: tiempoUsado || Math.floor((Date.now() - parseInt(window.currentQuizModal?.dataset.tiempoInicio || Date.now())) / 1000),
        respuestas_json: respuestas,
        aprobado: aprobado
      };

      await API.submitQuizAttempt(this.alumnoId, cuestionario.id_cuestionario, data);
      console.log('Resultado del quiz guardado correctamente');
    } catch (error) {
      console.error('Error al guardar resultado del quiz:', error);
      throw error;
    }
  }

  /**
   * Mostrar resultados del quiz
   */
  async mostrarResultadosQuiz(modal, cuestionario, preguntas, puntaje, respuestas, tiempoAgotado = false, tiempoUsado = null) {
    const porcentaje = Math.round((puntaje / preguntas.length) * 100);
    const calificacionMinima = cuestionario.calificacion_minima || 60;
    const aprobado = porcentaje >= calificacionMinima;

    // Obtener información de intentos
    let intentosInfo = '';
    try {
      const intentos = await API.getQuizAttempts(this.alumnoId, cuestionario.id_cuestionario);
      if (intentos && cuestionario.intentos_permitidos > 0) {
        const intentosRestantes = cuestionario.intentos_permitidos - intentos.length;
        intentosInfo = `
          <div class="bg-slate-700/50 rounded-lg p-3 mb-4">
            <p class="text-slate-300 text-sm">
              <span class="font-semibold">Intentos realizados:</span> ${intentos.length} / ${cuestionario.intentos_permitidos}
              ${intentosRestantes > 0 ? `<span class="text-green-400">(${intentosRestantes} restantes)</span>` : '<span class="text-red-400">(Sin intentos restantes)</span>'}
            </p>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error al obtener intentos:', error);
    }

    // Formatear tiempo usado
    const tiempoFormateado = tiempoUsado 
      ? `${Math.floor(tiempoUsado / 60)}:${(tiempoUsado % 60).toString().padStart(2, '0')}`
      : 'N/A';

    // Información del tiempo límite
    const tiempoInfo = cuestionario.tiempo_limite && cuestionario.tiempo_limite > 0
      ? `<div class="bg-slate-700/50 rounded-lg p-3 mb-4">
           <p class="text-slate-300 text-sm">
             <span class="font-semibold">Tiempo límite:</span> ${cuestionario.tiempo_limite} minutos
             ${tiempoUsado ? `<span class="ml-4"><span class="font-semibold">Tiempo usado:</span> ${tiempoFormateado}</span>` : ''}
           </p>
         </div>`
      : '';

    const icono = aprobado ? '🎉' : '📝';
    const titulo = aprobado ? '¡Cuestionario Aprobado!' : 'Cuestionario Completado';
    const colorBorde = aprobado ? 'border-green-500' : 'border-yellow-500';
    const colorTexto = aprobado ? 'text-green-400' : 'text-yellow-400';

    modal.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
          <div class="text-center">
            <div class="text-6xl mb-4">${icono}</div>
            <h2 class="text-3xl font-bold text-white mb-2">${titulo}</h2>
            ${tiempoAgotado ? '<p class="text-red-400 mb-4">⏰ Tiempo agotado</p>' : ''}
            
            <div class="bg-slate-700 rounded-xl p-6 mb-4 ${colorBorde} border-2">
              <p class="text-4xl font-bold ${colorTexto} mb-2">${puntaje} / ${preguntas.length}</p>
              <p class="text-2xl font-semibold text-white mb-1">${porcentaje}%</p>
              <p class="text-slate-300">${porcentaje >= calificacionMinima ? 'Aprobado' : `No aprobado (Mínimo: ${calificacionMinima}%)`}</p>
            </div>

            ${tiempoInfo}
            ${intentosInfo}

            <div class="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
              <h3 class="text-white font-semibold mb-2">Resumen:</h3>
              <ul class="text-slate-300 text-sm space-y-1">
                <li>• Preguntas correctas: <span class="text-green-400 font-semibold">${puntaje}</span></li>
                <li>• Preguntas incorrectas: <span class="text-red-400 font-semibold">${preguntas.length - puntaje}</span></li>
                <li>• Total de preguntas: ${preguntas.length}</li>
                <li>• Calificación mínima: ${calificacionMinima}%</li>
              </ul>
            </div>

            <button 
              onclick="document.getElementById('modalQuiz').classList.add('hidden'); document.body.style.overflow = ''; if(window.quizTimerInterval) clearInterval(window.quizTimerInterval); window.location.reload();"
              class="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
            >
              Cerrar y Actualizar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  showSuccess(message) {
    showNotification(message, 'success');
  }

  descargarRecurso(recursoId) {
    // Por ahora solo mostrar alerta
    alert(`Descargando recurso ID: ${recursoId}`);
    
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar('Descarga iniciada');
    }
  }

  showError(message) {
    console.error(message);
    showNotification(message, 'error');
    
    // Anunciar al lector de pantalla si está activo
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(message);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Formatear texto de lección para mejor presentación
   */
  formatearTextoLeccion(texto) {
    if (!texto) return '<p class="text-slate-500 dark:text-slate-400 italic">No hay contenido disponible.</p>';
    
    // Escapar HTML primero
    const textoEscapado = this.escapeHtml(texto);
    
    // Dividir por párrafos (doble salto de línea)
    const parrafos = textoEscapado.split(/\n\s*\n/).filter(p => p.trim());
    
    if (parrafos.length === 0) {
      // Si no hay párrafos, dividir por saltos de línea simples
      const lineas = textoEscapado.split('\n').filter(l => l.trim());
      return lineas.map(linea => `<p class="mb-4">${linea}</p>`).join('');
    }
    
    // Formatear cada párrafo
    return parrafos.map(parrafo => {
      const parrafoLimpio = parrafo.trim();
      
      // Detectar si es un título (línea corta, sin punto final, o con números)
      if (parrafoLimpio.length < 80 && !parrafoLimpio.includes('.') && !parrafoLimpio.match(/^[0-9]/)) {
        return `<h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-4 mt-6 first:mt-0">${parrafoLimpio}</h3>`;
      }
      
      // Detectar listas
      if (parrafoLimpio.includes('•') || parrafoLimpio.match(/^\d+[\.\)]/)) {
        const items = parrafoLimpio.split(/[•\n]/).filter(i => i.trim());
        if (items.length > 1) {
          return `<ul class="list-disc list-inside space-y-2 mb-4 text-slate-700 dark:text-slate-300">${items.map(item => `<li>${item.trim()}</li>`).join('')}</ul>`;
        }
      }
      
      // Párrafo normal
      return `<p class="mb-4 leading-7 text-slate-700 dark:text-slate-200">${parrafoLimpio}</p>`;
    }).join('');
  }

  // Obtener curso actual
  getCurrentCurso() {
    if (!this.currentCurso) {
      const stored = sessionStorage.getItem('currentCurso');
      if (stored) {
        this.currentCurso = JSON.parse(stored);
      }
    }
    return this.currentCurso;
  }

  /**
   * Mostrar contenido completo en modal
   */
  verContenidoCompleto(contenidoId, event) {
    // Obtener datos del botón clickeado
    let titulo = 'Contenido';
    let texto = '';
    let tipo = 'lectura';
    let url = '';
    
    if (event && event.target) {
      const button = event.target.closest('button');
      if (button) {
        titulo = button.dataset.titulo || titulo;
        texto = button.dataset.texto || texto;
        tipo = button.dataset.tipo || tipo;
        url = button.dataset.url || url;
        contenidoId = button.dataset.contenidoId || contenidoId;
      }
    }
    
    // Si no hay texto, mostrar mensaje
    if (!texto || texto.trim() === '') {
      texto = 'No hay contenido disponible para esta lección.';
    }
    
    // Crear modal si no existe
    let modal = document.getElementById('modalContenidoCompleto');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalContenidoCompleto';
      modal.className = 'fixed inset-0 bg-slate-900 z-50 overflow-hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'modalContenidoTitulo');
      document.body.appendChild(modal);
    }

    // Formatear el texto para mejor legibilidad
    const textoFormateado = this.formatearTextoLeccion(texto);
    const docenteNombre = this.currentCurso?.docente || 'Docente';
    
    modal.innerHTML = `
      <div class="h-screen flex flex-col bg-slate-900">
        <!-- Header -->
        <header class="bg-slate-800 border-b border-slate-700 px-6 py-4 flex-shrink-0">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-6">
            <div class="flex items-center gap-4">
              <button 
                onclick="document.getElementById('modalContenidoCompleto').classList.add('hidden'); document.body.style.overflow = '';" 
                class="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Volver al curso"
              >
                <span class="material-symbols-outlined">arrow_back</span>
                <span class="font-medium">Volver al curso</span>
              </button>
              <div class="h-8 w-px bg-slate-600"></div>
              <div>
                <h1 id="modalContenidoTitulo" class="text-xl font-bold text-white">${this.escapeHtml(titulo)}</h1>
                <p class="text-sm text-slate-400">${this.escapeHtml(docenteNombre)}</p>
              </div>
            </div>
            <button 
              onclick="document.getElementById('modalContenidoCompleto').classList.add('hidden'); document.body.style.overflow = '';" 
              class="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Cerrar modal"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        <!-- Content Area - Dos columnas -->
        <div class="flex-1 overflow-hidden flex">
          <!-- Columna Izquierda: Media Player / Contenido Principal -->
          <div class="flex-1 bg-black flex items-center justify-center p-8 overflow-y-auto">
            ${tipo === 'video' && url ? `
              <div class="w-full max-w-5xl space-y-4">
                <div class="relative aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
                  <video 
                    id="leccionVideo" 
                    class="w-full h-full"
                    controls
                    controlsList="nodownload"
                  >
                    <source src="${url}" type="video/mp4">
                    Su navegador no soporta el elemento de video.
                    <track kind="subtitles" src="" srclang="es" label="Español">
                  </video>
                </div>
                <!-- Contenedor para transcripción -->
                <div id="transcriptionContainer" class="hidden">
                  <!-- Se llenará dinámicamente -->
                </div>
                <!-- Botones de control -->
                <div class="flex gap-2 justify-center">
                  <button onclick="if(window.app?.mediaPlayer) window.app.mediaPlayer.toggleTranscription(); else alert('Cargando reproductor...')" 
                          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors">
                    <span class="material-symbols-outlined">subtitles</span>
                    <span>Mostrar Transcripción</span>
                  </button>
                  <button onclick="if(window.app?.mediaPlayer) window.app.mediaPlayer.toggleCaptions(); else alert('Cargando reproductor...')" 
                          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                    <span class="material-symbols-outlined">closed_caption</span>
                    <span>Subtítulos</span>
                  </button>
                </div>
              </div>
            ` : tipo === 'audio' && url ? `
              <div class="w-full max-w-2xl mx-2 sm:mx-4 space-y-4">
                <div class="bg-gradient-to-br from-primary/20 to-blue-900/20 rounded-2xl p-12 text-center">
                  <div class="w-32 h-32 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-6xl text-primary">headphones</span>
                  </div>
                  <h3 class="text-2xl font-bold text-white mb-2">${this.escapeHtml(titulo)}</h3>
                  <p class="text-slate-400 mb-8">${this.escapeHtml(docenteNombre)}</p>
                  <audio 
                    id="leccionAudio" 
                    class="w-full"
                    controls
                    controlsList="nodownload"
                  >
                    <source src="${url}" type="audio/mpeg">
                    Su navegador no soporta el elemento de audio.
                  </audio>
                </div>
                <!-- Contenedor para transcripción -->
                <div id="transcriptionContainer" class="hidden">
                  <!-- Se llenará dinámicamente -->
                </div>
                <!-- Botón para mostrar transcripción -->
                <div class="flex justify-center">
                  <button onclick="window.app.mediaPlayer.toggleTranscription()" 
                          class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors">
                    <span class="material-symbols-outlined">subtitles</span>
                    <span>Mostrar Transcripción</span>
                  </button>
                </div>
              </div>
            ` : `
              <div class="w-full max-w-4xl mx-2 sm:mx-4">
                <div class="bg-slate-800 rounded-2xl p-6 sm:p-8 md:p-12 shadow-2xl">
                  <div class="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-primary/20 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-4xl sm:text-5xl text-primary">menu_book</span>
                  </div>
                  <div class="prose prose-invert prose-sm sm:prose-base md:prose-lg max-w-none text-center">
                    <div class="text-slate-300 leading-relaxed text-sm sm:text-base">
                      ${textoFormateado}
                    </div>
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- Columna Derecha: Transcripción / Contenido de texto -->
          <aside class="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto flex-shrink-0">
            <div class="p-6">
              <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">description</span>
                ${tipo === 'video' || tipo === 'audio' ? 'Transcripción' : 'Contenido'}
              </h2>
              <div class="text-slate-300 space-y-4 leading-relaxed">
                ${textoFormateado || '<p class="text-slate-400 italic">No hay contenido disponible.</p>'}
              </div>
              
              ${this.usuarioLogueado && this.esAlumno() ? `
                <div class="mt-8 pt-6 border-t border-slate-700">
                  <button 
                    onclick="window.app.courses.marcarComoCompletado('${contenidoId}'); document.getElementById('modalContenidoCompleto').classList.add('hidden'); document.body.style.overflow = '';" 
                    class="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label="Marcar lección como completada"
                  >
                    <span class="material-symbols-outlined">check_circle</span>
                    Marcar como Completado
                  </button>
                </div>
              ` : ''}
            </div>
          </aside>
        </div>
      </div>
    `;

    // Mostrar modal y bloquear scroll del body
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Anunciar apertura del modal para lectores de pantalla
    if (window.app && window.app.screenReader && (window.app.screenReader.active || window.app.screenReader.activo)) {
      if (window.app.screenReader.speak) {
        window.app.screenReader.speak(`Lector inmersivo abierto: ${titulo}. Contenido completo disponible.`);
      }
    }

    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Inicializar controles de audio personalizados
   */
  inicializarControlesAudio() {
    const audio = document.getElementById('leccionAudio');
    if (!audio) return;

    const btnPlayPause = document.getElementById('btnPlayPauseAudio');
    const iconoPlayPause = document.getElementById('iconoPlayPause');
    const progresoAudio = document.getElementById('progresoAudio');
    const barraProgresoAudio = document.getElementById('barraProgresoAudio');
    const tiempoActualAudio = document.getElementById('tiempoActualAudio');
    const tiempoTotalAudio = document.getElementById('tiempoTotalAudio');

    // Actualizar tiempo total
    audio.addEventListener('loadedmetadata', () => {
      const minutos = Math.floor(audio.duration / 60);
      const segundos = Math.floor(audio.duration % 60);
      tiempoTotalAudio.textContent = `${minutos}:${segundos.toString().padStart(2, '0')}`;
    });

    // Actualizar progreso
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        const porcentaje = (audio.currentTime / audio.duration) * 100;
        progresoAudio.style.width = `${porcentaje}%`;
        
        const minutos = Math.floor(audio.currentTime / 60);
        const segundos = Math.floor(audio.currentTime % 60);
        tiempoActualAudio.textContent = `${minutos}:${segundos.toString().padStart(2, '0')}`;
      }
    });

    // Click en barra de progreso
    if (barraProgresoAudio) {
      barraProgresoAudio.addEventListener('click', (e) => {
        const rect = barraProgresoAudio.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const porcentaje = clickX / rect.width;
        audio.currentTime = porcentaje * audio.duration;
      });
    }

    // Botón play/pause
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => {
        if (audio.paused) {
          audio.play();
          iconoPlayPause.textContent = 'pause';
        } else {
          audio.pause();
          iconoPlayPause.textContent = 'play_arrow';
        }
      });
    }

    // Botón reiniciar
    const btnReiniciar = document.getElementById('btnReiniciarAudio');
    if (btnReiniciar) {
      btnReiniciar.addEventListener('click', () => {
        audio.currentTime = 0;
        audio.play();
        if (iconoPlayPause) {
          iconoPlayPause.textContent = 'pause';
        }
      });
    }

    // Actualizar icono cuando termine
    audio.addEventListener('ended', () => {
      if (iconoPlayPause) {
        iconoPlayPause.textContent = 'play_arrow';
      }
    });
  }

  /**
   * Marcar lección como completada (nuevo sistema de secciones)
   */
  async marcarLeccionCompletada(leccionId) {
    try {
      if (!this.alumnoId) {
        this.loadAlumnoId();
      }
      
      if (!this.alumnoId) {
        const { showNotification } = await import('../utils/helpers.js');
        showNotification('Debes estar inscrito como alumno', 'warning');
        return;
      }

      // Convertir leccionId a número si viene como string
      const leccionIdNum = parseInt(leccionId, 10);
      if (isNaN(leccionIdNum)) {
        throw new Error(`ID de lección inválido: ${leccionId}`);
      }

      console.log('[DEBUG] Marcando lección como completada:', {
        alumnoId: this.alumnoId,
        leccionId: leccionIdNum
      });

      // Actualizar progreso en el backend
      await API.updateLessonProgress(this.alumnoId, {
        leccion_id: leccionIdNum,
        completada: true,
        tiempo_visto: 0
      });

      // Mostrar notificación
      const { showNotification } = await import('../utils/helpers.js');
      showNotification('¡Lección completada! 🎉', 'success');

      // Verificar logros relacionados
      if (window.app?.achievements && this.alumnoId) {
        // Verificar logro de "rápido" si se completó en menos de 5 minutos
        // (esto se puede mejorar con tracking de tiempo real)
        try {
          await window.app.achievements.verificarYDesbloquearLogro('rapido', this.alumnoId);
        } catch (e) {
          console.log('No se pudo verificar logro rápido:', e);
        }
      }

      // Esperar un momento para que la base de datos se actualice
      await new Promise(resolve => setTimeout(resolve, 500));

      // Recargar detalles del curso para actualizar el estado
      if (this.currentCurso && this.currentCurso.id_curso) {
        console.log('[DEBUG] Recargando curso después de marcar como completada...');
        await this.loadCursoRecursos(this.currentCurso.id_curso);
      }
    } catch (error) {
      console.error('Error al marcar lección como completada:', error);
      const { showNotification } = await import('../utils/helpers.js');
      showNotification(`Error al marcar la lección como completada: ${error.message}`, 'error');
      throw error; // Re-lanzar para que el caller pueda manejarlo
    }
  }

  /**
   * Marcar contenido como completado (sistema antiguo)
   */
  async marcarComoCompletado(contenidoId) {
    try {
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      
      if (!usuario.id_alumno) {
        import('../utils/helpers.js').then(({ showNotification }) => {
          showNotification('Debes estar inscrito como alumno', 'warning');
        });
        return;
      }

      // Actualizar progreso en el backend
      // Por ahora simular
      console.log(`Marcando contenido ${contenidoId} como completado para alumno ${usuario.id_alumno}`);

      // Mostrar notificación
      import('../utils/helpers.js').then(({ showNotification }) => {
        showNotification('¡Lección completada! 🎉', 'success');
      });

      // Recargar progreso del curso
      if (this.currentCurso) {
        await this.loadCursoDetalle(this.currentCurso.id_curso);
      }
    } catch (error) {
      console.error('Error al marcar como completado:', error);
      import('../utils/helpers.js').then(({ showNotification }) => {
        showNotification('Error al actualizar progreso', 'error');
      });
    }
  }

  /**
   * Verificar si el usuario es alumno
   */
  esAlumno() {
    try {
      // Intentar obtener de la sesión principal
      const sessionData = localStorage.getItem('eduVisionSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.user && session.user.rol === 'alumno') {
          return true;
        }
      }
      // Fallback al método anterior
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
      return usuario.rol === 'alumno';
    } catch (error) {
      console.error('Error al verificar rol:', error);
      return false;
    }
  }

  /**
   * Verificar si ya existe una encuesta para este curso
   */
  async verificarEncuestaExistente(cursoId) {
    try {
      // Esperar un momento para asegurar que el DOM esté listo
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!this.alumnoId) {
        this.loadAlumnoId();
      }
      
      if (!this.alumnoId || !this.esAlumno()) {
        // Si no es alumno, ocultar el botón de encuesta
        console.log('No es alumno o no hay alumnoId, ocultando encuesta');
        this.ocultarEncuesta();
        return;
      }

      console.log(`Verificando encuesta para curso ${cursoId} y alumno ${this.alumnoId}`);

      // Buscar encuestas existentes para este curso y alumno
      const encuestas = await API.getEncuestas({
        curso_id: parseInt(cursoId),
        alumno_id: parseInt(this.alumnoId)
      });

      console.log('Encuestas encontradas:', encuestas);

      // Si ya existe una encuesta, ocultar el botón
      if (encuestas && Array.isArray(encuestas) && encuestas.length > 0) {
        console.log('Encuesta ya existe, ocultando botón');
        this.ocultarEncuesta();
      } else {
        console.log('No hay encuesta, mostrando botón');
        this.mostrarEncuesta();
      }
    } catch (error) {
      console.error('Error al verificar encuesta:', error);
      // En caso de error, mostrar el botón por defecto (mejor mostrar que ocultar)
      this.mostrarEncuesta();
    }
  }

  /**
   * Ocultar el botón de encuesta
   */
  ocultarEncuesta() {
    // Ocultar el contenedor completo usando el ID
    const contenedorEncuesta = document.getElementById('contenedorEncuesta');
    if (contenedorEncuesta) {
      contenedorEncuesta.style.display = 'none';
      contenedorEncuesta.classList.add('hidden');
      console.log('✅ Contenedor de encuesta ocultado');
    } else {
      console.warn('⚠️ No se encontró el contenedor de encuesta');
    }
  }

  /**
   * Mostrar el botón de encuesta
   */
  mostrarEncuesta() {
    // Mostrar el contenedor completo usando el ID
    const contenedorEncuesta = document.getElementById('contenedorEncuesta');
    if (contenedorEncuesta) {
      contenedorEncuesta.style.display = '';
      contenedorEncuesta.classList.remove('hidden');
      console.log('✅ Contenedor de encuesta mostrado');
    } else {
      console.warn('⚠️ No se encontró el contenedor de encuesta');
    }
  }

  /**
   * Obtener todas las lecciones del curso en orden
   */
  obtenerTodasLeccionesOrdenadas() {
    if (!this.currentCurso) return [];
    
    // Intentar obtener desde secciones si están disponibles
    const secciones = this.seccionesActuales || [];
    const todasLecciones = [];
    
    secciones.forEach(seccion => {
      if (seccion.lecciones && seccion.lecciones.length > 0) {
        seccion.lecciones.forEach(leccion => {
          todasLecciones.push({
            ...leccion,
            seccionTitulo: seccion.titulo,
            seccionId: seccion.id_seccion
          });
        });
      }
    });
    
    // Si no hay secciones, intentar obtener desde el contenido antiguo
    if (todasLecciones.length === 0 && this.contenidoActual) {
      this.contenidoActual.forEach((item, index) => {
        todasLecciones.push({
          id_leccion: item.id_contenido || index,
          titulo: item.seccion || `Lección ${index + 1}`,
          contenido: item.texto,
          descripcion: item.texto,
          tipo: item.tipo || 'lectura',
          url_recurso: item.url
        });
      });
    }
    
    return todasLecciones;
  }

  /**
   * Obtener siguiente lección
   */
  obtenerSiguienteLeccion(leccionIdActual) {
    const todasLecciones = this.obtenerTodasLeccionesOrdenadas();
    
    console.log('[DEBUG] Buscando siguiente lección para:', leccionIdActual);
    console.log('[DEBUG] Todas las lecciones disponibles:', todasLecciones.length);
    
    if (todasLecciones.length === 0) {
      console.log('[DEBUG] No hay lecciones disponibles');
      return null;
    }
    
    // Buscar por id_leccion, id_contenido, o por índice
    let indiceActual = todasLecciones.findIndex(l => {
      const idLeccion = l.id_leccion || l.id_contenido;
      return idLeccion == leccionIdActual || 
             idLeccion == String(leccionIdActual) ||
             String(idLeccion) == String(leccionIdActual);
    });
    
    // Si no se encuentra, intentar buscar directamente en contenido actual
    if (indiceActual === -1 && this.contenidoActual && this.contenidoActual.length > 0) {
      console.log('[DEBUG] Buscando en contenido actual...');
      for (let i = 0; i < this.contenidoActual.length; i++) {
        const item = this.contenidoActual[i];
        const itemId = item.id_contenido || i;
        if (itemId == leccionIdActual || String(itemId) == String(leccionIdActual)) {
          // Encontrar en todasLecciones usando el mismo índice
          indiceActual = todasLecciones.findIndex(l => {
            const lId = l.id_leccion || l.id_contenido || l.titulo;
            return lId == itemId || l.titulo === item.seccion;
          });
          if (indiceActual === -1) {
            // Si no se encuentra, usar el índice del contenido actual
            indiceActual = i;
          }
          break;
        }
      }
    }
    
    console.log('[DEBUG] Índice actual encontrado:', indiceActual, 'de', todasLecciones.length);
    
    if (indiceActual >= 0 && indiceActual < todasLecciones.length - 1) {
      const siguiente = todasLecciones[indiceActual + 1];
      console.log('[DEBUG] Siguiente lección encontrada:', siguiente);
      return siguiente;
    }
    
    console.log('[DEBUG] No hay siguiente lección');
    return null;
  }

  /**
   * Mostrar lección en modal (modo inmersivo completo)
   */
  async mostrarLeccionModal(leccion) {
    // Crear o actualizar modal
    let modal = document.getElementById('modalLeccionInmersiva');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modalLeccionInmersiva';
      modal.className = 'fixed inset-0 bg-slate-900 z-50 overflow-hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      document.body.appendChild(modal);
    }

    const { titulo, texto, tipo, url, id, leccionId } = leccion;
    const textoFormateado = this.formatearTextoLeccion(texto || 'No hay contenido disponible.');
    const docenteNombre = this.currentCurso?.docente || 'Docente';
    const nombreCurso = this.currentCurso?.titulo || this.currentCurso?.nombre || 'Curso';
    
    // Verificar si la lección está completada
    let estaCompletada = false;
    if (this.alumnoId && leccionId) {
      try {
        const progreso = await API.getLeccionProgreso(this.alumnoId, leccionId);
        estaCompletada = progreso && (
          progreso.completada === true || 
          progreso.completada === 1 || 
          progreso.completada === 'true' ||
          (progreso.completada !== undefined && progreso.completada !== false && progreso.completada !== 0 && progreso.completada !== 'false')
        );
        console.log('[DEBUG] Progreso de lección en modal:', progreso, 'Completada:', estaCompletada);
      } catch (error) {
        console.warn('[DEBUG] No se pudo obtener progreso de lección:', error);
      }
    }
    
    // Obtener siguiente lección - intentar con leccionId o id
    const idLeccionParaBuscar = leccionId || id;
    let siguienteLeccion = null;
    
    if (idLeccionParaBuscar) {
      siguienteLeccion = this.obtenerSiguienteLeccion(idLeccionParaBuscar);
    }
    
    // Si no se encontró, intentar buscar manualmente en las secciones
    if (!siguienteLeccion && this.seccionesActuales && this.seccionesActuales.length > 0) {
      let encontrado = false;
      for (const seccion of this.seccionesActuales) {
        if (seccion.lecciones && seccion.lecciones.length > 0) {
          for (let i = 0; i < seccion.lecciones.length; i++) {
            const leccionActual = seccion.lecciones[i];
            // Comparar por id_leccion o por título si no hay ID
            if (leccionActual.id_leccion == idLeccionParaBuscar || 
                leccionActual.titulo === titulo ||
                (i === 0 && !encontrado && !idLeccionParaBuscar)) {
              encontrado = true;
              // Si hay siguiente lección en esta sección
              if (i < seccion.lecciones.length - 1) {
                siguienteLeccion = seccion.lecciones[i + 1];
                break;
              } else {
                // Buscar en la siguiente sección
                const indiceSeccion = this.seccionesActuales.indexOf(seccion);
                if (indiceSeccion < this.seccionesActuales.length - 1) {
                  const siguienteSeccion = this.seccionesActuales[indiceSeccion + 1];
                  if (siguienteSeccion.lecciones && siguienteSeccion.lecciones.length > 0) {
                    siguienteLeccion = siguienteSeccion.lecciones[0];
                  }
                }
              }
              break;
            }
          }
          if (encontrado && siguienteLeccion) break;
        }
      }
    }
    
    // Si aún no se encontró, buscar directamente en contenido antiguo
    if (!siguienteLeccion && this.contenidoActual && this.contenidoActual.length > 0) {
      console.log('[DEBUG] Buscando en contenido actual directamente...');
      let indiceActual = -1;
      
      // Buscar por ID
      indiceActual = this.contenidoActual.findIndex((item, idx) => {
        const itemId = item.id_contenido || idx;
        return itemId == idLeccionParaBuscar || 
               String(itemId) == String(idLeccionParaBuscar) ||
               item.seccion === titulo;
      });
      
      console.log('[DEBUG] Índice en contenido actual:', indiceActual);
      
      if (indiceActual >= 0 && indiceActual < this.contenidoActual.length - 1) {
        const siguienteItem = this.contenidoActual[indiceActual + 1];
        siguienteLeccion = {
          id_leccion: siguienteItem.id_contenido || (indiceActual + 1),
          id_contenido: siguienteItem.id_contenido || (indiceActual + 1),
          titulo: siguienteItem.seccion || `Lección ${indiceActual + 2}`,
          contenido: siguienteItem.texto,
          descripcion: siguienteItem.texto,
          tipo: siguienteItem.tipo || 'lectura',
          url_recurso: siguienteItem.url || siguienteItem.url_recurso
        };
        console.log('[DEBUG] Siguiente lección encontrada en contenido:', siguienteLeccion);
      }
    }
    
    // Debug final
    console.log('[DEBUG] Lección actual:', { leccionId, id, idLeccionParaBuscar, titulo });
    console.log('[DEBUG] Siguiente lección final:', siguienteLeccion);
    console.log('[DEBUG] Secciones disponibles:', this.seccionesActuales?.length || 0);
    console.log('[DEBUG] Contenido disponible:', this.contenidoActual?.length || 0);
    console.log('[DEBUG] Usuario logueado:', this.usuarioLogueado);
    console.log('[DEBUG] Es alumno:', this.esAlumno ? this.esAlumno() : 'método no existe');
    console.log('[DEBUG] ¿Mostrar botones?:', this.usuarioLogueado && this.esAlumno ? this.esAlumno() : false);

    modal.innerHTML = `
      <div class="h-screen flex flex-col bg-slate-900">
        <!-- Header -->
        <header class="bg-slate-800 border-b border-slate-700 px-3 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div class="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <button 
              class="btn-cerrar-modal flex items-center gap-1 sm:gap-2 text-white hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
              aria-label="Volver al curso"
            >
              <span class="material-symbols-outlined text-xl sm:text-2xl">arrow_back</span>
              <span class="font-medium text-sm sm:text-base hidden xs:inline">Volver al curso</span>
            </button>
            <div class="text-center flex-1 min-w-0 px-2">
              <h1 class="text-base sm:text-xl font-bold text-white truncate">${this.escapeHtml(nombreCurso)}</h1>
              <p class="text-xs sm:text-sm text-slate-400 truncate">${this.escapeHtml(docenteNombre)}</p>
            </div>
            <button 
              class="btn-cerrar-modal p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
              aria-label="Cerrar modal"
            >
              <span class="material-symbols-outlined text-xl sm:text-2xl">close</span>
            </button>
          </div>
        </header>

        <!-- Content Area - Layout Integrado Centrado -->
        <div class="flex-1 overflow-hidden flex bg-slate-900">
          ${tipo === 'video' && url ? `
            <!-- Video: Layout completo -->
            <div class="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8">
              <div class="w-full max-w-5xl">
                <div class="relative aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
                  ${url.includes('youtube.com') || url.includes('youtu.be') ? `
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src="${url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}" 
                      frameborder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowfullscreen
                      title="${this.escapeHtml(titulo)}"
                    ></iframe>
                  ` : `
                    <video 
                      id="leccionVideo" 
                      class="w-full h-full"
                      controls
                      controlsList="nodownload"
                    >
                      <source src="${url}" type="video/mp4">
                      Su navegador no soporta el elemento de video.
                    </video>
                  `}
                </div>
              </div>
            </div>
            <!-- Transcripción para video -->
            <aside class="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto flex-shrink-0 flex flex-col">
              <div class="p-6 flex-1 flex flex-col">
                <h2 class="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-primary">description</span>
                  Transcripción
                </h2>
                <div class="text-slate-300 space-y-4 leading-relaxed text-center flex-1" id="textoTranscripcion">
                  ${textoFormateado}
                </div>
                <div class="mt-auto pt-6 border-t border-slate-700 space-y-3">
                  ${this.esAlumno() ? `
                    <button 
                      class="btn-completar-leccion w-full px-6 py-3 ${estaCompletada ? 'bg-green-700 hover:bg-green-800 opacity-75 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      data-id="${id}"
                      data-leccion-id="${leccionId || ''}"
                      data-es-contenido-antiguo="${!leccionId && id ? 'true' : 'false'}"
                      ${estaCompletada ? 'disabled' : ''}
                      aria-label="${estaCompletada ? 'Lección completada' : 'Marcar lección como completada'}"
                    >
                      <span class="material-symbols-outlined">${estaCompletada ? 'check_circle' : 'check_circle'}</span>
                      ${estaCompletada ? 'Completada' : 'Marcar como Completado'}
                    </button>
                  ` : ''}
                  ${siguienteLeccion ? `
                    <button 
                      class="btn-siguiente-leccion w-full px-6 py-3 bg-cyan-400 hover:bg-cyan-500 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      data-leccion-id="${siguienteLeccion.id_leccion || siguienteLeccion.id_contenido}"
                      data-siguiente-titulo="${this.escapeHtml(siguienteLeccion.titulo || 'Siguiente Lección')}"
                      data-siguiente-texto="${this.escapeHtml(siguienteLeccion.contenido || siguienteLeccion.descripcion || '')}"
                      data-siguiente-tipo="${siguienteLeccion.tipo || 'lectura'}"
                      data-siguiente-url="${siguienteLeccion.url_recurso || siguienteLeccion.url || ''}"
                      aria-label="Ir a siguiente lección"
                    >
                      <span class="material-symbols-outlined">arrow_forward</span>
                      Siguiente: ${this.escapeHtml(siguienteLeccion.titulo || siguienteLeccion.seccion || 'Siguiente Lección')}
                    </button>
                  ` : ''}
                </div>
              </div>
            </aside>
          ` : tipo === 'audio' && url ? `
            <!-- Audio: Layout integrado -->
            <div class="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8">
              <div class="w-full max-w-3xl mx-2 sm:mx-4">
                <div class="bg-gradient-to-br from-primary/20 to-blue-900/20 rounded-2xl p-12">
                  <div class="text-center mb-8">
                    <h3 class="text-3xl font-bold text-white mb-2">${this.escapeHtml(titulo)}</h3>
                    <p class="text-slate-300 text-lg">${this.escapeHtml(docenteNombre)}</p>
                  </div>
                  <div class="flex justify-center mb-8">
                    <div class="bg-[#e8dcc4] rounded-lg overflow-hidden w-64 h-80 flex items-center justify-center">
                      <div class="w-32 h-40 border-4 border-[#8b7355] rounded bg-[#f5f0e8] flex items-center justify-center">
                        <span class="material-symbols-outlined text-6xl text-[#8b7355]">headphones</span>
                      </div>
                    </div>
                  </div>
                  <div class="mb-6">
                    <div class="flex items-center justify-between text-sm text-slate-300 mb-2">
                      <span id="tiempoActualAudio">0:00</span>
                      <span id="tiempoTotalAudio">0:00</span>
                    </div>
                    <div class="relative h-2 bg-slate-700 rounded-full cursor-pointer" id="barraProgresoAudio">
                      <div class="absolute h-full bg-cyan-400 rounded-full" id="progresoAudio" style="width: 0%">
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-lg"></div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center justify-center gap-6">
                    <button 
                      class="btn-reiniciar-audio bg-slate-700 hover:bg-slate-600 rounded-full w-12 h-12 flex items-center justify-center transition shadow-lg" 
                      id="btnReiniciarAudio"
                      aria-label="Reiniciar desde el principio"
                      title="Reiniciar"
                    >
                      <span class="material-symbols-outlined text-2xl text-white">replay</span>
                    </button>
                    <button 
                      class="btn-play-pause-audio bg-cyan-400 hover:bg-cyan-500 rounded-full w-16 h-16 flex items-center justify-center transition shadow-lg" 
                      id="btnPlayPauseAudio" 
                      aria-label="Reproducir/Pausar"
                    >
                      <span class="material-symbols-outlined text-4xl text-white" id="iconoPlayPause">play_arrow</span>
                    </button>
                  </div>
                  <audio 
                    id="leccionAudio" 
                    class="hidden"
                    preload="metadata"
                  >
                    <source src="${url}" type="audio/mpeg">
                    Su navegador no soporta el elemento de audio.
                  </audio>
                </div>
              </div>
            </div>
            <!-- Transcripción para audio -->
            <aside class="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto flex-shrink-0 flex flex-col">
              <div class="p-6 flex-1 flex flex-col">
                <h2 class="text-xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined text-primary">description</span>
                  Transcripción
                </h2>
                <div class="text-slate-300 space-y-4 leading-relaxed text-center flex-1" id="textoTranscripcion">
                  ${textoFormateado}
                </div>
                <div class="mt-auto pt-6 border-t border-slate-700 space-y-3">
                  ${this.esAlumno() ? `
                    <button 
                      class="btn-completar-leccion w-full px-6 py-3 ${estaCompletada ? 'bg-green-700 hover:bg-green-800 opacity-75 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      data-id="${id}"
                      data-leccion-id="${leccionId || ''}"
                      data-es-contenido-antiguo="${!leccionId && id ? 'true' : 'false'}"
                      ${estaCompletada ? 'disabled' : ''}
                      aria-label="${estaCompletada ? 'Lección completada' : 'Marcar lección como completada'}"
                    >
                      <span class="material-symbols-outlined">${estaCompletada ? 'check_circle' : 'check_circle'}</span>
                      ${estaCompletada ? 'Completada' : 'Marcar como Completado'}
                    </button>
                  ` : ''}
                  ${siguienteLeccion ? `
                    <button 
                      class="btn-siguiente-leccion w-full px-6 py-3 bg-cyan-400 hover:bg-cyan-500 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      data-leccion-id="${siguienteLeccion.id_leccion || siguienteLeccion.id_contenido}"
                      data-siguiente-titulo="${this.escapeHtml(siguienteLeccion.titulo || 'Siguiente Lección')}"
                      data-siguiente-texto="${this.escapeHtml(siguienteLeccion.contenido || siguienteLeccion.descripcion || '')}"
                      data-siguiente-tipo="${siguienteLeccion.tipo || 'lectura'}"
                      data-siguiente-url="${siguienteLeccion.url_recurso || siguienteLeccion.url || ''}"
                      aria-label="Ir a siguiente lección"
                    >
                      <span class="material-symbols-outlined">arrow_forward</span>
                      Siguiente: ${this.escapeHtml(siguienteLeccion.titulo || siguienteLeccion.seccion || 'Siguiente Lección')}
                    </button>
                  ` : ''}
                </div>
              </div>
            </aside>
          ` : `
            <!-- Lector Inmersivo con Text-to-Speech: Layout EXACTO como en la imagen -->
            <div class="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-gradient-to-br from-primary/20 to-blue-900/20 overflow-y-auto">
              <div class="flex flex-col md:flex-row max-w-6xl w-full h-auto md:h-[85vh] rounded-lg md:rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-800/95 to-slate-900/95">
                <!-- Panel Izquierdo: Reproductor (aproximadamente 1/3 del ancho en desktop, full width en móvil) -->
                <div class="flex-[1] flex flex-col p-4 sm:p-6 md:p-8 w-full md:w-auto">
                  <div class="w-full flex flex-col h-full">
                    <!-- Header del lector (arriba a la izquierda) -->
                    <div class="mb-6 text-left">
                      <p class="text-slate-400 text-sm mb-1">Lector inmersivo</p>
                      <h3 class="text-2xl font-bold text-white mb-1">${this.escapeHtml(titulo)}</h3>
                      <p class="text-slate-300 text-sm">${this.escapeHtml(docenteNombre)}</p>
                    </div>
                    
                    <!-- Imagen/Visual centrada -->
                    <div class="flex-1 flex items-center justify-center my-6">
                      <div class="bg-[#e8dcc4] rounded-lg overflow-hidden w-64 h-80 flex items-center justify-center shadow-lg">
                        <div class="w-32 h-40 border-4 border-[#8b7355] rounded bg-[#f5f0e8] flex items-center justify-center">
                          <span class="material-symbols-outlined text-6xl text-[#8b7355]">menu_book</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Controles y progreso (abajo, fijos) -->
                    <div class="mt-auto">
                      <!-- Barra de progreso de lectura -->
                      <div class="mb-4">
                        <div class="flex items-center justify-between text-sm text-slate-300 mb-2">
                          <span id="tiempoActualTTS">0:00</span>
                          <span id="tiempoTotalTTS">0:00</span>
                        </div>
                        <div class="relative h-2 bg-slate-700 rounded-full">
                          <div class="absolute h-full bg-cyan-400 rounded-full transition-all duration-300" id="progresoTTS" style="width: 0%">
                            <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full shadow-lg"></div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Controles simplificados centrados (PEQUEÑOS como en la imagen) -->
                      <div class="flex items-center justify-center gap-3">
                        <button 
                          class="btn-reiniciar-tts bg-slate-700 hover:bg-slate-600 rounded-full w-9 h-9 flex items-center justify-center transition shadow-md" 
                          id="btnReiniciarTTS"
                          aria-label="Reiniciar desde el principio"
                          title="Reiniciar"
                        >
                          <span class="material-symbols-outlined text-lg text-white">replay</span>
                        </button>
                        <button 
                          class="btn-play-pause-tts bg-cyan-400 hover:bg-cyan-500 rounded-full w-11 h-11 flex items-center justify-center transition shadow-md" 
                          id="btnPlayPauseTTS"
                          aria-label="Reproducir/Pausar"
                        >
                          <span class="material-symbols-outlined text-xl text-white" id="iconoPlayPauseTTS">play_arrow</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Panel Derecho: Transcripción (aproximadamente 2/3 del ancho en desktop, full width en móvil) -->
                <div class="flex-[2] bg-slate-800/40 border-t md:border-t-0 md:border-l border-slate-700/60 overflow-hidden flex-shrink-0 flex flex-col w-full md:w-auto">
                  <div class="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
                    <div class="flex items-center justify-center gap-2 mb-4 sm:mb-5 relative">
                      <h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-xl sm:text-2xl">description</span>
                        <span class="hidden xs:inline">Transcripción</span>
                        <span class="xs:hidden">Trans.</span>
                      </h2>
                      <!-- Botón para agrandar texto (derecha) -->
                      <div class="absolute right-0 flex items-center gap-1 sm:gap-2">
                        <button 
                          class="btn-reducir-texto p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label="Reducir tamaño de texto"
                          title="Reducir tamaño"
                        >
                          <span class="material-symbols-outlined text-lg sm:text-xl">text_decrease</span>
                        </button>
                        <button 
                          class="btn-aumentar-texto p-1.5 sm:p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label="Aumentar tamaño de texto"
                          title="Aumentar tamaño"
                        >
                          <span class="material-symbols-outlined text-lg sm:text-xl">text_increase</span>
                        </button>
                      </div>
                    </div>
                    <div class="text-white space-y-3 leading-relaxed text-left flex-1 overflow-y-auto pr-2 custom-scrollbar" id="textoTranscripcion" style="font-size: 1.125rem;">
                      ${textoFormateado}
                    </div>
                    
                    <!-- Botones al final (EXACTAMENTE al final) -->
                    <div class="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-700 space-y-2 sm:space-y-2.5 flex-shrink-0">
                      ${this.esAlumno() ? `
                        <button 
                          class="btn-completar-leccion w-full px-4 sm:px-5 py-2 sm:py-2.5 ${estaCompletada ? 'bg-green-700 hover:bg-green-800 opacity-75 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 touch-manipulation"
                          data-id="${id}"
                          data-leccion-id="${leccionId || ''}"
                          data-es-contenido-antiguo="${!leccionId && id ? 'true' : 'false'}"
                          ${estaCompletada ? 'disabled' : ''}
                          aria-label="${estaCompletada ? 'Lección completada' : 'Marcar lección como completada'}"
                        >
                          <span class="material-symbols-outlined text-base sm:text-lg">${estaCompletada ? 'check_circle' : 'check_circle'}</span>
                          <span class="truncate">${estaCompletada ? 'Completada' : 'Marcar como Completado'}</span>
                        </button>
                      ` : ''}
                      
                      ${siguienteLeccion ? `
                        <button 
                          class="btn-siguiente-leccion w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-cyan-400 hover:bg-cyan-500 text-black font-bold rounded-lg text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 touch-manipulation"
                          data-leccion-id="${siguienteLeccion.id_leccion || siguienteLeccion.id_contenido}"
                          data-siguiente-titulo="${this.escapeHtml(siguienteLeccion.titulo || 'Siguiente Lección')}"
                          data-siguiente-texto="${this.escapeHtml(siguienteLeccion.contenido || siguienteLeccion.descripcion || '')}"
                          data-siguiente-tipo="${siguienteLeccion.tipo || 'lectura'}"
                          data-siguiente-url="${siguienteLeccion.url_recurso || siguienteLeccion.url || ''}"
                          aria-label="Ir a siguiente lección"
                        >
                          <span class="material-symbols-outlined text-base sm:text-lg flex-shrink-0">arrow_forward</span>
                          <span class="truncate text-left">Siguiente: ${this.escapeHtml(siguienteLeccion.titulo || siguienteLeccion.seccion || 'Siguiente Lección')}</span>
                        </button>
                      ` : `
                        <button 
                          class="btn-volver-curso w-full px-4 sm:px-5 py-2 sm:py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 touch-manipulation"
                          onclick="document.getElementById('modalLeccionInmersiva').classList.add('hidden'); document.body.style.overflow = '';"
                          aria-label="Volver al curso"
                        >
                          <span class="material-symbols-outlined text-base sm:text-lg">arrow_back</span>
                          <span class="truncate">Volver al curso</span>
                        </button>
                      `}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    // Event listeners para cerrar
    modal.querySelectorAll('.btn-cerrar-modal').forEach(btn => {
      btn.addEventListener('click', async () => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Recargar el estado del curso para mostrar lecciones actualizadas
        if (this.currentCurso && this.currentCurso.id_curso) {
          console.log('[DEBUG] Recargando curso después de cerrar modal...');
          await this.loadCursoRecursos(this.currentCurso.id_curso);
        }
      });
    });
    
    // También recargar cuando se cierra con el botón "Volver al curso" del panel derecho
    const btnVolverCurso = modal.querySelector('.btn-volver-curso');
    if (btnVolverCurso) {
      btnVolverCurso.addEventListener('click', async () => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Recargar el estado del curso
        if (this.currentCurso && this.currentCurso.id_curso) {
          console.log('[DEBUG] Recargando curso después de cerrar modal (botón volver)...');
          await this.loadCursoRecursos(this.currentCurso.id_curso);
        }
      });
    }

    // Event listener para completar
    const btnCompletar = modal.querySelector('.btn-completar-leccion');
    if (btnCompletar) {
      btnCompletar.addEventListener('click', async () => {
        const leccionId = btnCompletar.dataset.leccionId;
        const contenidoId = btnCompletar.dataset.id;
        const esContenidoAntiguo = btnCompletar.dataset.esContenidoAntiguo === 'true';
        
        console.log('[DEBUG] Botón completar clickeado. leccionId:', leccionId, 'contenidoId:', contenidoId, 'esContenidoAntiguo:', esContenidoAntiguo);
        
        // Deshabilitar botón mientras se procesa
        btnCompletar.disabled = true;
        const textoOriginal = btnCompletar.innerHTML;
        btnCompletar.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Procesando...';
        
        try {
          // Determinar si es contenido antiguo: si no hay leccionId o si el flag está activado
          const esContenidoAntiguoReal = esContenidoAntiguo === 'true' || (!leccionId && contenidoId);
          
          if (esContenidoAntiguoReal) {
            console.log('[DEBUG] Usando método antiguo para contenido:', contenidoId || id);
            await this.marcarComoCompletado(contenidoId || id);
            btnCompletar.classList.add('opacity-50');
            btnCompletar.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Completada';
          } else if (leccionId) {
            console.log('[DEBUG] Usando método nuevo para lección:', leccionId);
            await this.marcarLeccionCompletada(leccionId);
            btnCompletar.classList.add('opacity-50');
            btnCompletar.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Completada';
          } else {
            // Si no hay ni leccionId ni contenidoId, intentar con id
            console.log('[DEBUG] No se pudo determinar el tipo, intentando con id:', id);
            // Intentar primero como lección, si falla usar contenido antiguo
            try {
              await this.marcarLeccionCompletada(id);
              btnCompletar.classList.add('opacity-50');
              btnCompletar.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Completada';
            } catch (error) {
              console.log('[DEBUG] Falló como lección, intentando como contenido antiguo');
              await this.marcarComoCompletado(id);
              btnCompletar.classList.add('opacity-50');
              btnCompletar.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Completada';
            }
          }
        } catch (error) {
          console.error('[DEBUG] Error al marcar como completada:', error);
          // Restaurar botón en caso de error
          btnCompletar.disabled = false;
          btnCompletar.innerHTML = textoOriginal;
          const { showNotification } = await import('../utils/helpers.js');
          showNotification('Error al marcar la lección como completada. Intenta nuevamente.', 'error');
        }
      });
    }

    // Event listener para siguiente lección
    const btnSiguiente = modal.querySelector('.btn-siguiente-leccion');
    if (btnSiguiente) {
      btnSiguiente.addEventListener('click', async () => {
        const siguienteLeccionId = btnSiguiente.dataset.leccionId;
        const siguienteTitulo = btnSiguiente.dataset.siguienteTitulo;
        const siguienteTexto = btnSiguiente.dataset.siguienteTexto;
        const siguienteTipo = btnSiguiente.dataset.siguienteTipo;
        const siguienteUrl = btnSiguiente.dataset.siguienteUrl;
        
        // Obtener ID de la lección actual
        const leccionActualId = leccionId || id;
        const contenidoActualId = id;
        const esContenidoAntiguo = !leccionId && contenidoActualId;
        
        // Marcar lección actual como completada antes de avanzar
        if (leccionActualId || contenidoActualId) {
          try {
            const { showNotification } = await import('../utils/helpers.js');
            
            if (esContenidoAntiguo) {
              // Usar método antiguo para contenido
              await this.marcarComoCompletado(contenidoActualId);
            } else if (leccionActualId) {
              // Usar método nuevo para lección
              await this.marcarLeccionCompletada(leccionActualId);
            }
            
            // Mostrar notificación de éxito
            showNotification('Lección marcada como completada ✓', 'success', 2000);
          } catch (error) {
            console.error('Error al marcar lección como completada:', error);
            // Continuar con la navegación aunque falle el marcado
          }
        }
        
        if (siguienteLeccionId) {
          // Cerrar modal actual
          modal.classList.add('hidden');
          document.body.style.overflow = '';
          
          // Cargar siguiente lección
          setTimeout(() => {
            this.mostrarLeccionModal({
              titulo: siguienteTitulo || siguienteLeccion?.titulo || 'Siguiente Lección',
              texto: siguienteTexto || siguienteLeccion?.contenido || siguienteLeccion?.descripcion || '',
              tipo: siguienteTipo || siguienteLeccion?.tipo || 'lectura',
              url: siguienteUrl || siguienteLeccion?.url_recurso || siguienteLeccion?.url || '',
              id: siguienteLeccionId,
              leccionId: siguienteLeccionId
            });
          }, 300);
        }
      });
    }

    // Inicializar controles según el tipo
    if (tipo === 'audio' && url) {
      setTimeout(() => {
        this.inicializarControlesAudio();
      }, 100);
    } else if (tipo === 'texto' || !tipo || (!url && texto)) {
      // Inicializar Text-to-Speech para lecciones de texto
      setTimeout(() => {
        this.inicializarLectorInmersivo(texto || textoFormateado, titulo);
      }, 100);
    }

    // Mostrar modal y bloquear scroll
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Anunciar para lectores de pantalla
    if (window.app && window.app.screenReader && (window.app.screenReader.active || window.app.screenReader.activo)) {
      if (window.app.screenReader.speak) {
        window.app.screenReader.speak(`Lector inmersivo abierto: ${titulo}. Contenido completo disponible.`);
      }
    }

    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
        // Detener síntesis de voz si está activa
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
  
  /**
   * Inicializar lector inmersivo con Text-to-Speech
   */
  inicializarLectorInmersivo(texto, titulo) {
    // Verificar soporte de Web Speech API
    if (!('speechSynthesis' in window)) {
      console.warn('Tu navegador no soporta síntesis de voz');
      return;
    }
    
    const btnPlayPause = document.getElementById('btnPlayPauseTTS');
    const btnReiniciar = document.getElementById('btnReiniciarTTS');
    const iconoPlayPause = document.getElementById('iconoPlayPauseTTS');
    const progresoTTS = document.getElementById('progresoTTS');
    const tiempoActualTTS = document.getElementById('tiempoActualTTS');
    const tiempoTotalTTS = document.getElementById('tiempoTotalTTS');
    
    if (!btnPlayPause || !btnReiniciar || !iconoPlayPause) return;
    
    // Limpiar texto de HTML para síntesis de voz
    const textoLimpio = texto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    // Calcular tiempo estimado (aproximadamente 150 palabras por minuto)
    const palabras = textoLimpio.split(/\s+/).length;
    const tiempoEstimadoSegundos = Math.ceil((palabras / 150) * 60);
    const tiempoEstimadoMinutos = Math.floor(tiempoEstimadoSegundos / 60);
    const tiempoEstimadoSegs = tiempoEstimadoSegundos % 60;
    tiempoTotalTTS.textContent = `${tiempoEstimadoMinutos}:${tiempoEstimadoSegs.toString().padStart(2, '0')}`;
    
    let estaReproduciendo = false;
    let inicioTiempo = null;
    let intervaloProgreso = null;
    let utterance = null;
    
    // Función para actualizar progreso
    const actualizarProgreso = () => {
      if (!inicioTiempo) return;
      
      const tiempoTranscurrido = Math.floor((Date.now() - inicioTiempo) / 1000);
      const minutos = Math.floor(tiempoTranscurrido / 60);
      const segundos = tiempoTranscurrido % 60;
      tiempoActualTTS.textContent = `${minutos}:${segundos.toString().padStart(2, '0')}`;
      
      if (tiempoEstimadoSegundos > 0) {
        const porcentaje = Math.min((tiempoTranscurrido / tiempoEstimadoSegundos) * 100, 100);
        progresoTTS.style.width = `${porcentaje}%`;
      }
    };
    
    // Función para crear utterance
    const crearUtterance = () => {
      const utt = new SpeechSynthesisUtterance(textoLimpio);
      utt.lang = 'es-ES';
      utt.rate = 1.0;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      
      utt.onstart = () => {
        estaReproduciendo = true;
        inicioTiempo = Date.now();
        iconoPlayPause.textContent = 'pause';
        btnPlayPause.setAttribute('aria-label', 'Pausar');
        
        // Iniciar actualización de progreso
        intervaloProgreso = setInterval(actualizarProgreso, 100);
      };
      
      utt.onend = () => {
        estaReproduciendo = false;
        inicioTiempo = null;
        iconoPlayPause.textContent = 'play_arrow';
        btnPlayPause.setAttribute('aria-label', 'Reproducir');
        if (intervaloProgreso) {
          clearInterval(intervaloProgreso);
          intervaloProgreso = null;
        }
        progresoTTS.style.width = '100%';
        const minutos = Math.floor(tiempoEstimadoSegundos / 60);
        const segundos = tiempoEstimadoSegundos % 60;
        tiempoActualTTS.textContent = `${minutos}:${segundos.toString().padStart(2, '0')}`;
      };
      
      utt.onerror = (event) => {
        console.error('Error en síntesis de voz:', event);
        estaReproduciendo = false;
        inicioTiempo = null;
        iconoPlayPause.textContent = 'play_arrow';
        btnPlayPause.setAttribute('aria-label', 'Reproducir');
        if (intervaloProgreso) {
          clearInterval(intervaloProgreso);
          intervaloProgreso = null;
        }
      };
      
      return utt;
    };
    
    // Botón Play/Pause
    btnPlayPause.addEventListener('click', () => {
      if (estaReproduciendo) {
        // Pausar
        window.speechSynthesis.pause();
        estaReproduciendo = false;
        iconoPlayPause.textContent = 'play_arrow';
        btnPlayPause.setAttribute('aria-label', 'Reproducir');
        if (intervaloProgreso) {
          clearInterval(intervaloProgreso);
          intervaloProgreso = null;
        }
      } else {
        // Reanudar o iniciar
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          estaReproduciendo = true;
          const tiempoActual = tiempoActualTTS.textContent.split(':');
          const segundosActuales = parseInt(tiempoActual[0]) * 60 + parseInt(tiempoActual[1]);
          inicioTiempo = Date.now() - (segundosActuales * 1000);
          iconoPlayPause.textContent = 'pause';
          btnPlayPause.setAttribute('aria-label', 'Pausar');
          intervaloProgreso = setInterval(actualizarProgreso, 100);
        } else {
          // Iniciar desde el principio
          window.speechSynthesis.cancel();
          utterance = crearUtterance();
          window.speechSynthesis.speak(utterance);
        }
      }
    });
    
    // Botón Reiniciar
    btnReiniciar.addEventListener('click', () => {
      window.speechSynthesis.cancel();
      estaReproduciendo = false;
      inicioTiempo = null;
      iconoPlayPause.textContent = 'play_arrow';
      btnPlayPause.setAttribute('aria-label', 'Reproducir');
      tiempoActualTTS.textContent = '0:00';
      progresoTTS.style.width = '0%';
      if (intervaloProgreso) {
        clearInterval(intervaloProgreso);
        intervaloProgreso = null;
      }
      
      // Reiniciar reproducción
      utterance = crearUtterance();
      window.speechSynthesis.speak(utterance);
    });
    
    // Controles de tamaño de texto de transcripción
    const textoTranscripcion = document.getElementById('textoTranscripcion');
    const btnAumentarTexto = document.querySelector('.btn-aumentar-texto');
    const btnReducirTexto = document.querySelector('.btn-reducir-texto');
    
    if (textoTranscripcion && btnAumentarTexto && btnReducirTexto) {
      // Tamaño inicial (1.125rem = 18px)
      let tamanoTexto = 1.125;
      const minTamano = 0.875; // 14px
      const maxTamano = 2.0; // 32px
      const incremento = 0.125; // 0.125rem = 2px
      
      const actualizarTamanoTexto = () => {
        textoTranscripcion.style.fontSize = `${tamanoTexto}rem`;
        // Guardar preferencia en localStorage
        localStorage.setItem('tamanoTextoTranscripcion', tamanoTexto.toString());
      };
      
      // Cargar preferencia guardada
      const tamanoGuardado = localStorage.getItem('tamanoTextoTranscripcion');
      if (tamanoGuardado) {
        tamanoTexto = parseFloat(tamanoGuardado);
        if (tamanoTexto >= minTamano && tamanoTexto <= maxTamano) {
          actualizarTamanoTexto();
        }
      }
      
      btnAumentarTexto.addEventListener('click', () => {
        if (tamanoTexto < maxTamano) {
          tamanoTexto = Math.min(tamanoTexto + incremento, maxTamano);
          actualizarTamanoTexto();
        }
      });
      
      btnReducirTexto.addEventListener('click', () => {
        if (tamanoTexto > minTamano) {
          tamanoTexto = Math.max(tamanoTexto - incremento, minTamano);
          actualizarTamanoTexto();
        }
      });
    }
    
    // Limpiar al cerrar modal
    const modal = document.getElementById('modalLeccionInmersiva');
    if (modal) {
      const observer = new MutationObserver((mutations) => {
        if (modal.classList.contains('hidden')) {
          window.speechSynthesis.cancel();
          if (intervaloProgreso) {
            clearInterval(intervaloProgreso);
          }
        }
      });
      observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /**
   * Renderizar recurso descargable
   */
  renderRecursoDescargable(recurso) {
    const iconos = {
      'PDF': 'description',
      'Audio': 'audiotrack',
      'default': 'attach_file'
    };
    
    const icon = iconos[recurso.tipo_nombre] || iconos.default;
    
    return `
      <div class="bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 hover:border-primary rounded-lg p-5 transition-all group">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <span class="material-symbols-outlined text-blue-400 text-2xl">${icon}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-lg font-bold text-white mb-1 truncate">${this.escapeHtml(recurso.titulo)}</h4>
            <p class="text-sm text-slate-400 mb-3 line-clamp-2">${this.escapeHtml(recurso.descripcion || 'Recurso descargable')}</p>
            <button 
              onclick="window.open('${recurso.url}', '_blank')"
              class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Descargar ${this.escapeHtml(recurso.titulo)}"
            >
              <span class="material-symbols-outlined text-sm">download</span>
              <span>Descargar</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderizar recurso externo
   */
  renderRecursoExterno(recurso) {
    const isYouTube = recurso.url?.includes('youtube.com') || recurso.url?.includes('youtu.be');
    
    return `
      <div class="bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 hover:border-purple-500 rounded-lg p-5 transition-all group">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 ${isYouTube ? 'bg-red-500/20' : 'bg-purple-500/20'} rounded-lg flex items-center justify-center group-hover:${isYouTube ? 'bg-red-500/30' : 'bg-purple-500/30'} transition-colors">
              <span class="material-symbols-outlined ${isYouTube ? 'text-red-400' : 'text-purple-400'} text-2xl">
                ${isYouTube ? 'play_circle' : 'link'}
              </span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-lg font-bold text-white mb-1 truncate">${this.escapeHtml(recurso.titulo)}</h4>
            <p class="text-sm text-slate-400 mb-3 line-clamp-2">${this.escapeHtml(recurso.descripcion || 'Enlace a sitio web externo con materiales adaptados.')}</p>
            <button 
              onclick="window.open('${recurso.url}', '_blank', 'noopener,noreferrer')"
              class="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Visitar ${this.escapeHtml(recurso.titulo)}"
            >
              <span class="material-symbols-outlined text-sm">open_in_new</span>
              <span>${isYouTube ? 'Ver en YouTube' : 'Visitar'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Instancia global
window.coursesController = null;

// Exportar
export default CoursesController;


