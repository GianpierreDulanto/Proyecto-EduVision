// src/survey/survey-controller.js
// Controlador para encuestas de satisfacción del curso

import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

class SurveyController {
  constructor() {
    this.currentUser = null;
    this.currentCurso = null;
  }

  /**
   * Inicializar controlador
   */
  init() {
    // Intentar obtener usuario de la sesión
    try {
      const sessionData = JSON.parse(localStorage.getItem('eduVisionSession') || '{}');
      this.currentUser = sessionData.user || {};
    } catch (e) {
      // Fallback al método anterior por compatibilidad
      this.currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
    }
  }

  /**
   * Mostrar encuesta para un curso
   */
  async showSurvey(cursoId) {
    try {
      // Obtener información del curso
      const curso = await API.getCurso(cursoId);
      this.currentCurso = curso;
      
      this.renderSurveyModal();
    } catch (error) {
      console.error('Error al cargar encuesta:', error);
      showNotification('Error al cargar la encuesta', 'error');
    }
  }

  /**
   * Renderizar modal de encuesta
   */
  renderSurveyModal() {
    //Remover modal existente
    const existing = document.getElementById('surveyModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'surveyModal';
    modal.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'surveyTitle');

    modal.innerHTML = `
      <div class="bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-primary to-blue-600 px-8 py-6 text-center">
          <h2 id="surveyTitle" class="text-3xl font-bold text-white mb-2">
            Encuesta de satisfacción con el curso
          </h2>
          <p class="text-blue-100">
            Sus comentarios nos ayudan a mejorar nuestros cursos. Por favor, responda honestamente las siguientes preguntas.
          </p>
        </div>

        <!-- Form -->
        <form id="surveyForm" class="p-8 space-y-6" onsubmit="window.surveyController.submitSurvey(event)">
          <!-- Selección del curso -->
          <div>
            <label for="surveyCurso" class="block text-sm font-semibold text-slate-300 mb-2">
              Seleccione el curso
            </label>
            <div class="relative">
              <select 
                id="surveyCurso" 
                name="curso_id"
                class="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors appearance-none cursor-pointer"
                required
              >
                <option value="${this.currentCurso.id_curso}" selected>
                  ${this.escapeHtml(this.currentCurso.titulo)}
                </option>
              </select>
              <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <!-- Pregunta 1: Lo que más gustó -->
          <div>
            <label for="surveyPositivo" class="block text-sm font-semibold text-slate-300 mb-2">
              ¿Qué fue lo que más te gustó del curso?
            </label>
            <textarea 
              id="surveyPositivo" 
              name="lo_que_gusto"
              rows="4"
              class="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
              placeholder="p. ej., las explicaciones claras, los ejemplos prácticos..."
              required
            ></textarea>
          </div>

          <!-- Pregunta 2: Lo que se podría mejorar -->
          <div>
            <label for="surveyMejorar" class="block text-sm font-semibold text-slate-300 mb-2">
              ¿Qué se podría mejorar?
            </label>
            <textarea 
              id="surveyMejorar" 
              name="que_mejorar"
              rows="4"
              class="w-full px-4 py-3 bg-slate-800 border-2 border-slate-700 text-white rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
              placeholder="p. ej., más ejercicios interactivos, un ritmo diferente..."
              required
            ></textarea>
          </div>

          <!-- Pregunta 3: Satisfacción general -->
          <div>
            <label class="block text-sm font-semibold text-slate-300 mb-3">
              En general, ¿qué tan satisfecho/a estuvo con el curso?
            </label>
            <div class="space-y-2" role="radiogroup" aria-label="Nivel de satisfacción">
              ${this.renderSatisfactionOptions()}
            </div>
          </div>

          <!-- Botones -->
          <div class="flex gap-4 pt-6 border-t border-slate-700">
            <button 
              type="button" 
              onclick="document.getElementById('surveyModal').remove()" 
              class="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              aria-label="Cancelar encuesta"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              class="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label="Enviar comentarios"
            >
              Enviar comentarios
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Cerrar con Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Renderizar opciones de satisfacción
   */
  renderSatisfactionOptions() {
    const options = [
      { value: 5, label: 'Muy satisfecho', emoji: '😄', color: 'green' },
      { value: 4, label: 'Satisfecho', emoji: '🙂', color: 'blue' },
      { value: 3, label: 'Neutral', emoji: '😐', color: 'yellow' },
      { value: 2, label: 'Insatisfecho', emoji: '😕', color: 'orange' },
      { value: 1, label: 'Muy insatisfecho', emoji: '😞', color: 'red' }
    ];

    return options.map(opt => `
      <label class="flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 hover:border-${opt.color}-500 rounded-lg cursor-pointer transition-all group">
        <input 
          type="radio" 
          name="satisfaccion" 
          value="${opt.value}" 
          class="w-5 h-5 text-primary focus:ring-primary focus:ring-offset-slate-900"
          required
        />
        <span class="text-3xl">${opt.emoji}</span>
        <span class="flex-1 text-white font-medium group-hover:text-${opt.color}-400 transition-colors">
          ${opt.label}
        </span>
      </label>
    `).join('');
  }

  /**
   * Enviar encuesta
   */
  async submitSurvey(event) {
    event.preventDefault();

    try {
      const formData = new FormData(event.target);
      
      // Obtener datos del formulario
      const curso_id = formData.get('curso_id');
      const lo_que_gusto = formData.get('lo_que_gusto') || '';
      const que_mejorar = formData.get('que_mejorar') || '';
      const satisfaccion = formData.get('satisfaccion');
      
      // Validar datos requeridos
      if (!curso_id) {
        throw new Error('Por favor seleccione un curso');
      }
      
      if (!satisfaccion) {
        throw new Error('Por favor seleccione un nivel de satisfacción');
      }
      
      // Obtener alumno_id del usuario
      const alumno_id = this.currentUser?.id_alumno;
      
      if (!alumno_id) {
        throw new Error('No se pudo identificar al alumno. Por favor inicie sesión nuevamente.');
      }
      
      // Preparar datos con los nombres correctos que espera el servidor
      const data = {
        alumno_id: parseInt(alumno_id),
        curso_id: parseInt(curso_id),
        gusto_curso: lo_que_gusto,
        mejora_curso: que_mejorar,
        nivel_satisfaccion: parseInt(satisfaccion)
      };

      console.log('Enviando encuesta:', data);

      // Enviar al backend
      await API.enviarEncuesta(data);

      // Cerrar modal
      document.getElementById('surveyModal')?.remove();

      // Ocultar el botón de encuesta ya que se completó
      if (window.app && window.app.courses) {
        window.app.courses.ocultarEncuesta();
      }

      // Mostrar agradecimiento
      showNotification('¡Gracias por tu feedback! 🙏', 'success');

    } catch (error) {
      console.error('Error al enviar encuesta:', error);
      showNotification('Error al enviar la encuesta', 'error');
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

// Instancia global
window.surveyController = new SurveyController();

export const surveyController = window.surveyController;
export default surveyController;

