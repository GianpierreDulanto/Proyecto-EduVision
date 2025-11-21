// src/student/student-controller.js
// Controlador para el dashboard del alumno

import API from '../api/api.js';

export class StudentController {
  constructor() {
    this.cursos = [];
    this.progreso = {
      totalCursos: 0,
      cursosCompletados: 0,
      actividadesPendientes: 0,
      porcentajeCompletado: 0
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      await this.cargarDatos();
      this.setupEventListeners();
      console.log('✓ Controlador de estudiante inicializado');
    } catch (error) {
      console.error('Error al inicializar controlador de estudiante:', error);
    }
  }

  setupEventListeners() {
    // Botón de lectura inmersiva
    const btnLecturaInmersiva = document.getElementById('btnLecturaInmersiva');
    if (btnLecturaInmersiva) {
      btnLecturaInmersiva.addEventListener('click', () => this.iniciarLecturaInmersiva());
    }
    
    // Botón ver detalles de progreso
    const btnVerDetalles = document.getElementById('btnVerDetallesProgreso');
    if (btnVerDetalles) {
      btnVerDetalles.addEventListener('click', () => {
        if (window.app && window.app.router) {
          window.app.router.navigateTo('listaCursosAlumno');
        }
      });
    }
    
    // Toggles de accesibilidad rápida
    this.setupAccesibilidadToggles();
  }

  setupAccesibilidadToggles() {
    // Toggle de contraste
    const toggleContraste = document.getElementById('toggleContrasteRapido');
    if (toggleContraste) {
      // Cargar estado inicial
      if (window.app && window.app.accessibility) {
        toggleContraste.checked = window.app.accessibility.preferences.contraste || false;
      }
      
      toggleContraste.addEventListener('change', (e) => {
        if (window.app && window.app.accessibility) {
          window.app.accessibility.toggleHighContrast();
          // Actualizar estado del toggle
          toggleContraste.checked = window.app.accessibility.preferences.contraste || false;
        }
      });
    }
    
    // Toggle de tipografía
    const toggleTipografia = document.getElementById('toggleTipografiaRapida');
    if (toggleTipografia) {
      // Cargar estado inicial
      if (window.app && window.app.accessibility) {
        toggleTipografia.checked = window.app.accessibility.preferences.tipografia || false;
      }
      
      toggleTipografia.addEventListener('change', (e) => {
        if (window.app && window.app.accessibility) {
          window.app.accessibility.toggleReadableFont();
          // Actualizar estado del toggle
          toggleTipografia.checked = window.app.accessibility.preferences.tipografia || false;
        }
      });
    }
    
    // Toggle de navegación por voz
    const toggleVoz = document.getElementById('toggleNavegacionVoz');
    if (toggleVoz) {
      toggleVoz.addEventListener('change', (e) => {
        if (window.app && window.app.screenReader) {
          if (e.target.checked) {
            window.app.screenReader.activate();
          } else {
            window.app.screenReader.deactivate();
          }
        }
      });
    }
    
    // Toggle de respuesta háptica
    const toggleHaptico = document.getElementById('toggleRespuestaHaptica');
    if (toggleHaptico) {
      toggleHaptico.addEventListener('change', (e) => {
        if (window.app && window.app.accessibility) {
          // Nota: La respuesta háptica no está implementada en preferences.js
          // Por ahora solo simulamos la vibración
          if (e.target.checked && 'vibrate' in navigator) {
            navigator.vibrate(50);
          }
        }
      });
    }
  }

  async cargarDatos() {
    try {
      // Obtener datos del usuario
      const sessionData = localStorage.getItem('eduVisionSession');
      if (!sessionData) return;
      
      const session = JSON.parse(sessionData);
      const user = session.user;
      
      if (!user || user.rol !== 'alumno') return;
      
      // Actualizar nombre de bienvenida
      this.actualizarNombreBienvenida(user);
      
      // Cargar cursos del alumno
      if (user.id_alumno) {
        this.cursos = await API.getAlumnoCursos(user.id_alumno);
        this.calcularProgreso();
        this.renderProgreso();
        this.renderCursosRecientes();
      }
      
      // Cargar estado de toggles de accesibilidad
      this.cargarEstadoAccesibilidad();
    } catch (error) {
      console.error('Error al cargar datos del estudiante:', error);
    }
  }

  actualizarNombreBienvenida(user) {
    const nombreElement = document.getElementById('nombreBienvenidaAlumno');
    if (nombreElement && user.nombre) {
      nombreElement.textContent = user.nombre;
    }
  }

  calcularProgreso() {
    this.progreso.totalCursos = this.cursos.length;
    this.progreso.cursosCompletados = this.cursos.filter(c => c.finalizado).length;
    
    // Calcular actividades pendientes (simplificado: asumimos que cada curso tiene contenido)
    // En una implementación real, esto debería contar contenidos no vistos
    this.progreso.actividadesPendientes = this.cursos.length * 3; // Placeholder
    
    // Calcular porcentaje
    if (this.progreso.totalCursos > 0) {
      this.progreso.porcentajeCompletado = Math.round(
        (this.progreso.cursosCompletados / this.progreso.totalCursos) * 100
      );
    }
  }

