// src/reviews/reviews-controller.js
// Controlador para sistema de reviews y calificaciones con enfoque en accesibilidad

import API from '../api/api.js';
import { showNotification, sanitizeHTML } from '../utils/helpers.js';

class ReviewsController {
  constructor() {
    this.currentUser = null;
    this.currentCursoId = null;
  }

  /**
   * Inicializar controlador
   */
  init() {
    this.currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
  }

  /**
   * Cargar y renderizar reviews de un curso
   */
  async loadCourseReviews(cursoId, ordenar = 'recientes') {
    try {
      this.currentCursoId = cursoId;
      const reviews = await API.getCourseReviews(cursoId, ordenar);
      this.renderReviews(reviews, ordenar);
      return reviews;
    } catch (error) {
      console.error('Error al cargar reseñas:', error);
      showNotification('Error al cargar reseñas', 'error');
      throw error;
    }
  }

  /**
   * Renderizar lista de reviews
   */
  renderReviews(reviews, ordenActual = 'recientes') {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    // Calcular estadísticas
    const stats = this.calculateStats(reviews);

    container.innerHTML = `
      <div class="space-y-6" role="region" aria-label="Reseñas del curso">
        <!-- Header con estadísticas -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
            <div>
              <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Reseñas de Estudiantes
              </h2>
              <p class="text-slate-600 dark:text-slate-400">
                ${reviews.length} ${reviews.length === 1 ? 'reseña' : 'reseñas'} en total
              </p>
            </div>

            <!-- Resumen de calificaciones -->
            <div class="flex items-center gap-6">
              <div class="text-center">
                <div class="text-5xl font-bold text-slate-900 dark:text-white mb-1">
                  ${stats.promedioGeneral.toFixed(1)}
                </div>
                <div class="flex items-center justify-center gap-1 mb-1" aria-label="Calificación promedio: ${stats.promedioGeneral} de 5 estrellas">
                  ${this.renderStars(stats.promedioGeneral)}
                </div>
                <p class="text-sm text-slate-600 dark:text-slate-400">Calificación general</p>
              </div>

              ${stats.promedioAccesibilidad > 0 ? `
                <div class="text-center border-l-2 border-slate-200 dark:border-slate-700 pl-6">
                  <div class="text-5xl font-bold text-primary mb-1">
                    ${stats.promedioAccesibilidad.toFixed(1)}
                  </div>
                  <div class="flex items-center justify-center gap-1 mb-1" aria-label="Calificación de accesibilidad: ${stats.promedioAccesibilidad} de 5 estrellas">
                    ${this.renderStars(stats.promedioAccesibilidad, 'text-primary')}
                  </div>
                  <p class="text-sm text-slate-600 dark:text-slate-400">Accesibilidad</p>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Distribución de calificaciones -->
          <div class="space-y-2 mb-6">
            ${[5, 4, 3, 2, 1].map(stars => {
              const count = stats.distribucion[stars] || 0;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return `
                <div class="flex items-center gap-3">
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-300 w-12">
                    ${stars} ${stars === 1 ? 'estrella' : 'estrellas'}
                  </span>
                  <div class="flex-1 h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-yellow-400 transition-all duration-500"
                      style="width: ${percentage}%"
                      role="progressbar"
                      aria-valuenow="${percentage}"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="${count} reseñas con ${stars} estrellas"
                    ></div>
                  </div>
                  <span class="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                    ${count}
                  </span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Controles de ordenamiento -->
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Ordenar por:</span>
            <div class="flex gap-2" role="radiogroup" aria-label="Ordenar reseñas">
              ${['recientes', 'utiles', 'calificacion'].map(orden => `
                <button 
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    ordenActual === orden 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }"
                  data-orden="${orden}"
                  role="radio"
                  aria-checked="${ordenActual === orden}"
                  aria-label="Ordenar por ${orden === 'recientes' ? 'más recientes' : orden === 'utiles' ? 'más útiles' : 'calificación'}"
                >
                  ${orden === 'recientes' ? 'Más Recientes' : orden === 'utiles' ? 'Más Útiles' : 'Mejor Calificación'}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Botón para escribir reseña (solo si es alumno inscrito) -->
        ${this.currentUser.rol === 'alumno' ? `
          <button 
            id="btnWriteReview"
            class="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Escribir una reseña"
          >
            <span class="material-symbols-outlined text-2xl">rate_review</span>
            <span>Escribir una Reseña</span>
          </button>
        ` : ''}

        <!-- Lista de reseñas -->
        <div class="space-y-4">
          ${reviews.length === 0 ? `
            <div class="bg-white dark:bg-slate-800 rounded-xl p-12 text-center">
              <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">rate_review</span>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Aún no hay reseñas</h3>
              <p class="text-slate-600 dark:text-slate-400">Sé el primero en compartir tu experiencia con este curso</p>
            </div>
          ` : reviews.map(review => this.renderReviewCard(review)).join('')}
        </div>
      </div>
    `;

    // Event listeners para ordenamiento
    container.querySelectorAll('[data-orden]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orden = e.currentTarget.dataset.orden;
        this.loadCourseReviews(this.currentCursoId, orden);
      });
    });

    // Event listener para botón escribir reseña
    const btnWriteReview = document.getElementById('btnWriteReview');
    if (btnWriteReview) {
      btnWriteReview.addEventListener('click', () => this.showReviewModal());
    }
  }

  /**
   * Renderizar tarjeta individual de reseña
   */
  renderReviewCard(review) {
    return `
      <article 
        class="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 transition-shadow hover:shadow-xl"
        aria-label="Reseña de ${review.nombre_alumno}"
      >
        <!-- Header de la reseña -->
        <div class="flex items-start gap-4 mb-4">
          <img 
            src="${review.avatar_alumno || '/uploads/default-avatar.png'}" 
            alt="Avatar de ${review.nombre_alumno}"
            class="w-12 h-12 rounded-full object-cover"
          />
          <div class="flex-1">
            <h3 class="font-bold text-slate-900 dark:text-white mb-1">
              ${sanitizeHTML(review.nombre_alumno)}
            </h3>
            <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <div class="flex items-center gap-1" aria-label="Calificación: ${review.calificacion} de 5 estrellas">
                ${this.renderStars(review.calificacion)}
              </div>
              <time datetime="${review.fecha_publicacion}">
                ${new Date(review.fecha_publicacion).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              ${review.accesibilidad_calificacion ? `
                <span class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                  <span class="material-symbols-outlined text-base">accessibility_new</span>
                  Accesibilidad: ${review.accesibilidad_calificacion}/5
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Contenido de la reseña -->
        ${review.titulo ? `
          <h4 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
            ${sanitizeHTML(review.titulo)}
          </h4>
        ` : ''}
        
        ${review.comentario ? `
          <p class="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
            ${sanitizeHTML(review.comentario)}
          </p>
        ` : ''}

        <!-- Aspectos positivos y a mejorar -->
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          ${review.aspectos_positivos ? `
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h5 class="flex items-center gap-2 text-green-800 dark:text-green-300 font-semibold mb-2">
                <span class="material-symbols-outlined text-xl">thumb_up</span>
                Aspectos Positivos
              </h5>
              <p class="text-green-700 dark:text-green-200 text-sm">
                ${sanitizeHTML(review.aspectos_positivos)}
              </p>
            </div>
          ` : ''}
          ${review.aspectos_mejorar ? `
            <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <h5 class="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold mb-2">
                <span class="material-symbols-outlined text-xl">lightbulb</span>
                A Mejorar
              </h5>
              <p class="text-amber-700 dark:text-amber-200 text-sm">
                ${sanitizeHTML(review.aspectos_mejorar)}
              </p>
            </div>
          ` : ''}
        </div>

        <!-- Respuesta del docente -->
        ${review.respuesta_docente ? `
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border-l-4 border-blue-500">
            <h5 class="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-semibold mb-2">
              <span class="material-symbols-outlined text-xl">reply</span>
              Respuesta del Docente
            </h5>
            <p class="text-blue-700 dark:text-blue-200 text-sm">
              ${sanitizeHTML(review.respuesta_docente)}
            </p>
            <time class="text-xs text-blue-600 dark:text-blue-400 mt-2 block">
              ${new Date(review.fecha_respuesta).toLocaleDateString('es-ES')}
            </time>
          </div>
        ` : ''}

        <!-- Botones de acción -->
        <div class="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button 
            class="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-lg px-3 py-2"
            data-review-id="${review.id_resena}"
            data-action="vote"
            aria-label="Marcar esta reseña como útil (${review.util_count} personas la encontraron útil)"
          >
            <span class="material-symbols-outlined">thumb_up</span>
            <span class="font-medium">${review.util_count}</span>
            <span class="sr-only">personas encontraron esta reseña útil</span>
          </button>

          ${this.currentUser.rol === 'docente' && !review.respuesta_docente ? `
            <button 
              class="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2 ml-auto"
              data-review-id="${review.id_resena}"
              data-action="respond"
              aria-label="Responder a esta reseña"
            >
              <span class="material-symbols-outlined">reply</span>
              <span class="font-medium">Responder</span>
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  /**
   * Renderizar estrellas
   */
  renderStars(rating, colorClass = 'text-yellow-400') {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';
    
    // Estrellas completas
    for (let i = 0; i < fullStars; i++) {
      stars += `<span class="material-symbols-outlined ${colorClass} text-xl" aria-hidden="true">star</span>`;
    }
    
    // Media estrella
    if (hasHalfStar) {
      stars += `<span class="material-symbols-outlined ${colorClass} text-xl" aria-hidden="true">star_half</span>`;
    }
    
    // Estrellas vacías
    for (let i = 0; i < emptyStars; i++) {
      stars += `<span class="material-symbols-outlined text-slate-300 dark:text-slate-600 text-xl" aria-hidden="true">star</span>`;
    }

    return stars;
  }

  /**
   * Calcular estadísticas
   */
  calculateStats(reviews) {
    const stats = {
      promedioGeneral: 0,
      promedioAccesibilidad: 0,
      distribucion: {}
    };

    if (reviews.length === 0) return stats;

    let sumaGeneral = 0;
    let sumaAccesibilidad = 0;
    let countAccesibilidad = 0;

    reviews.forEach(review => {
      sumaGeneral += review.calificacion;
      
      if (review.accesibilidad_calificacion) {
        sumaAccesibilidad += review.accesibilidad_calificacion;
        countAccesibilidad++;
      }

      stats.distribucion[review.calificacion] = (stats.distribucion[review.calificacion] || 0) + 1;
    });

    stats.promedioGeneral = sumaGeneral / reviews.length;
    stats.promedioAccesibilidad = countAccesibilidad > 0 ? sumaAccesibilidad / countAccesibilidad : 0;

    return stats;
  }

  /**
   * Mostrar modal para escribir reseña
   */
  showReviewModal() {
    // Este método se implementará cuando se agregue el modal al HTML
    console.log('Mostrar modal de reseña');
    showNotification('Funcionalidad de reseñas disponible próximamente', 'info');
  }

  /**
   * Crear reseña
   */
  async createReview(cursoId, reviewData) {
    try {
      const result = await API.createReview(cursoId, {
        alumno_id: this.currentUser.id_alumno,
        ...reviewData
      });
      
      showNotification('¡Reseña publicada exitosamente!', 'success');
      
      // Recargar reseñas
      await this.loadCourseReviews(cursoId);
      
      return result;
    } catch (error) {
      console.error('Error al crear reseña:', error);
      showNotification(error.message || 'Error al publicar reseña', 'error');
      throw error;
    }
  }

  /**
   * Votar reseña como útil
   */
  async voteReview(resenaId, tipo = 'util') {
    try {
      await API.voteReview(resenaId, this.currentUser.id_usuario, tipo);
      showNotification('Voto registrado', 'success');
      
      // Recargar reseñas
      if (this.currentCursoId) {
        await this.loadCourseReviews(this.currentCursoId);
      }
    } catch (error) {
      console.error('Error al votar reseña:', error);
      showNotification(error.message || 'Error al registrar voto', 'error');
    }
  }

  /**
   * Responder a reseña (docente)
   */
  async respondToReview(resenaId, respuesta) {
    try {
      await API.respondToReview(resenaId, this.currentUser.id_docente, respuesta);
      showNotification('Respuesta publicada correctamente', 'success');
      
      // Recargar reseñas
      if (this.currentCursoId) {
        await this.loadCourseReviews(this.currentCursoId);
      }
    } catch (error) {
      console.error('Error al responder reseña:', error);
      showNotification('Error al publicar respuesta', 'error');
    }
  }
}

// Exportar instancia única
export const reviewsController = new ReviewsController();
export default reviewsController;

