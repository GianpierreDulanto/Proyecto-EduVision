// src/utils/helpers.js
// Funciones de utilidad compartidas

/**
 * Formatea segundos en formato mm:ss
 * @param {number} seconds - Segundos a formatear
 * @returns {string} Tiempo formateado
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Verifica si un elemento es visible en el DOM
 * @param {HTMLElement} element - Elemento a verificar
 * @returns {boolean} True si es visible
 */
export function isElementVisible(element) {
  if (!element) return false;
  
  const styles = window.getComputedStyle(element);
  return element.offsetParent !== null && 
         styles.display !== 'none' && 
         styles.visibility !== 'hidden' &&
         styles.opacity !== '0';
}

/**
 * Scroll suave a un elemento
 * @param {HTMLElement} element - Elemento al que hacer scroll
 * @param {string} block - Posición del scroll ('start', 'center', 'end')
 */
export function smoothScrollTo(element, block = 'center') {
  if (!element) return;
  
  element.scrollIntoView({
    behavior: 'smooth',
    block: block,
    inline: 'nearest'
  });
}

/**
 * Debounce de una función
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle de una función
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} Función throttled
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Sanitiza texto HTML
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
export function sanitizeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Obtiene el texto accesible de un elemento
 * @param {HTMLElement} element - Elemento del que obtener texto
 * @returns {string} Texto accesible
 */
export function getAccessibleText(element) {
  if (!element) return '';
  
  // Prioridad: aria-label > alt > title > placeholder > textContent
  return element.getAttribute('aria-label') ||
         element.getAttribute('alt') ||
         element.getAttribute('title') ||
         element.getAttribute('placeholder') ||
         element.textContent.trim();
}

/**
 * Genera un ID único
 * @param {string} prefix - Prefijo del ID
 * @returns {string} ID único
 */
export function generateUniqueId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convierte una cadena a kebab-case
 * @param {string} str - Cadena a convertir
 * @returns {string} Cadena en kebab-case
 */
export function toKebabCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Convierte una cadena a camelCase
 * @param {string} str - Cadena a convertir
 * @returns {string} Cadena en camelCase
 */
export function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

/**
 * Espera un tiempo determinado (promesa)
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promesa que se resuelve después del tiempo
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtiene el valor de un parámetro de URL
 * @param {string} param - Nombre del parámetro
 * @returns {string|null} Valor del parámetro o null
 */
export function getURLParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} True si se copió correctamente
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Error al copiar:', err);
    return false;
  }
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @returns {string} Número formateado
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @param {string} suffix - Sufijo a agregar (por defecto '...')
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Detecta si el dispositivo es móvil
 * @returns {boolean} True si es móvil
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detecta el navegador
 * @returns {string} Nombre del navegador
 */
export function detectBrowser() {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  
  return 'Unknown';
}

/**
 * Agrupa un array de objetos por una clave
 * @param {Array} array - Array a agrupar
 * @param {string} key - Clave por la que agrupar
 * @returns {Object} Objeto con grupos
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Elimina duplicados de un array
 * @param {Array} array - Array con posibles duplicados
 * @returns {Array} Array sin duplicados
 */
export function removeDuplicates(array) {
  return [...new Set(array)];
}

/**
 * Ordena un array de objetos por una clave
 * @param {Array} array - Array a ordenar
 * @param {string} key - Clave por la que ordenar
 * @param {string} order - Orden ('asc' o 'desc')
 * @returns {Array} Array ordenado
 */
export function sortBy(array, key, order = 'asc') {
  return array.sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
}

/**
 * Muestra una notificación al usuario
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success', 'error', 'warning', 'info')
 * @param {number} duration - Duración en ms (0 = permanente)
 */