  renderProgreso() {
    const container = document.getElementById('progresoCursosAlumno');
    if (!container) return;
    
    const porcentaje = this.progreso.porcentajeCompletado;
    const cursosCompletados = this.progreso.cursosCompletados;
    const totalCursos = this.progreso.totalCursos;
    
    container.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Progreso General</h3>
          <span class="text-2xl font-bold text-primary">${porcentaje}%</span>
        </div>
        
        <!-- Barra de progreso -->
        <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 mb-4">
          <div class="bg-primary h-4 rounded-full transition-all duration-500" 
               style="width: ${porcentaje}%"
               role="progressbar" 
               aria-valuenow="${porcentaje}" 
               aria-valuemin="0" 
               aria-valuemax="100"
               aria-label="Progreso de cursos: ${porcentaje}%">
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Cursos Inscritos</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">${totalCursos}</p>
          </div>
          <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Completados</p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">${cursosCompletados}</p>
          </div>
        </div>
        
        <button id="btnVerDetallesProgreso" 
                class="mt-4 w-full bg-primary/10 dark:bg-primary/20 text-primary font-semibold py-2 px-4 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
          <span class="material-symbols-outlined inline-block align-middle mr-2">visibility</span>
          Ver Detalles
        </button>
      </div>
    `;
    
    // Re-conectar event listener
    const btnVerDetalles = document.getElementById('btnVerDetallesProgreso');
    if (btnVerDetalles) {
      btnVerDetalles.addEventListener('click', () => {
        if (window.app && window.app.router) {
          window.app.router.navigateTo('listaCursosAlumno');
        }
      });
    }
  }

  renderCursosRecientes() {
    const container = document.getElementById('cursosRecientesAlumno');
    if (!container) return;
    
    if (this.cursos.length === 0) {
      container.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 text-center">
          <div class="text-6xl mb-4">📚</div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Aún no tienes cursos inscritos
          </h3>
          <p class="text-slate-600 dark:text-slate-400 mb-4">
            Explora nuestros cursos disponibles y comienza tu aprendizaje
          </p>
          <button onclick="window.app.router.navigateTo('listaCursosAlumno')" 
                  class="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors">
            Explorar Cursos
          </button>
        </div>
      `;
      return;
    }
    
    // Mostrar los 3 cursos más recientes
    const cursosRecientes = this.cursos.slice(0, 3);
    
    container.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Mis Cursos Recientes
        </h3>
        <div class="space-y-3">
          ${cursosRecientes.map(curso => {
            const estado = curso.finalizado ? 'Completado' : 'En progreso';
            const estadoColor = curso.finalizado 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            
            return `
              <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                   onclick="window.app.router.navigateTo('listaCursosAlumno')"
                   role="button"
                   tabindex="0"
                   onkeypress="if(event.key==='Enter') window.app.router.navigateTo('listaCursosAlumno')">
                <div class="flex-1">
                  <h4 class="font-semibold text-slate-900 dark:text-white mb-1">
                    ${this.escapeHtml(curso.titulo || 'Sin título')}
                  </h4>
                  <p class="text-sm text-slate-600 dark:text-slate-400">
                    ${this.escapeHtml(curso.docente || 'Docente no asignado')}
                  </p>
                </div>
                <span class="px-3 py-1 ${estadoColor} text-xs font-semibold rounded-full">
                  ${estado}
                </span>
              </div>
            `;
          }).join('')}
        </div>
        ${this.cursos.length > 3 ? `
          <button onclick="window.app.router.navigateTo('listaCursosAlumno')" 
                  class="mt-4 w-full text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
            Ver todos los cursos (${this.cursos.length})
          </button>
        ` : ''}
      </div>
    `;
  }

  cargarEstadoAccesibilidad() {
    // Cargar estado de toggles desde preferencias
    if (window.app && window.app.accessibility) {
      const preferences = window.app.accessibility.preferences;
      
      const toggleContraste = document.getElementById('toggleContrasteRapido');
      if (toggleContraste) {
        toggleContraste.checked = preferences.contraste || false;
      }
      
      const toggleTipografia = document.getElementById('toggleTipografiaRapida');
      if (toggleTipografia) {
        toggleTipografia.checked = preferences.tipografia || false;
      }
      
      const toggleVoz = document.getElementById('toggleNavegacionVoz');
      if (toggleVoz && window.app.screenReader) {
        toggleVoz.checked = window.app.screenReader.active || window.app.screenReader.activo || false;
      }
      
      const toggleHaptico = document.getElementById('toggleRespuestaHaptica');
      if (toggleHaptico) {
        // La respuesta háptica no está en preferences, se mantiene en false por defecto
        toggleHaptico.checked = false;
      }
    }
  }

  iniciarLecturaInmersiva() {
    // Navegar a la sección de cursos para lectura inmersiva
    if (window.app && window.app.router) {
      window.app.router.navigateTo('listaCursosAlumno');
      
      // Activar modo de lectura si está disponible
      if (window.app.screenReader && !window.app.screenReader.isEnabled()) {
        window.app.screenReader.enable();
      }
      
      // Mostrar notificación
      this.mostrarNotificacion('Modo de lectura inmersiva activado', 'success');
    }
  }

  mostrarNotificacion(mensaje, tipo = 'info') {
    const notification = document.createElement('div');
    const bgColor = tipo === 'success' ? 'bg-green-600' : 'bg-blue-600';
    notification.className = `fixed top-4 right-4 z-50 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in`;
    notification.innerHTML = `
      <span class="material-symbols-outlined">${tipo === 'success' ? 'check_circle' : 'info'}</span>
      <span>${mensaje}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Método público para recargar datos
  async recargar() {
    await this.cargarDatos();
  }
}

export default StudentController;

