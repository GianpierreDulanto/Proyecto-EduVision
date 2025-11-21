// src/navigation/router.js
// Gestión de navegación entre secciones

export class Router {
  constructor(sessionManager, breadcrumbsManager, historyManager) {
    this.session = sessionManager;
    this.breadcrumbs = breadcrumbsManager;
    this.history = historyManager;
    this.sections = document.querySelectorAll('.section');
    this.currentSection = 'inicio';
    
    this.setupEventListeners();
    this.exposeGlobalMethods();
  }

  setupEventListeners() {
    // Botón de login/logout en navbar
    const btnLoginLogout = document.getElementById('btnLoginLogout');
    if (btnLoginLogout) {
      btnLoginLogout.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.session.isLoggedIn()) {
          this.session.logout();
          this.navigateTo('inicio');
        } else {
          this.navigateTo('login');
        }
      });
    }

    // Botón "Comienza"
    const btnComienza = document.querySelector('.botonComienza');
    if (btnComienza) {
      btnComienza.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo('login');
      });
    }

    // Botón de ajustes
    const btnAjustes = document.getElementById('btnAjustes');
    if (btnAjustes) {
      btnAjustes.addEventListener('click', () => {
        this.navigateTo('ajustesAccesibilidad');
      });
    }

    // Botones específicos de navegación
    this.setupSpecificButtons();
  }

  setupSpecificButtons() {
    const buttons = {
      'btnIrSubida': 'inputSubirCurso',
      'btnVolverDashboard': 'dashboardDocente',
      'btnRegresarADashboard': 'dashboardDocente',
      'btnAjustesNav': 'ajustesAccesibilidad'
    };

    Object.entries(buttons).forEach(([btnId, sectionId]) => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => this.navigateTo(sectionId));
      }
    });

    // Botón "Mis cursos" del dashboard alumno
    const btnMisCursos = document.querySelector('#dashboardAlumno button');
    if (btnMisCursos && btnMisCursos.textContent.includes('Mis cursos')) {
      btnMisCursos.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo('listaCursosAlumno');
      });
    }

    // Botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.session.logout();
        this.navigateTo('inicio');
      });
    }
  }

  navigateTo(sectionId) {
    // Si el usuario está logueado y trata de ir a "inicio", redirigir a su dashboard
    if (sectionId === 'inicio' && this.session.isLoggedIn()) {
      const user = this.session.user;
      if (user.rol === 'admin') {
        sectionId = 'dashboardAdmin';
      } else if (user.rol === 'docente') {
        sectionId = 'dashboardDocente';
      } else if (user.rol === 'alumno') {
        sectionId = 'dashboardAlumno';
      }
    }

    // Si el usuario NO está logueado y trata de ir a un dashboard, redirigir a inicio
    if ((sectionId === 'dashboardAdmin' || sectionId === 'dashboardDocente' || sectionId === 'dashboardAlumno') && !this.session.isLoggedIn()) {
      sectionId = 'inicio';
    }

    // Detener medios activos
    this.stopAllMedia();

    // Ocultar todas las secciones
    this.sections.forEach(section => {
      if (section.id === sectionId) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });

    // Actualizar estado actual
    this.currentSection = sectionId;

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Actualizar historial y breadcrumbs
    this.history.push(sectionId);
    this.breadcrumbs.update();

    // Actualizar botón de navbar
    this.session.updateNavbarButton();

    // Actualizar enlaces activos de navegación
    if (window.updateActiveNavLink) {
      window.updateActiveNavLink(sectionId);
    }

    // Cargar datos específicos de la sección
    this.loadSectionData(sectionId);

    console.log(`📍 Navegando a: ${sectionId}`);
  }

  async loadSectionData(sectionId) {
    // Cargar datos del dashboard de admin
    if (sectionId === 'dashboardAdmin' && window.app && window.app.admin) {
      window.app.admin.cargarEstadisticas();
      window.app.admin.cargarPendientes();
      window.app.admin.cargarUsuarios();
      window.app.admin.cargarCategorias();
      window.app.admin.cargarGrados();
    }
    
    // Cargar cursos del docente cuando se navega al dashboard
    if (sectionId === 'dashboardDocente' && window.app && window.app.teacher) {
      window.app.teacher.loadTeacherCourses();
    }
    
    // Cargar datos del perfil cuando se navega a miPerfil
    if (sectionId === 'miPerfil' && window.app && window.app.session) {
      window.app.session.loadProfileData();
    }
    
    // Cargar vista de "Mis Cursos" (solo cursos inscritos)
    if (sectionId === 'listaCursosAlumno' && window.app && window.app.courses) {
      window.app.courses.checkSessionAndRender();
      // Recargar cursos inscritos para actualizar la vista
      if (window.app.courses.alumnoId) {
        await window.app.courses.loadCursosInscritos();
      }
    }
    
    // Cargar catálogo de cursos (todos los cursos disponibles)
    if (sectionId === 'cursos' && window.app && window.app.courses) {
      // Verificar sesión antes de cargar
      const isLoggedIn = window.app.session && window.app.session.isLoggedIn();
      
      // Mostrar/ocultar vistas según sesión
      const vistaNoLogueado = document.getElementById('vistaCursosNoLogueadoCatalogo');
      const vistaLogueado = document.getElementById('vistaCursosLogueadoCatalogo');
      
      if (isLoggedIn) {
        // Ocultar vista informativa y mostrar catálogo
        if (vistaNoLogueado) vistaNoLogueado.classList.add('hidden');
        if (vistaLogueado) {
          vistaLogueado.classList.remove('hidden');
          // Mostrar el catálogo completo
          window.app.courses.loadAlumnoId();
          window.app.courses.populateFilters();
          // Cargar cursos inscritos para verificar estado
          if (window.app.courses.alumnoId) {
            await window.app.courses.loadCursosInscritos();
          }
          await window.app.courses.loadCatalogoCursos();
        }
      } else {
        // Si no está logueado, limpiar datos y mostrar vista informativa
        window.app.courses.alumnoId = null;
        window.app.courses.cursosInscritos = [];
        
        // Ocultar catálogo y mostrar vista informativa
        if (vistaLogueado) vistaLogueado.classList.add('hidden');
        
        // Mostrar vista informativa
        if (vistaNoLogueado) {
          vistaNoLogueado.classList.remove('hidden');
          // Cargar datos de la vista informativa
          await window.app.courses.loadInformativeViewCatalogo();
        }
      }
    }
    
    // Cargar datos del dashboard del alumno
    if (sectionId === 'dashboardAlumno' && window.app && window.app.student) {
      window.app.student.recargar();
    }
    
    // Cargar detalles del curso cuando se navega a recursosCurso
    if (sectionId === 'recursosCurso' && window.app && window.app.courses) {
      const currentCurso = window.app.courses.getCurrentCurso();
      if (currentCurso && currentCurso.id_curso) {
        window.app.courses.loadCursoRecursos(currentCurso.id_curso);
      }
    }
  }

  stopAllMedia() {
    // Detener videos y audios activos
    const videos = document.querySelectorAll('video');
    const audios = document.querySelectorAll('audio');
    
    videos.forEach(video => {
      video.pause();
      video.currentTime = 0;
    });
    
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  getCurrentSection() {
    return this.currentSection;
  }

  exposeGlobalMethods() {
    // Exponer método de navegación globalmente para compatibilidad
    window.mostrarSeccion = (id) => this.navigateTo(id);
    
    // Métodos específicos de navegación
    window.mostrarRecursosCurso = () => this.navigateTo('recursosCurso');
    window.volverListaCursos = () => this.navigateTo('listaCursosAlumno');
    window.abrirLectorInmersivo = () => this.navigateTo('lectorInmersivo');
    window.volverRecursos = () => this.navigateTo('recursosCurso');
    window.mostrarMiniFormulario = () => this.navigateTo('miniFormulario');
    window.volverDashboardAlumno = () => this.navigateTo('dashboardAlumno');
    
    window.completarEvaluacion = () => {
      alert('¡Evaluación completada! Ahora verás la encuesta de satisfacción.');
      this.navigateTo('encuestaSatisfaccion');
    };
    
    window.completarEncuesta = () => {
      alert('¡Gracias por tus comentarios! Aquí están tus recomendaciones personalizadas.');
      this.navigateTo('recomendaciones');
    };
  }
}