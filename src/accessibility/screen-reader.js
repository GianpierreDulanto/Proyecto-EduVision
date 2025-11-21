// src/accessibility/screen-reader.js
// Lector de pantalla integrado

export class ScreenReader {
  constructor() {
    this.active = false;
    this.activo = false; // Alias en español
    this.reading = false;
    this.panelVisible = false;
    this.speed = 1;
    this.volume = 1;
    this.mode = 'elemento'; // 'elemento' o 'continuo'
    this.navigableElements = [];
    this.currentIndex = -1;
    this.currentElement = null;
    this.lastText = '';
    
    this.initialize();
  }

  initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.setupEvents();
    this.setupShortcuts();
    this.injectStyles();
    console.log('✓ Lector listo. Presiona Alt+L para activar');
  }

  setupEvents() {
    const btnClose = document.getElementById('btnCerrarLector');
    if (btnClose) btnClose.onclick = () => this.deactivate();

    const btnMinimize = document.getElementById('btnMinimizarLector');
    if (btnMinimize) btnMinimize.onclick = () => this.togglePanel();

    const btnPlay = document.getElementById('btnLectorPlay');
    if (btnPlay) btnPlay.onclick = () => this.togglePlayback();

    const btnStop = document.getElementById('btnLectorDetener');
    if (btnStop) btnStop.onclick = () => this.stop();

    const btnNext = document.getElementById('btnLectorSiguiente');
    if (btnNext) btnNext.onclick = () => this.navigateNext();

    const btnPrev = document.getElementById('btnLectorAnterior');
    if (btnPrev) btnPrev.onclick = () => this.navigatePrevious();

    const speedControl = document.getElementById('velocidadLector');
    if (speedControl) {
      speedControl.onchange = (e) => { 
        this.speed = parseFloat(e.target.value);
        this.announce(`Velocidad ${e.target.value}`);
      };
    }

    const volumeControl = document.getElementById('volumenLector');
    if (volumeControl) {
      volumeControl.oninput = (e) => { 
        this.volume = parseFloat(e.target.value);
      };
    }

    const modeControl = document.getElementById('modoLectura');
    if (modeControl) {
      modeControl.onchange = (e) => { 
        this.mode = e.target.value;
        this.announce(`Modo ${e.target.value}`);
      };
    }

    const btnShortcuts = document.getElementById('btnAtajosLector');
    if (btnShortcuts) btnShortcuts.onclick = () => this.showShortcuts();

    const btnCloseShortcuts = document.getElementById('btnCerrarModalAtajos');
    if (btnCloseShortcuts) btnCloseShortcuts.onclick = () => this.closeShortcuts();
  }

  setupShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + L: Activar/Desactivar lector
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        this.active ? this.deactivate() : this.activate();
        return;
      }

      if (!this.active) return;

      // Atajos solo cuando el lector está activo
      if (e.altKey && e.key === 'p') { 
        e.preventDefault(); 
        this.togglePanel(); 
      }
      else if (e.altKey && e.key === 'h') { 
        e.preventDefault(); 
        this.showShortcuts(); 
      }
      else if (e.altKey && e.key === ' ') { 
        e.preventDefault(); 
        this.togglePlayback(); 
      }
      else if (e.altKey && e.key === 's') { 
        e.preventDefault(); 
        this.stop(); 
      }
      else if (e.altKey && e.key === 'ArrowRight') { 
        e.preventDefault(); 
        this.navigateNext(); 
      }
      else if (e.altKey && e.key === 'ArrowLeft') { 
        e.preventDefault(); 
        this.navigatePrevious(); 
      }
      else if ((e.key === 'Enter' || e.key === ' ') && this.currentElement && this.active) {
        const tag = this.currentElement.tagName.toLowerCase();
        if (!['input', 'textarea'].includes(tag) && typeof this.currentElement.click === 'function') {
          e.preventDefault();
          this.currentElement.click();
        }
      }
    });
  }

  activate() {
    this.active = true;
    this.activo = true;
    this.panelVisible = true;
    
    const panel = document.getElementById('panelLectorPantalla');
    if (panel) panel.style.transform = 'translateY(0)';
    
    const status = document.getElementById('estadoLector');
    if (status) {
      status.textContent = 'Activo';
      status.className = 'text-sm px-3 py-1 rounded-full bg-green-600 text-white font-semibold';
    }
    
    this.announce('Lector de pantalla activado. Presiona Alt más H para ver atajos.');
    this.updateElements();
  }

  deactivate() {
    this.stop();
    this.active = false;
    this.activo = false;
    
    const panel = document.getElementById('panelLectorPantalla');
    if (panel) panel.style.transform = 'translateY(100%)';
    
    const status = document.getElementById('estadoLector');
    if (status) {
      status.textContent = 'Inactivo';
      status.className = 'text-sm px-3 py-1 rounded-full bg-gray-600 text-white font-semibold';
    }
    
    this.announce('Lector desactivado');
  }

  togglePanel() {
    this.panelVisible = !this.panelVisible;
    const panel = document.getElementById('panelLectorPantalla');
    
    if (panel) {
      panel.style.transform = this.panelVisible ? 'translateY(0)' : 'translateY(calc(100% - 60px))';
    }
    
    const btn = document.getElementById('btnMinimizarLector');
    if (btn) {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = this.panelVisible ? 'expand_more' : 'expand_less';
    }
  }

  togglePlayback() {
    if (this.reading) {
      this.pause();
    } else {
      if (this.currentElement) {
        this.readElement(this.currentElement);
      } else {
        this.navigateNext();
      }
    }
  }

  speak(text) {
    if (!text || text.trim() === '') return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = this.speed;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      this.reading = true;
      const btn = document.getElementById('btnLectorPlay');
      if (btn) {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'pause';
      }
    };

    utterance.onend = () => {
      this.reading = false;
      const btn = document.getElementById('btnLectorPlay');
      if (btn) {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'play_arrow';
      }

      if (this.mode === 'continuo' && this.active) {
        setTimeout(() => this.navigateNext(), 300);
      }
    };

    const textDiv = document.getElementById('textoActualLector');
    if (textDiv) textDiv.textContent = text;

    this.lastText = text;
    window.speechSynthesis.speak(utterance);
  }

  announce(text) {
    if (this.activo) {
      this.speak(text);
    }
  }
  
  anunciar(text) {
    this.announce(text);
  }

  pause() {
    window.speechSynthesis.pause();
    this.reading = false;
    
    const btn = document.getElementById('btnLectorPlay');
    if (btn) {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'play_arrow';
    }
  }

  stop() {
    window.speechSynthesis.cancel();
    this.reading = false;
    
    const btn = document.getElementById('btnLectorPlay');
    if (btn) {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'play_arrow';
    }
  }

  updateElements() {
    const selectors = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"]), label, h1, h2, h3, p, [aria-label]';
    this.navigableElements = Array.from(document.body.querySelectorAll(selectors))
      .filter(el => this.isVisible(el));

    if (this.currentIndex >= this.navigableElements.length) {
      this.currentIndex = 0;
    }
  }

  isVisible(el) {
    const styles = window.getComputedStyle(el);
    return el.offsetParent !== null && 
           styles.display !== 'none' && 
           styles.visibility !== 'hidden';
  }

  navigateNext() {
    this.updateElements();
    
    if (this.navigableElements.length === 0) {
      this.announce('No hay elementos en esta página');
      return;
    }
    
    this.currentIndex++;
    if (this.currentIndex >= this.navigableElements.length) {
      this.currentIndex = 0;
      this.announce('Volviendo al inicio');
    }
    
    this.currentElement = this.navigableElements[this.currentIndex];
    this.highlightAndFocusElement(this.currentElement);
    this.readElement(this.currentElement);
  }

  navigatePrevious() {
    this.updateElements();
    
    if (this.navigableElements.length === 0) {
      this.announce('No hay elementos en esta página');
      return;
    }
    
    this.currentIndex--;
    if (this.currentIndex < 0) {
      this.currentIndex = this.navigableElements.length - 1;
      this.announce('Volviendo al final');
    }
    
    this.currentElement = this.navigableElements[this.currentIndex];
    this.highlightAndFocusElement(this.currentElement);
    this.readElement(this.currentElement);
  }

  readElement(element) {
    if (!element) return;

    let text = '';
    const tag = element.tagName.toLowerCase();

    // Determinar tipo de elemento
    let elementType = '';
    if (tag.match(/h[1-6]/)) {
      elementType = `Encabezado nivel ${tag.charAt(1)}: `;
    } else if (tag === 'button' || element.getAttribute('role') === 'button') {
      elementType = 'Botón: ';
    } else if (tag === 'a') {
      elementType = 'Enlace: ';
    } else if (tag === 'input') {
      const type = element.getAttribute('type') || 'text';
      elementType = `Campo de entrada ${type}: `;
    } else if (tag === 'textarea') {
      elementType = 'Área de texto: ';
    } else if (tag === 'select') {
      elementType = 'Lista desplegable: ';
    } else if (tag === 'label') {
      elementType = 'Etiqueta: ';
    }

    // Obtener texto del elemento
    if (element.getAttribute('aria-label')) {
      text = element.getAttribute('aria-label');
    } else if (element.getAttribute('alt')) {
      text = element.getAttribute('alt');
    } else if (element.getAttribute('title')) {
      text = element.getAttribute('title');
    } else if (element.getAttribute('placeholder')) {
      text = element.getAttribute('placeholder');
    } else if (tag === 'input' && element.value) {
      text = element.value;
    } else {
      text = element.textContent.trim();
    }

    // Truncar texto largo
    if (text.length > 300) {
      text = text.substring(0, 300) + '... Texto truncado';
    }

    const fullText = elementType + text;
    this.speak(fullText);
  }

  highlightAndFocusElement(element) {
    // Remover resaltado anterior
    document.querySelectorAll('.lector-resaltado').forEach(el => {
      el.classList.remove('lector-resaltado');
    });

    // Agregar resaltado
    element.classList.add('lector-resaltado');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
  }

  showShortcuts() {
    const modal = document.getElementById('modalAtajosLector');
    if (modal) {
      modal.classList.remove('hidden');
      this.announce('Modal de atajos abierto');
    }
  }

  closeShortcuts() {
    const modal = document.getElementById('modalAtajosLector');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  injectStyles() {
    if (document.getElementById('estilos-lector')) return;
    
    const style = document.createElement('style');
    style.id = 'estilos-lector';
    style.textContent = `
      .lector-resaltado {
        outline: 3px solid #0d59f2 !important;
        outline-offset: 2px !important;
        background-color: rgba(13, 89, 242, 0.1) !important;
        transition: all 0.3s ease !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Aliases en español
  activar() {
    this.activate();
  }

  desactivar() {
    this.deactivate();
  }
}

// Exportar instancia global
window.lectorPantalla = new ScreenReader();
console.log('✅ Lector de pantalla integrado cargado');
console.log('📢 Presiona Alt+L para activar');
