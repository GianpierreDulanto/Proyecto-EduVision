// src/courses/courses-controller.js
// Controlador para gestionar cursos dinámicamente

import { getCursos, getCurso, getCursoRecursos, getCursoContenido, getCategorias, getGrados, inscribirAlumno, getAlumnoCursos } from '../api/api.js';
import API from '../api/api.js';

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
      // Cargar categorías y grados
      this.categorias = await getCategorias();
      this.grados = await getGrados();
      
      // Cargar ID de alumno si hay sesión
      this.loadAlumnoId();
      
      // Cargar cursos inscritos si hay alumno
      if (this.alumnoId) {
        await this.loadCursosInscritos();
      }
      
      // Verificar si hay sesión activa
      this.checkSessionAndRender();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('✓ Controlador de cursos inicializado');
    } catch (error) {
      console.error('Error al inicializar controlador de cursos:', error);
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
      this.cursosInscritos = await getAlumnoCursos(this.alumnoId);
      this.renderCursosInscritos();
    } catch (error) {
      console.error('Error al cargar cursos inscritos:', error);
      this.cursosInscritos = [];
      this.renderCursosInscritos();
    }
  }

  renderCursosInscritos() {
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

    container.innerHTML = cursosOrdenados.map(curso => {
      const estado = curso.finalizado ? 'Completado' : 'En progreso';
      const estadoColor = curso.finalizado 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      
      // Calcular progreso (simplificado - en producción se calcularía desde contenidos vistos)
      const progreso = curso.finalizado ? 100 : 0; // Placeholder

      return `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer"
             onclick="window.app.courses.verCursoDetalle(${curso.id_curso})"
             role="button"
             tabindex="0"
             onkeypress="if(event.key==='Enter') window.app.courses.verCursoDetalle(${curso.id_curso})">
          <div class="aspect-video bg-gradient-to-br from-primary/20 to-blue-100 dark:from-primary/30 dark:to-blue-900/30 flex items-center justify-center relative">
            <span class="material-symbols-outlined text-6xl text-primary">school</span>
            ${progreso > 0 ? `
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                <div class="h-full bg-primary transition-all" style="width: ${progreso}%"></div>
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
            ${progreso > 0 ? `
              <div class="mb-4">
                <div class="flex items-center justify-between text-sm mb-1">
                  <span class="text-slate-600 dark:text-slate-400">Progreso</span>
                  <span class="font-semibold text-primary">${progreso}%</span>
                </div>
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div class="bg-primary h-2 rounded-full transition-all" style="width: ${progreso}%"></div>
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
        this.categorias = await getCategorias();
      }

      if (this.categorias.length > 0) {
        container.innerHTML = this.categorias.slice(0, 8).map(cat => `
          <div class="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            <div class="text-3xl mb-2">📚</div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white">${this.escapeHtml(cat.nombre)}</div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Error al cargar categorías preview:', error);
    }
  }

  async loadCursosPreviewCatalogo() {
    try {
      const container = document.getElementById('previewCursosCatalogo');
      if (!container) return;

      // Cargar algunos cursos públicos
      const cursos = await getCursos({});
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
        this.categorias = await getCategorias();
      }

      if (this.categorias.length > 0) {
        container.innerHTML = this.categorias.slice(0, 8).map(cat => `
          <div class="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
            <div class="text-3xl mb-2">📚</div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white">${this.escapeHtml(cat.nombre)}</div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Error al cargar categorías preview:', error);
    }
  }

  async loadCursosPreview() {
    try {
      const container = document.getElementById('previewCursos');
      if (!container) return;

      // Cargar cursos públicos (sin filtro de estado, el backend devuelve aprobados/publicados por defecto)
      const cursos = await getCursos();
      
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

    // Obtener IDs de cursos inscritos para verificar estado
    const cursosInscritosIds = this.cursosInscritos.map(c => c.id_curso);

    container.innerHTML = cursos.map(curso => {
      const estaInscrito = cursosInscritosIds.includes(curso.id_curso);
      const cursoInscrito = estaInscrito ? this.cursosInscritos.find(c => c.id_curso === curso.id_curso) : null;
      
      return `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="aspect-video bg-gradient-to-br from-primary/20 to-blue-100 dark:from-primary/30 dark:to-blue-900/30 flex items-center justify-center relative">
            <span class="material-symbols-outlined text-6xl text-primary">school</span>
            ${estaInscrito && cursoInscrito && !cursoInscrito.finalizado ? `
              <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700">
                <div class="h-full bg-primary transition-all" style="width: 0%"></div>
              </div>
            ` : ''}
          </div>
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-xl font-bold text-slate-900 dark:text-white flex-1">
                ${this.escapeHtml(curso.titulo)}
              </h3>
              <span class="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded ml-2">
                ${this.escapeHtml(curso.categoria || 'General')}
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
            ${estaInscrito ? `
              <button 
                onclick="window.app.courses.verCursoDetalle(${curso.id_curso})"
                class="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors"
                aria-label="Ver curso ${this.escapeHtml(curso.titulo)}">
                ${cursoInscrito?.finalizado ? 'Ver Curso' : 'Continuar Curso'}
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
      // Verificar si el alumno está inscrito
      if (!this.alumnoId) {
        this.loadAlumnoId();
      }

      const estaInscrito = this.cursosInscritos.some(c => c.id_curso === cursoId);
      
      if (!estaInscrito) {
        this.showError('Debes inscribirte en este curso para ver su contenido');
        return;
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
      // Verificar que el alumno esté inscrito
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
      
      // Cargar información completa del curso
      if (!this.currentCurso) {
        this.currentCurso = await getCurso(cursoId);
        sessionStorage.setItem('currentCurso', JSON.stringify(this.currentCurso));
      }
      
      // Cargar recursos, contenido y cuestionarios
      const [recursos, contenido, cuestionarios] = await Promise.all([
        getCursoRecursos(cursoId).catch(() => []),
        getCursoContenido(cursoId).catch(() => []),
        API.getCursoCuestionarios(cursoId).catch(() => [])
      ]);
      
      this.renderDetallesCurso(recursos, contenido, cuestionarios);
    } catch (error) {
      console.error('Error al cargar detalles del curso:', error);
      this.showError('Error al cargar la información del curso');
    }
  }

  renderDetallesCurso(recursos, contenido, cuestionarios) {
    // Actualizar información del curso en el header
    this.renderCursoHeader();
    
    // Renderizar contenido
    this.renderContenidoCurso(contenido);
    
    // Renderizar recursos
    this.renderRecursosCurso(recursos);
    
    // Renderizar cuestionarios
    this.renderCuestionariosCurso(cuestionarios);
  }

  renderCursoHeader() {
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
      const progreso = cursoInscrito.finalizado ? 100 : 0; // Placeholder - se calcularía desde contenidos vistos
      const estado = cursoInscrito.finalizado ? 'Completado' : 'En progreso';
      const estadoColor = cursoInscrito.finalizado 
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

  renderContenidoCurso(contenido) {
    const container = document.getElementById('listaContenidoCursoDetalle');
    if (!container) return;
    
    if (!contenido || contenido.length === 0) {
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
    
    container.innerHTML = contenido.map((item, index) => {
      const tipoIcon = {
        'video': 'play_circle',
        'documento': 'description',
        'audio': 'headphones',
        'lectura': 'menu_book'
      }[item.tipo || 'lectura'] || 'article';
      
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600 hover:border-primary transition-colors">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-2xl">${tipoIcon}</span>
              </div>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">
                  ${this.escapeHtml(item.seccion || `Sección ${index + 1}`)}
                </h3>
                <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded">
                  ${this.escapeHtml(item.tipo || 'lectura')}
                </span>
              </div>
              <p class="text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                ${this.escapeHtml(item.texto || 'Sin descripción disponible')}
              </p>
              ${item.url ? `
                <button onclick="window.app.courses.abrirContenido('${this.escapeHtml(item.url)}', '${item.tipo}')" 
                        class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary">
                  <span class="material-symbols-outlined text-sm">${item.tipo === 'video' ? 'play_arrow' : item.tipo === 'audio' ? 'headphones' : 'open_in_new'}</span>
                  ${item.tipo === 'video' ? 'Ver video' : item.tipo === 'audio' ? 'Reproducir audio' : 'Abrir contenido'}
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
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
    
    container.innerHTML = recursos.map(recurso => {
      const tipoNombre = recurso.tipo || recurso.nombre_tipo || 'Recurso';
      const iconMap = {
        'PDF': 'picture_as_pdf',
        'Audio': 'headphones',
        'Enlace YouTube': 'play_circle',
        'Video': 'video_library',
        'Documento': 'description',
        'Imagen': 'image'
      };
      
      const icon = iconMap[tipoNombre] || 'folder';
      const esEnlace = tipoNombre.includes('YouTube') || tipoNombre.includes('Enlace');
      
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200 dark:border-slate-600 hover:border-primary transition-all shadow-sm">
          <div class="flex items-start gap-4 mb-4">
            <div class="flex-shrink-0">
              <div class="w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-3xl">${icon}</span>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
                ${this.escapeHtml(recurso.titulo || 'Sin título')}
              </h3>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                ${this.escapeHtml(recurso.descripcion || 'Sin descripción')}
              </p>
              <span class="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded-full">
                ${this.escapeHtml(tipoNombre)}
              </span>
            </div>
          </div>
          <button 
            onclick="window.app.courses.abrirRecurso(${recurso.id_recurso}, '${this.escapeHtml(recurso.url || '')}', ${esEnlace})"
            class="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="${esEnlace ? 'Abrir enlace' : 'Descargar recurso'}: ${this.escapeHtml(recurso.titulo || '')}">
            <span class="material-symbols-outlined">${esEnlace ? 'open_in_new' : 'download'}</span>
            ${esEnlace ? 'Abrir enlace' : 'Descargar'}
          </button>
        </div>
      `;
    }).join('');
  }

  renderCuestionariosCurso(cuestionarios) {
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
    
    container.innerHTML = cuestionarios.map(cuestionario => {
      const estado = cuestionario.estado === 'activo' ? 'Activo' : 'Inactivo';
      const estadoColor = cuestionario.estado === 'activo' 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400';
      
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 border border-slate-200 dark:border-slate-600 hover:border-primary transition-all">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                ${this.escapeHtml(cuestionario.titulo || 'Sin título')}
              </h3>
              <p class="text-slate-600 dark:text-slate-400 mb-3">
                ${this.escapeHtml(cuestionario.descripcion || 'Sin descripción')}
              </p>
              <span class="inline-block px-3 py-1 ${estadoColor} text-xs font-semibold rounded-full">
                ${estado}
              </span>
            </div>
          </div>
          <button 
            onclick="window.app.courses.iniciarCuestionario(${cuestionario.id_cuestionario})"
            class="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            ${cuestionario.estado !== 'activo' ? 'disabled' : ''}
            aria-label="Iniciar cuestionario: ${this.escapeHtml(cuestionario.titulo || '')}">
            <span class="material-symbols-outlined">quiz</span>
            ${cuestionario.estado === 'activo' ? 'Iniciar Cuestionario' : 'Cuestionario Inactivo'}
          </button>
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

  iniciarCuestionario(cuestionarioId) {
    // Guardar cuestionario en sesión y navegar
    sessionStorage.setItem('currentCuestionario', cuestionarioId);
    if (window.app && window.app.router) {
      window.app.router.navigateTo('quiz');
    }
  }

  showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in';
    notification.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
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
    
    // Mostrar toast o notificación
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(message);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
}

// Instancia global
window.coursesController = null;

// Exportar
export default CoursesController;


