// src/notifications/notifications-controller.js
// Controlador para sistema de notificaciones

import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

class NotificationsController {
  constructor() {
    this.currentUser = null;
    this.notifications = [];
    this.unreadCount = 0;
    this.filter = 'all'; // all, unread, read
    this.pollingInterval = null;
  }

  /**
   * Inicializar controlador
   */
  init() {
    const sessionData = localStorage.getItem('eduVisionSession');
    if (sessionData) {
      const session = JSON.parse(sessionData);
      this.currentUser = session.user;
      
      if (this.currentUser?.id_usuario) {
        this.loadNotifications();
        this.startPolling();
        this.setupEventListeners();
      }
    }
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Botón de notificaciones en navbar
    const btnNotifications = document.getElementById('btnNotifications');
    if (btnNotifications) {
      btnNotifications.addEventListener('click', () => this.toggleNotificationsCenter());
    }

    // Cerrar centro de notificaciones al hacer clic fuera
    document.addEventListener('click', (e) => {
      const center = document.getElementById('notificationsCenter');
      const btn = document.getElementById('btnNotifications');
      if (center && !center.contains(e.target) && !btn?.contains(e.target)) {
        center.classList.add('hidden');
      }
    });
  }

  /**
   * Cargar notificaciones
   */
  async loadNotifications(filter = null) {
    if (!this.currentUser?.id_usuario) return;

    try {
      const leida = filter === 'unread' ? false : filter === 'read' ? true : null;
      this.notifications = await API.getNotifications(this.currentUser.id_usuario, leida);
      this.updateUnreadCount();
      this.renderNotifications();
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  }

  /**
   * Actualizar contador de no leídas
   */
  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.leida).length;
    this.updateBadge();
  }

  /**
   * Actualizar badge en el botón
   */
  updateBadge() {
    const btn = document.getElementById('btnNotifications');
    if (btn) {
      const badge = btn.querySelector('.notification-badge');
      if (badge) {
        if (this.unreadCount > 0) {
          badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    }
  }

  /**
   * Renderizar notificaciones
   */
  renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">notifications_off</span>
          <p class="text-slate-600 dark:text-slate-400">No hay notificaciones</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.notifications.map(notif => this.renderNotificationCard(notif)).join('');

    // Agregar event listeners
    container.querySelectorAll('[data-notification-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.notificationId);
        this.handleNotificationClick(id);
      });
    });
  }

  /**
   * Renderizar tarjeta de notificación
   */
  renderNotificationCard(notif) {
    const icon = this.getNotificationIcon(notif.tipo);
    const timeAgo = this.getTimeAgo(notif.fecha_creacion);
    const unreadClass = !notif.leida ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : '';

    return `
      <div class="notification-card p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${unreadClass}" 
           data-notification-id="${notif.id_notificacion}"
           role="button"
           tabindex="0"
           aria-label="Notificación: ${notif.titulo}">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary text-xl">${icon}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-semibold text-slate-900 dark:text-white ${!notif.leida ? 'font-bold' : ''}">
                ${this.escapeHtml(notif.titulo)}
              </h4>
              ${!notif.leida ? `
                <span class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full" aria-label="No leída"></span>
              ` : ''}
            </div>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
              ${this.escapeHtml(notif.mensaje)}
            </p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-slate-500 dark:text-slate-500">${timeAgo}</span>
              <button 
                onclick="event.stopPropagation(); window.app.notifications.markAsRead(${notif.id_notificacion})"
                class="text-xs text-primary hover:text-primary/80 transition-colors"
                aria-label="Marcar como leída">
                Marcar como leída
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Obtener icono según tipo de notificación
   */
  getNotificationIcon(tipo) {
    const icons = {
      'curso_aprobado': 'check_circle',
      'curso_rechazado': 'cancel',
      'nuevo_curso': 'school',
      'leccion_completada': 'task_alt',
      'certificado': 'workspace_premium',
      'mensaje': 'mail',
      'sistema': 'info',
      'default': 'notifications'
    };
    return icons[tipo] || icons.default;
  }

  /**
   * Obtener tiempo transcurrido
   */
  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES');
  }

  /**
   * Manejar clic en notificación
   */
  async handleNotificationClick(notificationId) {
    const notif = this.notifications.find(n => n.id_notificacion === notificationId);
    if (!notif) return;

    // Marcar como leída si no lo está
    if (!notif.leida) {
      await this.markAsRead(notificationId);
    }

    // Navegar a la URL si existe
    if (notif.url) {
      window.app.router.navigateTo(notif.url);
      this.toggleNotificationsCenter();
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId) {
    try {
      await API.markNotificationRead(notificationId);
      
      // Actualizar en local
      const notif = this.notifications.find(n => n.id_notificacion === notificationId);
      if (notif) {
        notif.leida = true;
      }
      
      this.updateUnreadCount();
      this.renderNotifications();
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead() {
    if (!this.currentUser?.id_usuario) return;

    try {
      await API.markAllNotificationsRead(this.currentUser.id_usuario);
      await this.loadNotifications();
      showNotification('Todas las notificaciones marcadas como leídas', 'success');
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      showNotification('Error al marcar notificaciones', 'error');
    }
  }

  /**
   * Alternar centro de notificaciones
   */
  toggleNotificationsCenter() {
    const center = document.getElementById('notificationsCenter');
    if (center) {
      center.classList.toggle('hidden');
      if (!center.classList.contains('hidden')) {
        this.loadNotifications(this.filter);
      }
    }
  }

  /**
   * Cambiar filtro
   */
  setFilter(filter) {
    this.filter = filter;
    this.loadNotifications(filter);
    
    // Actualizar UI de filtros
    document.querySelectorAll('[data-filter]').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('bg-primary', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-300');
      } else {
        btn.classList.remove('bg-primary', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-700', 'dark:bg-slate-700', 'dark:text-slate-300');
      }
    });
  }

  /**
   * Iniciar polling para nuevas notificaciones
   */
  startPolling() {
    // Poll cada 30 segundos
    this.pollingInterval = setInterval(() => {
      if (this.currentUser?.id_usuario) {
        this.loadNotifications();
      }
    }, 30000);
  }

  /**
   * Detener polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
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
export const notificationsController = new NotificationsController();
export default notificationsController;

