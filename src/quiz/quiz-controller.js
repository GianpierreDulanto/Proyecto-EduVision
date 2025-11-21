// src/quiz/quiz-controller.js
// Control del sistema de evaluación/quiz dinámico

import { getCursoCuestionario } from '../api/api.js';

export class QuizController {
  constructor() {
    this.cuestionario = null;
    this.preguntas = [];
    this.currentQuestion = 0;
    this.totalQuestions = 0;
    this.answerSelected = false;
    this.correctAnswer = null;
    this.respuestasUsuario = [];
    this.puntaje = 0;
    
    this.exposeGlobalMethods();
  }

  async loadQuiz(cursoId) {
    try {
      this.cuestionario = await getCursoCuestionario(cursoId);
      
      if (!this.cuestionario || !this.cuestionario.preguntas) {
        console.warn('No hay cuestionario para este curso');
        return false;
      }
      
      this.preguntas = this.cuestionario.preguntas;
      this.totalQuestions = this.preguntas.length;
      this.currentQuestion = 0;
      this.puntaje = 0;
      this.respuestasUsuario = [];
      
      // Renderizar primera pregunta
      this.renderCurrentQuestion();
      
      return true;
    } catch (error) {
      console.error('Error al cargar cuestionario:', error);
      return false;
    }
  }

  renderCurrentQuestion() {
    if (!this.preguntas || this.currentQuestion >= this.totalQuestions) return;
    
    const pregunta = this.preguntas[this.currentQuestion];
    
    // Actualizar contador y barra
    const preguntaActual = document.getElementById('preguntaActual');
    const totalPreguntas = document.getElementById('totalPreguntas');
    const barraProgreso = document.getElementById('barraProgreso');
    
    if (preguntaActual) preguntaActual.textContent = this.currentQuestion + 1;
    if (totalPreguntas) totalPreguntas.textContent = this.totalQuestions;
    if (barraProgreso) {
      const progreso = ((this.currentQuestion + 1) / this.totalQuestions) * 100;
      barraProgreso.style.width = progreso + '%';
      barraProgreso.setAttribute('aria-valuenow', progreso);
    }
    
    // Actualizar pregunta
    const quizContainer = document.getElementById('quizContainer');
    if (!quizContainer) return;
    
    const preguntaTitle = quizContainer.querySelector('h2');
    if (preguntaTitle) {
      preguntaTitle.textContent = pregunta.texto_pregunta;
    }
    
    // Renderizar opciones
    const opcionesContainer = quizContainer.querySelector('[role="radiogroup"]');
    if (opcionesContainer && pregunta.opciones) {
      opcionesContainer.innerHTML = pregunta.opciones.map((opcion, index) => {
        const letra = String.fromCharCode(65 + index); // A, B, C, D
        return `
          <button 
            tabindex="0"
            role="radio"
            aria-checked="false"
            aria-label="Opción ${letra}: ${this.escapeHtml(opcion.texto_opcion)}"
            onclick="window.quizController.selectAnswer(this, ${opcion.id_opcion}, ${opcion.es_correcta})" 
            class="opcion-quiz w-full bg-slate-700 hover:bg-slate-600 text-white text-left px-6 py-4 rounded-xl flex items-center gap-4 transition-all border-2 border-transparent">
            <span class="w-6 h-6 rounded-full border-2 border-slate-400 flex-shrink-0"></span>
            <span class="text-lg">${this.escapeHtml(opcion.texto_opcion)}</span>
          </button>
        `;
      }).join('');
    }
    
    // Reset estado
    this.answerSelected = false;
    const mensajeRetroalimentacion = document.getElementById('mensajeRetroalimentacion');
    if (mensajeRetroalimentacion) {
      mensajeRetroalimentacion.classList.add('hidden');
    }
    
    const btnSiguiente = document.getElementById('btnSiguientePregunta');
    if (btnSiguiente) {
      btnSiguiente.disabled = true;
      btnSiguiente.textContent = this.currentQuestion < this.totalQuestions - 1 
        ? 'Siguiente pregunta' 
        : 'Finalizar evaluación';
    }
  }