export function showNotification(message, type = 'info', duration = 3000) {
  // Validar que el mensaje no esté vacío
  if (!message || typeof message !== 'string') {
    console.warn('showNotification: mensaje inválido', message);
    return;
  }

  // Asegurar que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => showNotification(message, type, duration));
    return;
  }

  // Crear contenedor de notificaciones si no existe
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    // Estilos inline como fallback - IMPORTANTE: usar !important para sobrescribir CSS
    container.style.cssText = 'position: fixed !important; top: 20px !important; right: 20px !important; z-index: 99999 !important; max-width: 400px !important; display: flex !important; flex-direction: column !important; gap: 10px !important; left: auto !important; width: auto !important; height: auto !important; overflow: visible !important;';
    container.className = 'fixed top-4 right-4 z-[9999] space-y-2 max-w-md';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Notificaciones');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  // Crear notificación
  const notification = document.createElement('div');
  const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  notification.id = id;
  
  // Colores según tipo (con fallback inline)
  const colors = {
    success: { bg: '#10b981', border: '#059669' }, // green-500, green-600
    error: { bg: '#ef4444', border: '#dc2626' },   // red-500, red-600
    warning: { bg: '#f59e0b', border: '#d97706' },  // amber-500, amber-600
    info: { bg: '#3b82f6', border: '#2563eb' }     // blue-500, blue-600
  };
  
  const color = colors[type] || colors.info;
  
  // Estilos inline como fallback - IMPORTANTE: usar !important para sobrescribir CSS
  notification.style.cssText = `
    background-color: ${color.bg} !important;
    border: 2px solid ${color.border} !important;
    color: white !important;
    padding: 16px 24px !important;
    border-radius: 8px !important;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    min-width: 300px !important;
    max-width: 400px !important;
    transform: translateX(400px) !important;
    opacity: 0 !important;
    transition: transform 0.3s ease, opacity 0.3s ease !important;
    position: relative !important;
    left: auto !important;
    right: auto !important;
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
    z-index: 99999 !important;
  `;
  
  // Clases de Tailwind (si están disponibles)
  notification.className = `text-white px-6 py-4 rounded-lg shadow-2xl border-2 flex items-center gap-3 min-w-[300px] max-w-md transform transition-all duration-300`;
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };

  // Usar aria-live assertive para errores (más importante)
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', ariaLive);
  notification.setAttribute('aria-atomic', 'true');
  
  // Crear estructura HTML
  const iconSpan = document.createElement('span');
  iconSpan.className = 'material-symbols-outlined';
  iconSpan.style.cssText = 'font-size: 24px; flex-shrink: 0;';
  iconSpan.textContent = icons[type] || icons.info;
  iconSpan.setAttribute('aria-hidden', 'true');
  
  const messageP = document.createElement('p');
  messageP.className = 'flex-1 font-medium text-base leading-relaxed';
  messageP.style.cssText = 'flex: 1; font-weight: 500; font-size: 16px; line-height: 1.5; margin: 0;';
  messageP.textContent = message; // Usar textContent en lugar de innerHTML para seguridad
  
  const closeButton = document.createElement('button');
  closeButton.id = `close-${id}`;
  closeButton.className = 'text-white/80 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded p-1 flex-shrink-0';
  closeButton.style.cssText = 'background: transparent; border: none; color: rgba(255,255,255,0.8); cursor: pointer; padding: 4px; border-radius: 4px; flex-shrink: 0;';
  closeButton.setAttribute('aria-label', 'Cerrar notificación');
  closeButton.setAttribute('type', 'button');
  
  const closeIcon = document.createElement('span');
  closeIcon.className = 'material-symbols-outlined';
  closeIcon.style.cssText = 'font-size: 20px;';
  closeIcon.textContent = 'close';
  closeButton.appendChild(closeIcon);
  
  // Agregar elementos
  notification.appendChild(iconSpan);
  notification.appendChild(messageP);
  notification.appendChild(closeButton);

  // Agregar evento de cierre
  closeButton.addEventListener('click', () => {
    removeNotification(notification);
  });

  // Agregar al contenedor
  container.appendChild(notification);

  // Forzar reflow y luego animar entrada
  notification.offsetHeight; // Trigger reflow
  
  setTimeout(() => {
    notification.style.setProperty('transform', 'translateX(0)', 'important');
    notification.style.setProperty('opacity', '1', 'important');
  }, 50);

  // Auto-remover si tiene duración
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(notification);
    }, duration);
  }

  return notification;
}

/**
 * Remueve una notificación con animación
 */
function removeNotification(notification) {
  if (!notification || !notification.parentNode) return;
  
  notification.style.setProperty('transform', 'translateX(400px)', 'important');
  notification.style.setProperty('opacity', '0', 'important');
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
    
    // Limpiar contenedor si está vacío
    const container = document.getElementById('notification-container');
    if (container && container.children.length === 0) {
      container.remove();
    }
  }, 300);
} 