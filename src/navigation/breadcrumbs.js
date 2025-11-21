// src/navigation/breadcrumbs.js
// Gestión de migas de pan (breadcrumbs)

export class BreadcrumbsManager {
  constructor(historyManager) {
    this.history = historyManager;
    this.container = document.getElementById('migasDePan');
    
    this.sectionTitles = {
      inicio: 'Inicio',
      login: 'Login',
      dashboardAlumno: 'Dashboard Alumno',
      dashboardDocente: 'Dashboard Docente',
      ajustesAccesibilidad: 'Ajustes',
      inputSubirCurso: 'Subir Curso',
      listaCursosAlumno: 'Mis Cursos',
      recursosCurso: 'Recursos del Curso',
      lectorInmersivo: 'Lector Inmersivo',
      miniFormulario: 'Formulario',
      encuestaSatisfaccion: 'Encuesta',
      recomendaciones: 'Recomendaciones'
    };

    this.exposeGlobalMethods();
  }

  update() {
    if (!this.container) return;

    const navigationHistory = this.history.getAll();
    const breadcrumbsHTML = navigationHistory.map((sectionId, index) => {
      const title = this.sectionTitles[sectionId] || sectionId;
      
      if (index === navigationHistory.length - 1) {
        // Último elemento (actual) - sin enlace
        return `<span aria-current="page">${title}</span>`;
      } else {
        // Elementos anteriores - con enlace
        return `<a href="#${sectionId}" data-index="${index}" onclick="window.retrocederA(event, ${index})">${title}</a> &gt; `;
      }
    }).join('');

    this.container.innerHTML = breadcrumbsHTML;
  }

  getSectionTitle(sectionId) {
    return this.sectionTitles[sectionId] || sectionId;
  }

  exposeGlobalMethods() {
    // Método global para retroceder en el historial
    window.retrocederA = (event, index) => {
      event.preventDefault();
      const targetSection = this.history.navigateToIndex(index);
      if (targetSection && window.app) {
        window.app.router.navigateTo(targetSection);
      }
    };

    // Método global de actualización (para compatibilidad)
    window.actualizarMigasDePan = () => this.update();
  }
}