  selectAnswer(element, opcionId, isCorrect) {
    if (this.answerSelected) return;
    
    this.answerSelected = true;
    this.correctAnswer = isCorrect;
    
    // Guardar respuesta del usuario
    this.respuestasUsuario.push({
      pregunta_id: this.preguntas[this.currentQuestion].id_pregunta,
      opcion_id: opcionId,
      correcta: isCorrect
    });
    
    if (isCorrect) {
      this.puntaje++;
    }
    
    element.setAttribute('aria-checked', 'true');
    
    // Resetear estilos de todas las opciones
    document.querySelectorAll('.opcion-quiz').forEach(option => {
      option.classList.remove('border-red-500', 'border-green-500', 'bg-red-900', 'bg-green-900');
      if (option !== element) {
        option.setAttribute('aria-checked', 'false');
      }
    });
    
    const circle = element.querySelector('span:first-child');
    const feedbackMsg = document.getElementById('mensajeRetroalimentacion');
    
    const answerText = element.querySelector('span:last-child').textContent;
    
    if (isCorrect) {
      // Respuesta correcta
      element.classList.add('border-green-500', 'bg-green-900');
      circle.innerHTML = '<span class="material-symbols-outlined text-green-500">check_circle</span>';
      
      if (feedbackMsg) {
        feedbackMsg.innerHTML = `<p class="text-green-500 text-center font-medium">✓ Correcto!</p>`;
        feedbackMsg.setAttribute('aria-label', 'Correcto');
      }
    } else {
      // Respuesta incorrecta
      element.classList.add('border-red-500', 'bg-red-900');
      circle.innerHTML = '<span class="material-symbols-outlined text-red-500">cancel</span>';
      
      if (feedbackMsg) {
        feedbackMsg.innerHTML = '<p class="text-red-500 text-center font-medium">✗ Incorrecto. La respuesta correcta se encuentra resaltada</p>';
        feedbackMsg.setAttribute('aria-label', 'Incorrecto. Se muestra la respuesta correcta');
      }
      
      // Resaltar la respuesta correcta
      const pregunta = this.preguntas[this.currentQuestion];
      const correctOption = pregunta.opciones.find(opt => opt.es_correcta);
      
      if (correctOption) {
        document.querySelectorAll('.opcion-quiz').forEach(option => {
          const text = option.querySelector('span:last-child').textContent.trim();
          if (text === correctOption.texto_opcion.trim()) {
            option.classList.add('border-green-500', 'bg-green-900');
            const correctCircle = option.querySelector('span:first-child');
            correctCircle.innerHTML = '<span class="material-symbols-outlined text-green-500">check_circle</span>';
          }
        });
      }
    }
    
    if (feedbackMsg) {
      feedbackMsg.classList.remove('hidden');
      
      // Leer el mensaje con el lector de pantalla después de un momento
      setTimeout(() => {
        if (window.lectorPantalla && window.lectorPantalla.activo) {
          window.lectorPantalla.leer(feedbackMsg.textContent);
        }
      }, 300);
    }
    
    // Habilitar botón siguiente
    const btnNext = document.getElementById('btnSiguientePregunta');
    if (btnNext) btnNext.disabled = false;
  }

  nextQuestion() {
    this.currentQuestion++;
    
    if (this.currentQuestion >= this.totalQuestions) {
      // Quiz completado
      this.finishQuiz();
      return;
    }
    
    // Renderizar siguiente pregunta
    this.renderCurrentQuestion();
    
    // Anunciar nueva pregunta
    const announcement = `Pregunta ${this.currentQuestion + 1} de ${this.totalQuestions}`;
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(announcement);
    }
  }

  finishQuiz() {
    const porcentaje = Math.round((this.puntaje / this.totalQuestions) * 100);
    
    console.log(`Quiz completado: ${this.puntaje}/${this.totalQuestions} (${porcentaje}%)`);
    
    // Guardar resultado en sessionStorage
    sessionStorage.setItem('quizResult', JSON.stringify({
      curso_id: this.cuestionario.curso_id,
      puntaje: this.puntaje,
      total: this.totalQuestions,
      porcentaje: porcentaje,
      respuestas: this.respuestasUsuario
    }));
    
    // Mostrar resultados y navegar a encuesta
    alert(`¡Evaluación completada!\n\nPuntaje: ${this.puntaje}/${this.totalQuestions} (${porcentaje}%)`);
    
    if (window.completarEvaluacion) {
      window.completarEvaluacion();
    }
  }

  reset() {
    this.currentQuestion = 1;
    this.answerSelected = false;
    this.correctAnswer = null;
  }

  getCurrentQuestion() {
    return this.currentQuestion;
  }

  getTotalQuestions() {
    return this.totalQuestions;
  }

  isAnswerSelected() {
    return this.answerSelected;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  exposeGlobalMethods() {
    // Métodos globales para compatibilidad con HTML
    window.seleccionarRespuesta = (el, opcionId, correct) => this.selectAnswer(el, opcionId, correct);
    window.siguientePregunta = () => this.nextQuestion();
    
    // Exponer instancia global
    window.quizController = this;
  }
}