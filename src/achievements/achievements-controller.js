// src/achievements/achievements-controller.js
// Controlador para sistema de logros/badges

import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

class AchievementsController {
  constructor() {
    this.currentUser = null;
    this.logros = [];
    this.logrosDesbloqueados = [];
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
   * Cargar logros del alumno
   */
  async loadAlumnoLogros(alumnoId) {
    try {
      this.logros = await API.getAlumnoLogros(alumnoId);
      this.logrosDesbloqueados = this.logros.filter(l => l.desbloqueado);
      this.renderLogros();
      return this.logros;
    } catch (error) {
      console.error('Error al cargar logros:', error);
      showNotification('Error al cargar logros', 'error');
      throw error;
    }
  }

  /**
   * Renderizar logros
   */
  renderLogros() {
    const container = document.getElementById('achievementsContainer');
    if (!container) return;

    const totalLogros = this.logros.length;
    const logrosDesbloqueados = this.logrosDesbloqueados.length;
    const porcentaje = totalLogros > 0 ? Math.round((logrosDesbloqueados / totalLogros) * 100) : 0;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header con estadísticas -->
        <div class="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-8 text-white">
          <h2 class="text-3xl font-bold mb-4">Mis Logros</h2>
          <div class="flex items-center gap-8">
            <div>
              <div class="text-5xl font-bold">${logrosDesbloqueados}/${totalLogros}</div>
              <div class="text-blue-100">Logros Desbloqueados</div>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <span class="text-blue-100">Progreso</span>
                <span class="font-bold">${porcentaje}%</span>
              </div>
              <div class="h-4 bg-blue-500/30 rounded-full overflow-hidden">
                <div class="h-full bg-white rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid de logros -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          ${this.logros.map(logro => this.renderLogroCard(logro)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderizar tarjeta de logro
   */
  renderLogroCard(logro) {
    const desbloqueado = logro.desbloqueado === true || logro.desbloqueado === 1;
    const opacity = desbloqueado ? '' : 'opacity-50 grayscale';
    const borderColor = desbloqueado ? 'border-primary' : 'border-slate-300 dark:border-slate-600';
    
    return `
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border-2 ${borderColor} ${opacity} transition-all hover:scale-105 hover:shadow-xl" 
           role="article"
           aria-label="${logro.nombre} - ${desbloqueado ? 'Desbloqueado' : 'Bloqueado'}">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" 
               style="background-color: ${logro.color}20; color: ${logro.color}">
            <span class="material-symbols-outlined text-5xl">${logro.icono || 'workspace_premium'}</span>
          </div>
          
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
            ${this.escapeHtml(logro.nombre)}
          </h3>
          
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
            ${this.escapeHtml(logro.descripcion || '')}
          </p>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-yellow-500 text-sm">star</span>
              <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">${logro.puntos}</span>
            </div>
            ${desbloqueado ? `
              <div class="flex items-center gap-1 text-green-600">
                <span class="material-symbols-outlined text-sm">check_circle</span>
                <span class="text-xs font-semibold">Desbloqueado</span>
              </div>
            ` : `
              <div class="flex items-center gap-1 text-slate-400">
                <span class="material-symbols-outlined text-sm">lock</span>
                <span class="text-xs">Bloqueado</span>
              </div>
            `}
          </div>
          
          ${desbloqueado && logro.fecha_desbloqueo ? `
            <div class="mt-3 text-xs text-slate-500 dark:text-slate-500">
              ${new Date(logro.fecha_desbloqueo).toLocaleDateString('es-ES')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Verificar y desbloquear logro automáticamente
   */
  async verificarYDesbloquearLogro(codigo, alumnoId) {
    try {
      const result = await API.verificarLogro(codigo, alumnoId);
      
      if (result.desbloqueado && !result.ya_desbloqueado) {
        showNotification(`¡Logro desbloqueado: ${result.logro.nombre}!`, 'success');
        // Recargar logros
        if (alumnoId) {
          await this.loadAlumnoLogros(alumnoId);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error al verificar logro:', error);
      return null;
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
export const achievementsController = new AchievementsController();
export default achievementsController;

