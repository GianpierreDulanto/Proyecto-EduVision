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