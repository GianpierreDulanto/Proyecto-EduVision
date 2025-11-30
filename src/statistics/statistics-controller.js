// src/statistics/statistics-controller.js
// Controlador para estadísticas avanzadas

import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

class StatisticsController {
  constructor() {
    this.currentUser = null;
    this.charts = {};
  }

  /**
   * Inicializar controlador
   */
  init() {
    const sessionData = localStorage.getItem('eduVisionSession');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      this.currentUser = session.user;
    }
  }

  /**
   * Cargar estadísticas del alumno
   */
  async loadStudentStatistics(alumnoId) {
    try {
      const progreso = await API.getAlumnoProgreso(alumnoId);
      this.renderStudentStatistics(progreso);
      return progreso;
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      showNotification('Error al cargar estadísticas', 'error');
      throw error;
    }
  }

  /**
   * Renderizar estadísticas del alumno
   */
  renderStudentStatistics(progreso) {
    const container = document.getElementById('statisticsContainer');
    if (!container) return;

    // Calcular datos para gráficos
    const cursosCompletados = progreso.cursos?.filter(c => c.porcentaje_completado === 100).length || 0;
    const cursosEnProgreso = progreso.cursos?.filter(c => c.porcentaje_completado > 0 && c.porcentaje_completado < 100).length || 0;
    const cursosNoIniciados = progreso.cursos?.filter(c => c.porcentaje_completado === 0).length || 0;

    // Calcular progreso temporal (últimos 30 días)
    const progresoTemporal = this.calculateTemporalProgress(progreso);

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Resumen General -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Cursos Completados</p>
                <p class="text-3xl font-bold text-green-600">${cursosCompletados}</p>
              </div>
              <span class="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
            </div>
          </div>
          
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">En Progreso</p>
                <p class="text-3xl font-bold text-blue-600">${cursosEnProgreso}</p>
              </div>
              <span class="material-symbols-outlined text-blue-600 text-5xl">trending_up</span>
            </div>
          </div>
          
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Lecciones Completadas</p>
                <p class="text-3xl font-bold text-purple-600">${progreso.total_lecciones_completadas || 0}</p>
              </div>
              <span class="material-symbols-outlined text-purple-600 text-5xl">task_alt</span>
            </div>
          </div>
          
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Progreso Promedio</p>
                <p class="text-3xl font-bold text-orange-600">${this.calculateAverageProgress(progreso)}%</p>
              </div>
              <span class="material-symbols-outlined text-orange-600 text-5xl">percent</span>
            </div>
          </div>
        </div>

        <!-- Gráficos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Gráfico de Estado de Cursos -->
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Estado de Cursos</h3>
            <div style="height: 300px; position: relative;">
              <canvas id="chartEstadoCursos"></canvas>
            </div>
          </div>
          
          <!-- Gráfico de Progreso Temporal -->
          <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Progreso (Últimos 30 días)</h3>
            <div style="height: 300px; position: relative;">
              <canvas id="chartProgresoTemporal"></canvas>
            </div>
          </div>
        </div>

        <!-- Tabla de Progreso por Curso -->
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Progreso por Curso</h3>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-slate-200 dark:border-slate-700">
                  <th class="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Curso</th>
                  <th class="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Progreso</th>
                  <th class="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Lecciones</th>
                  <th class="text-center py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${(progreso.cursos || []).map(curso => `
                  <tr class="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td class="py-3 px-4">
                      <div class="font-semibold text-slate-900 dark:text-white">${this.escapeHtml(curso.titulo || 'Sin título')}</div>
                    </td>
                    <td class="py-3 px-4 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <div class="w-32 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-primary rounded-full transition-all" style="width: ${curso.porcentaje_completado || 0}%"></div>
                        </div>
                        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">${curso.porcentaje_completado || 0}%</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-center text-sm text-slate-600 dark:text-slate-400">
                      ${curso.lecciones_completadas || 0} / ${curso.total_lecciones || 0}
                    </td>
                    <td class="py-3 px-4 text-center">
                      ${curso.porcentaje_completado === 100 ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold">
                          <span class="material-symbols-outlined text-sm">check_circle</span>
                          Completado
                        </span>
                      ` : curso.porcentaje_completado > 0 ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold">
                          <span class="material-symbols-outlined text-sm">trending_up</span>
                          En Progreso
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 rounded-full text-xs font-semibold">
                          No Iniciado
                        </span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Renderizar gráficos después de que el HTML esté en el DOM
    setTimeout(() => {
      this.renderCharts(cursosCompletados, cursosEnProgreso, cursosNoIniciados, progresoTemporal);
    }, 100);
  }

  /**
   * Calcular progreso temporal
   */
  calculateTemporalProgress(progreso) {
    // Simular datos de los últimos 30 días
    const dias = [];
    const lecciones = [];
    
    for (let i = 29; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      dias.push(fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
      
      // Simular progreso (en producción esto vendría del backend)
      const base = progreso.total_lecciones_completadas || 0;
      lecciones.push(Math.max(0, base - (29 - i) * 2 + Math.floor(Math.random() * 3)));
    }
    
    return { dias, lecciones };
  }

  /**
   * Calcular progreso promedio
   */
  calculateAverageProgress(progreso) {
    if (!progreso.cursos || progreso.cursos.length === 0) return 0;
    const suma = progreso.cursos.reduce((acc, curso) => acc + (curso.porcentaje_completado || 0), 0);
    return Math.round(suma / progreso.cursos.length);
  }

  /**
   * Renderizar gráficos
   */
  renderCharts(cursosCompletados, cursosEnProgreso, cursosNoIniciados, progresoTemporal) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    // Gráfico de Estado de Cursos (Doughnut)
    const ctxEstadoCursos = document.getElementById('chartEstadoCursos');
    if (ctxEstadoCursos && typeof Chart !== 'undefined') {
      if (this.charts.estadoCursos) {
        this.charts.estadoCursos.destroy();
      }
      
      this.charts.estadoCursos = new Chart(ctxEstadoCursos, {
        type: 'doughnut',
        data: {
          labels: ['Completados', 'En Progreso', 'No Iniciados'],
          datasets: [{
            data: [cursosCompletados, cursosEnProgreso, cursosNoIniciados],
            backgroundColor: ['#10b981', '#3b82f6', '#94a3b8'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor }
            }
          }
        }
      });
    }
    
    // Gráfico de Progreso Temporal (Line)
    const ctxProgresoTemporal = document.getElementById('chartProgresoTemporal');
    if (ctxProgresoTemporal && typeof Chart !== 'undefined') {
      if (this.charts.progresoTemporal) {
        this.charts.progresoTemporal.destroy();
      }
      
      this.charts.progresoTemporal = new Chart(ctxProgresoTemporal, {
        type: 'line',
        data: {
          labels: progresoTemporal.dias,
          datasets: [{
            label: 'Lecciones Completadas',
            data: progresoTemporal.lecciones,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: textColor }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            x: {
              ticks: { color: textColor, maxRotation: 45, minRotation: 45 },
              grid: { color: gridColor }
            }
          }
        }
      });
    }
  }

  /**
   * Exportar reporte
   */
  async exportReport(alumnoId, formato = 'json') {
    try {
      const progreso = await API.getAlumnoProgreso(alumnoId);
      
      if (formato === 'json') {
        const dataStr = JSON.stringify(progreso, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte-progreso-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Reporte exportado correctamente', 'success');
      }
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      showNotification('Error al exportar reporte', 'error');
    }
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Exportar instancia única
export const statisticsController = new StatisticsController();
export default statisticsController;

