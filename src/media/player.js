// src/media/player.js
// Control del reproductor multimedia con transcripciones y subtítulos

export class MediaPlayer {
  constructor() {
    this.isPlaying = false;
    this.currentSpeed = 1;
    this.transcriptionVisible = false;
    this.captionsVisible = false;
    this.currentCaptions = null;
    this.currentTranscription = null;
    
    this.setupEventListeners();
    this.exposeGlobalMethods();
  }

  setupEventListeners() {
    // Escuchar eventos de reproducción
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');

    if (audio) {
      audio.addEventListener('timeupdate', () => this.updateProgressBar());
      audio.addEventListener('ended', () => this.onPlaybackEnded());
    }

    if (video) {
      video.addEventListener('timeupdate', () => this.updateProgressBar());
      video.addEventListener('ended', () => this.onPlaybackEnded());
    }

    // Click en barra de progreso
    const progressContainer = document.getElementById('contenedorBarraProgreso');
    if (progressContainer) {
      progressContainer.addEventListener('click', (e) => this.seekToPosition(e));
    }
  }

  togglePlayback() {
    const video = document.getElementById('videoClase');
    const audio = document.getElementById('audioClase');
    const icon = document.getElementById('iconoReproduccion');
    
    this.isPlaying = !this.isPlaying;
    
    if (this.isPlaying) {
      if (icon) icon.textContent = 'pause';
      if (video && video.paused) video.play();
      if (audio && audio.paused) audio.play();
    } else {
      if (icon) icon.textContent = 'play_arrow';
      if (video) video.pause();
      if (audio) audio.pause();
    }
  }

  changeSpeed(speed) {
    this.currentSpeed = speed;
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');
    
    if (audio) audio.playbackRate = speed;
    if (video) video.playbackRate = speed;
  }

  jumpTo(seconds) {
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');
    
    if (audio) {
      audio.currentTime = seconds;
      audio.play();
    }
    if (video) {
      video.currentTime = seconds;
      video.play();
    }
    
    this.isPlaying = true;
    const icon = document.getElementById('iconoReproduccion');
    if (icon) icon.textContent = 'pause';
  }

  rewind(seconds = 15) {
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');
    
    if (video) video.currentTime = Math.max(0, video.currentTime - seconds);
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - seconds);
  }

  forward(seconds = 15) {
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');
    
    if (video) video.currentTime = Math.min(video.duration, video.currentTime + seconds);
    if (audio) audio.currentTime = Math.min(audio.duration, audio.currentTime + seconds);
  }

  seekToStart() {
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');
    
    if (video) video.currentTime = 0;
    if (audio) audio.currentTime = 0;
  }

  seekToEnd() {
    const audio = document.getElementById('audioClase');
    const video = document.getElementById('videoClase');
    
    if (video) video.currentTime = video.duration;
    if (audio) audio.currentTime = audio.duration;
  }

  updateProgressBar() {
    const video = document.getElementById('videoClase');
    const audio = document.getElementById('audioClase');
    const bar = document.getElementById('barraReproduccion');
    const currentTimeEl = document.getElementById('tiempoActual');
    const totalTimeEl = document.getElementById('tiempoTotal');
    
    const activeMedia = (video && !video.paused) ? video : (audio && !audio.paused) ? audio : null;
    
    if (activeMedia && bar) {
      const progress = (activeMedia.currentTime / activeMedia.duration) * 100;
      bar.style.width = progress + '%';
      
      if (currentTimeEl) currentTimeEl.textContent = this.formatTime(activeMedia.currentTime);
      if (totalTimeEl) totalTimeEl.textContent = this.formatTime(activeMedia.duration);
    }
  }

  seekToPosition(event) {
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    
    const video = document.getElementById('videoClase');
    const audio = document.getElementById('audioClase');
    
    if (video) video.currentTime = video.duration * percentage;
    if (audio) audio.currentTime = audio.duration * percentage;
    
    this.updateProgressBar();
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  onPlaybackEnded() {
    this.isPlaying = false;
    const icon = document.getElementById('iconoReproduccion');
    if (icon) icon.textContent = 'play_arrow';
  }

  toggleTranscript() {
    const content = document.getElementById('transcripcionContent');
    const toggleText = document.getElementById('transcripcionToggleText');
    
    if (content && toggleText) {
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggleText.textContent = 'Ocultar';
      } else {
        content.style.display = 'none';
        toggleText.textContent = 'Mostrar';
      }
    }
  }

  downloadTranscript() {
    alert('Descargando transcripción en formato PDF...');
  }

  exposeGlobalMethods() {
    window.toggleReproduccion = () => this.togglePlayback();
    window.cambiarVelocidad = (speed) => this.changeSpeed(speed);
    window.saltarA = (seconds) => this.jumpTo(seconds);
    window.retroceder15 = () => this.rewind(15);
    window.adelantar15 = () => this.forward(15);
    window.irInicio = () => this.seekToStart();
    window.irFinal = () => this.seekToEnd();
    window.clickEnBarra = (e) => this.seekToPosition(e);
    window.formatearTiempo = (s) => this.formatTime(s);
    window.reproduccionTerminada = () => this.onPlaybackEnded();
    window.toggleTranscripcion = () => this.toggleTranscript();
    window.descargarTranscripcion = () => this.downloadTranscript();
    window.actualizarBarraProgreso = () => this.updateProgressBar();
  }
}