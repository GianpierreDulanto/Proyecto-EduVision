// src/immersive-reader/immersive-reader.js
// Lector Inmersivo para contenido multimedia con transcripción

import { showNotification } from '../utils/helpers.js';

class ImmersiveReader {
  constructor() {
    this.currentLesson = null;
    this.mediaPlayer = null;
    this.isPlaying = false;
  }

  /**
   * Abrir lección en modo inmersivo
   */
  open(lesson) {
    this.currentLesson = lesson;
    this.createModal();
    this.initializePlayer();
  }

  /**
   * Crear modal del lector inmersivo
   */
  createModal() {
    // Remover modal existente
    const existing = document.getElementById('immersiveReaderModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'immersiveReaderModal';
    modal.className = 'fixed inset-0 bg-slate-900 z-50 overflow-hidden';
    
    modal.innerHTML = `
      <div class="h-screen flex flex-col">
        <!-- Header -->
        <header class="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button 
                onclick="window.immersiveReader.close()" 
                class="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Volver al curso"
              >
                <span class="material-symbols-outlined">arrow_back</span>
                <span class="font-medium">Volver al curso</span>
              </button>
              <div class="h-8 w-px bg-slate-600"></div>
              <div>
                <h1 class="text-xl font-bold text-white">${this.escapeHtml(this.currentLesson.titulo)}</h1>
                <p class="text-sm text-slate-400">${this.escapeHtml(this.currentLesson.instructor || '')}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button 
                onclick="window.immersiveReader.toggleTranscription()"
                class="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Mostrar/Ocultar transcripción"
                title="Transcripción"
              >
                <span class="material-symbols-outlined">subtitles</span>
              </button>
              <button 
                class="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Configuración"
                title="Configuración"
              >
                <span class="material-symbols-outlined">settings</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 overflow-hidden flex">
          <!-- Media Player Side -->
          <div id="mediaPlayerContainer" class="flex-1 bg-black flex items-center justify-center">
            ${this.renderMediaPlayer()}
          </div>

          <!-- Transcription Side -->
          <aside id="transcriptionPanel" class="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
            <div class="p-6">
              <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">description</span>
                Transcripción
              </h2>
              <div class="prose prose-invert max-w-none">
                ${this.renderTranscription()}
              </div>
            </div>
          </aside>
        </div>

        <!-- Controls Bar -->
        <div class="bg-slate-800 border-t border-slate-700 px-6 py-4">
          <div class="max-w-7xl mx-auto">
            ${this.renderControls()}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
  }

  /**
   * Renderizar reproductor de medios
   */
  renderMediaPlayer() {
    const { tipo, url, thumbnail } = this.currentLesson;

    if (tipo === 'video' && url) {
      return `
        <div class="w-full max-w-5xl">
          <div class="relative aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
            <video 
              id="immersiveVideo" 
              class="w-full h-full"
              ${thumbnail ? `poster="${thumbnail}"` : ''}
              controls
              controlsList="nodownload"
            >
              <source src="${url}" type="video/mp4">
              Su navegador no soporta el elemento de video.
            </video>
          </div>
        </div>
      `;
    } else if (tipo === 'audio' && url) {
      return `
        <div class="w-full max-w-2xl px-8">
          <div class="bg-gradient-to-br from-primary/20 to-blue-900/20 rounded-2xl p-12 text-center">
            <div class="w-32 h-32 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
              ${thumbnail ? `<img src="${thumbnail}" alt="" class="w-24 h-24 rounded-full object-cover">` : 
                '<span class="material-symbols-outlined text-6xl text-primary">headphones</span>'}
            </div>
            <h3 class="text-2xl font-bold text-white mb-2">${this.escapeHtml(this.currentLesson.titulo)}</h3>
            <p class="text-slate-400 mb-8">${this.escapeHtml(this.currentLesson.instructor || 'Lección de audio')}</p>
            <audio 
              id="immersiveAudio" 
              class="w-full"
              controls
              controlsList="nodownload"
            >
              <source src="${url}" type="audio/mpeg">
              Su navegador no soporta el elemento de audio.
            </audio>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="w-full max-w-4xl px-8">
          <div class="bg-slate-800 rounded-2xl p-12 shadow-2xl">
            <div class="w-24 h-24 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined text-5xl text-primary">menu_book</span>
            </div>
            <div class="prose prose-invert prose-lg max-w-none">
              ${this.currentLesson.contenido || '<p class="text-center text-slate-400">No hay contenido disponible</p>'}
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Renderizar transcripción
   */
  renderTranscription() {
    const transcription = this.currentLesson.transcripcion || this.currentLesson.contenido;

    if (!transcription) {
      return `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-6xl text-slate-600 mb-4 block">subtitles_off</span>
          <p class="text-slate-400">No hay transcripción disponible para esta lección</p>
        </div>
      `;
    }

    // Si la transcripción tiene marcas de tiempo, formatearla
    return `
      <div class="text-slate-300 leading-relaxed space-y-4">
        ${this.formatTranscription(transcription)}
      </div>
    `;
  }

  /**
   * Formatear transcripción
   */
  formatTranscription(text) {
    // Detectar si tiene formato de tiempo [00:00]
    if (text.includes('[') && text.includes(']')) {
      return text.split('\n').map(line => {
        const timeMatch = line.match(/\[(\d{2}:\d{2})\]/);
        if (timeMatch) {
          const time = timeMatch[1];
          const content = line.replace(/\[\d{2}:\d{2}\]/, '').trim();
          return `
            <div class="flex gap-3 hover:bg-slate-700/50 p-2 rounded cursor-pointer transition-colors" data-time="${time}">
              <span class="text-primary font-mono text-sm flex-shrink-0">${time}</span>
              <p class="text-slate-300">${this.escapeHtml(content)}</p>
            </div>
          `;
        }
        return `<p class="text-slate-300">${this.escapeHtml(line)}</p>`;
      }).join('');
    }

    // Formato normal
    return text.split('\n').map(line => 
      `<p class="text-slate-300 mb-3">${this.escapeHtml(line)}</p>`
    ).join('');
  }

  /**
   * Renderizar controles
   */
  renderControls() {
    return `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button 
            onclick="window.immersiveReader.markComplete()"
            class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Marcar como completado"
          >
            <span class="material-symbols-outlined">check_circle</span>
            <span>Marcar como Completado</span>
          </button>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Lección anterior"
            title="Anterior"
          >
            <span class="material-symbols-outlined">skip_previous</span>
          </button>
          <button 
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Siguiente lección"
            title="Siguiente"
          >
            <span class="material-symbols-outlined">skip_next</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Inicializar reproductor
   */
  initializePlayer() {
    const video = document.getElementById('immersiveVideo');
    const audio = document.getElementById('immersiveAudio');

    if (video) {
      this.mediaPlayer = video;
      video.addEventListener('ended', () => this.onMediaEnded());
    } else if (audio) {
      this.mediaPlayer = audio;
      audio.addEventListener('ended', () => this.onMediaEnded());
    }
  }

  /**
   * Toggle transcripción
   */
  toggleTranscription() {
    const panel = document.getElementById('transcriptionPanel');
    if (panel) {
      panel.classList.toggle('hidden');
    }
  }

  /**
   * Marcar como completado
   */
  async markComplete() {
    try {
      showNotification('¡Lección completada! 🎉', 'success');
      
      // Aquí iría la lógica para actualizar el progreso en el backend
      // await API.updateLessonProgress(...)
      
      // Cerrar y volver
      setTimeout(() => this.close(), 1500);
    } catch (error) {
      console.error('Error al marcar como completado:', error);
      showNotification('Error al actualizar progreso', 'error');
    }
  }

  /**
   * Cuando termina el media
   */
  onMediaEnded() {
    showNotification('Has completado esta lección', 'success');
  }

  /**
   * Cerrar lector inmersivo
   */
  close() {
    const modal = document.getElementById('immersiveReaderModal');
    if (modal) {
      if (this.mediaPlayer) {
        this.mediaPlayer.pause();
      }
      modal.remove();
      document.body.style.overflow = '';
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
window.immersiveReader = new ImmersiveReader();

export default ImmersiveReader;

