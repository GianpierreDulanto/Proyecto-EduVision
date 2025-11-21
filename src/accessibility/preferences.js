// src/accessibility/preferences.js
// Gestión de preferencias de accesibilidad mejoradas

export class AccessibilityPreferences {
  constructor() {
    this.body = document.body;
    this.html = document.documentElement;
    
    this.preferences = {
      contraste: false,
      tipografia: false,
      tamanoTexto: 3, // 1-5 escala
      modoCeguera: false,
      reducirMovimiento: false,
      subrayarEnlaces: false,
      enfoqueMejorado: false,
      espaciadoLineas: 1.0,
      espaciadoLetras: 0,
      cursorGrande: false,
      posicionCursor: false
    };
    
    this.exposeGlobalMethods();
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem('eduVisionAccessibility');
      if (saved) {
        this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      }
      
      this.applyAllPreferences();
      this.updateUI();
      
      console.log('✓ Preferencias de accesibilidad cargadas');
    } catch (error) {
      console.error('Error al cargar preferencias:', error);
    }
  }

  savePreferences() {
    try {
      localStorage.setItem('eduVisionAccessibility', JSON.stringify(this.preferences));
      this.announce('Preferencias guardadas correctamente');
    } catch (error) {
      console.error('Error al guardar preferencias:', error);
    }
  }

  applyAllPreferences() {
    // Aplicar todas las preferencias guardadas
    if (this.preferences.contraste) this.body.classList.add('contraste-alto');
    if (this.preferences.tipografia) this.body.classList.add('tipografia-legible');
    if (this.preferences.modoCeguera) this.body.classList.add('modo-ceguera');
    if (this.preferences.reducirMovimiento) this.body.classList.add('reducir-movimiento');
    if (this.preferences.subrayarEnlaces) this.body.classList.add('subrayar-enlaces');
    if (this.preferences.enfoqueMejorado) this.body.classList.add('enfoque-mejorado');
    if (this.preferences.cursorGrande) this.body.classList.add('cursor-grande');
    if (this.preferences.posicionCursor) this.enableCursorHighlight();
    
    this.applyTextSize(this.preferences.tamanoTexto);
    this.applyLineSpacing(this.preferences.espaciadoLineas);
    this.applyLetterSpacing(this.preferences.espaciadoLetras);
  }

  updateUI() {
    // Actualizar switches
    this.updateSwitch('switchContraste', this.preferences.contraste);
    this.updateSwitch('switchMovimiento', this.preferences.reducirMovimiento);
    this.updateSwitch('switchEnlaces', this.preferences.subrayarEnlaces);
    this.updateSwitch('switchEnfoque', this.preferences.enfoqueMejorado);
    
    // Actualizar rangos
    const rangoTamano = document.getElementById('rangoTamanoTexto');
    if (rangoTamano) {
      rangoTamano.value = this.preferences.tamanoTexto;
      this.updateTextSizeLabel(this.preferences.tamanoTexto);
    }
    
    const rangoEspaciado = document.getElementById('rangoEspaciado');
    if (rangoEspaciado) {
      rangoEspaciado.value = this.preferences.espaciadoLineas;
      this.updateLineSpacingLabel(this.preferences.espaciadoLineas);
    }
    
    const rangoLetras = document.getElementById('rangoLetras');
    if (rangoLetras) {
      rangoLetras.value = this.preferences.espaciadoLetras;
      this.updateLetterSpacingLabel(this.preferences.espaciadoLetras);
    }
  }

  updateSwitch(id, checked) {
    const switchInput = document.getElementById(id);
    if (switchInput && switchInput.type === 'checkbox') {
      switchInput.checked = checked;
    }
  }

  // Toggles
  toggleHighContrast() {
    this.preferences.contraste = !this.preferences.contraste;
    this.body.classList.toggle('contraste-alto');
    // Actualizar todos los switches relacionados
    this.updateSwitch('toggleContraste', this.preferences.contraste);
    this.updateSwitch('toggleContrasteRapido', this.preferences.contraste);
    this.savePreferences();
    this.announce(this.preferences.contraste ? 'Alto contraste activado' : 'Alto contraste desactivado');
  }

  toggleBlindnessMode() {
    this.preferences.modoCeguera = !this.preferences.modoCeguera;
    this.body.classList.toggle('modo-ceguera');
    this.updateSwitch('toggleCeguera', this.preferences.modoCeguera);
    this.savePreferences();
    this.announce(this.preferences.modoCeguera ? 'Modo ceguera activado' : 'Modo ceguera desactivado');
  }

  toggleReducirMovimiento() {
    this.preferences.reducirMovimiento = !this.preferences.reducirMovimiento;
    this.body.classList.toggle('reducir-movimiento');
    this.updateSwitch('toggleMovimiento', this.preferences.reducirMovimiento);
    this.savePreferences();
    this.announce(this.preferences.reducirMovimiento ? 'Movimiento reducido' : 'Movimiento normal');
  }

  toggleSubrayarEnlaces() {
    this.preferences.subrayarEnlaces = !this.preferences.subrayarEnlaces;
    this.body.classList.toggle('subrayar-enlaces');
    this.updateSwitch('toggleEnlaces', this.preferences.subrayarEnlaces);
    this.savePreferences();
    this.announce(this.preferences.subrayarEnlaces ? 'Enlaces subrayados' : 'Enlaces sin subrayar');
  }

  toggleEnfoqueMejorado() {
    this.preferences.enfoqueMejorado = !this.preferences.enfoqueMejorado;
    this.body.classList.toggle('enfoque-mejorado');
    this.updateSwitch('toggleEnfoque', this.preferences.enfoqueMejorado);
    this.savePreferences();
    this.announce(this.preferences.enfoqueMejorado ? 'Enfoque mejorado activado' : 'Enfoque mejorado desactivado');
  }

  toggleReadableFont() {
    this.preferences.tipografia = !this.preferences.tipografia;
    this.body.classList.toggle('tipografia-legible');
    // Actualizar todos los switches relacionados
    this.updateSwitch('toggleFuente', this.preferences.tipografia);
    this.updateSwitch('toggleTipografiaRapida', this.preferences.tipografia);
    this.savePreferences();
    this.announce(this.preferences.tipografia ? 'Fuente legible activada' : 'Fuente normal');
  }

  toggleCursorGrande() {
    this.preferences.cursorGrande = !this.preferences.cursorGrande;
    this.body.classList.toggle('cursor-grande');
    this.updateSwitch('toggleCursor', this.preferences.cursorGrande);
    this.savePreferences();
    this.announce(this.preferences.cursorGrande ? 'Cursor grande activado' : 'Cursor normal');
  }

  togglePosicionCursor() {
    this.preferences.posicionCursor = !this.preferences.posicionCursor;
    this.updateSwitch('togglePosicionCursor', this.preferences.posicionCursor);
    
    if (this.preferences.posicionCursor) {
      this.enableCursorHighlight();
    } else {
      this.disableCursorHighlight();
    }
    
    this.savePreferences();
    this.announce(this.preferences.posicionCursor ? 'Resaltado de cursor activado' : 'Resaltado de cursor desactivado');
  }

  // Tamaño de texto
  increaseTextSize() {
    this.preferences.tamanoTexto = Math.min(5, this.preferences.tamanoTexto + 1);
    this.applyTextSize(this.preferences.tamanoTexto);
    this.updateTextSizeLabel(this.preferences.tamanoTexto);
    this.savePreferences();
  }

  decreaseTextSize() {
    this.preferences.tamanoTexto = Math.max(1, this.preferences.tamanoTexto - 1);
    this.applyTextSize(this.preferences.tamanoTexto);
    this.updateTextSizeLabel(this.preferences.tamanoTexto);
    this.savePreferences();
  }

  changeTextSizeFromRange(value) {
    this.preferences.tamanoTexto = parseInt(value);
    this.applyTextSize(this.preferences.tamanoTexto);
    this.updateTextSizeLabel(this.preferences.tamanoTexto);
    this.savePreferences();
  }

  applyTextSize(size) {
    const sizes = ['muy-pequeno', 'pequeno', 'mediano', 'grande', 'muy-grande'];
    const fontSizes = ['12px', '14px', '16px', '18px', '22px'];
    
    // Remover todas las clases de tamaño
    sizes.forEach(s => this.html.classList.remove(`tamano-texto-${s}`));
    
    // Aplicar nueva clase
    this.html.classList.add(`tamano-texto-${sizes[size - 1]}`);
    this.html.style.fontSize = fontSizes[size - 1];
  }

  updateTextSizeLabel(size) {
    const labels = ['Muy pequeño', 'Pequeño', 'Mediano', 'Grande', 'Muy grande'];
    const label = document.getElementById('tamanoTextoLabel');
    if (label) {
      label.innerHTML = `Tamaño: <strong>${labels[size - 1]}</strong>`;
    }
    
    const range = document.getElementById('rangoTamanoTexto');
    if (range) {
      range.value = size;
      range.setAttribute('aria-valuenow', size);
      range.setAttribute('aria-valuetext', labels[size - 1]);
    }
    
    this.announce(`Tamaño de texto: ${labels[size - 1]}`);
  }

  // Espaciado de líneas
  changeLineSpacing(value) {
    this.preferences.espaciadoLineas = parseFloat(value);
    this.applyLineSpacing(this.preferences.espaciadoLineas);
    this.updateLineSpacingLabel(this.preferences.espaciadoLineas);
    this.savePreferences();
  }

  applyLineSpacing(spacing) {
    this.body.style.lineHeight = spacing;
  }

  updateLineSpacingLabel(spacing) {
    const label = document.getElementById('espaciadoLabel');
    if (label) {
      label.innerHTML = `Espaciado: <strong>${spacing.toFixed(1)}x</strong>`;
    }
    this.announce(`Espaciado de líneas: ${spacing.toFixed(1)}`);
  }

  // Espaciado de letras
  changeLetterSpacing(value) {
    this.preferences.espaciadoLetras = parseFloat(value);
    this.applyLetterSpacing(this.preferences.espaciadoLetras);
    this.updateLetterSpacingLabel(this.preferences.espaciadoLetras);
    this.savePreferences();
  }

  applyLetterSpacing(spacing) {
    this.body.style.letterSpacing = spacing + 'px';
  }

  updateLetterSpacingLabel(spacing) {
    const labels = ['Normal', 'Ligero', 'Medio', 'Amplio', 'Muy amplio'];
    const index = Math.floor(spacing / 1);
    const label = document.getElementById('letrasLabel');
    if (label) {
      label.innerHTML = `Espaciado: <strong>${labels[index] || labels[0]}</strong>`;
    }
    this.announce(`Espaciado de letras: ${labels[index] || labels[0]}`);
  }

  // Resaltado de cursor
  enableCursorHighlight() {
    if (this.cursorHighlightElement) return;
    
    this.cursorHighlightElement = document.createElement('div');
    this.cursorHighlightElement.id = 'cursor-highlight';
    this.cursorHighlightElement.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      border: 3px solid #0d59f2;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.1s ease;
      box-shadow: 0 0 10px rgba(13, 89, 242, 0.5);
    `;
    document.body.appendChild(this.cursorHighlightElement);
    
    this.cursorMoveHandler = (e) => {
      if (this.cursorHighlightElement) {
        this.cursorHighlightElement.style.left = (e.clientX - 20) + 'px';
        this.cursorHighlightElement.style.top = (e.clientY - 20) + 'px';
      }
    };
    
    document.addEventListener('mousemove', this.cursorMoveHandler);
  }

  disableCursorHighlight() {
    if (this.cursorHighlightElement) {
      this.cursorHighlightElement.remove();
      this.cursorHighlightElement = null;
    }
    
    if (this.cursorMoveHandler) {
      document.removeEventListener('mousemove', this.cursorMoveHandler);
      this.cursorMoveHandler = null;
    }
  }

  // Perfiles predefinidos
  applyProfile(profileName, button) {
    // Resetear primero
    this.resetPreferences(false);
    
    // Actualizar botones de perfil
    document.querySelectorAll('.perfil-btn').forEach(btn => {
      btn.setAttribute('aria-checked', 'false');
      btn.classList.remove('border-primary', 'bg-primary/10', 'ring-2', 'ring-primary');
    });
    
    if (button) {
      button.setAttribute('aria-checked', 'true');
      button.classList.add('border-primary', 'bg-primary/10');
    }
    
    switch(profileName) {
      case 'predeterminado':
        // Ya está reseteado
        break;
        
      case 'daltonismo':
        this.preferences.contraste = true;
        this.body.classList.add('contraste-alto');
        this.preferences.subrayarEnlaces = true;
        this.body.classList.add('subrayar-enlaces');
        break;
        
      case 'baja_vision':
        this.preferences.contraste = true;
        this.body.classList.add('contraste-alto');
        this.preferences.tamanoTexto = 5;
        this.applyTextSize(5);
        this.preferences.espaciadoLineas = 2.0;
        this.applyLineSpacing(2.0);
        this.preferences.cursorGrande = true;
        this.body.classList.add('cursor-grande');
        this.preferences.enfoqueMejorado = true;
        this.body.classList.add('enfoque-mejorado');
        break;
        
      case 'ceguera':
        this.preferences.modoCeguera = true;
        this.body.classList.add('modo-ceguera');
        this.preferences.enfoqueMejorado = true;
        this.body.classList.add('enfoque-mejorado');
        // Activar lector de pantalla si existe
        if (window.lectorPantalla && !window.lectorPantalla.active) {
          window.lectorPantalla.activate();
        }
        break;
    }
    
    this.updateUI();
    this.savePreferences();
    this.announce(`Perfil ${profileName} aplicado`);
  }

  // Restablecer
  resetPreferences(announce = true) {
    // Remover todas las clases
    this.body.classList.remove(
      'contraste-alto', 
      'tipografia-legible', 
      'modo-ceguera',
      'reducir-movimiento',
      'subrayar-enlaces',
      'enfoque-mejorado',
      'cursor-grande'
    );
    
    this.html.classList.forEach(cls => {
      if (cls.startsWith('tamano-texto-')) {
        this.html.classList.remove(cls);
      }
    });
    
    // Resetear estilos
    this.body.style.lineHeight = '';
    this.body.style.letterSpacing = '';
    this.html.style.fontSize = '';
    
    // Deshabilitar resaltado de cursor
    if (this.preferences.posicionCursor) {
      this.disableCursorHighlight();
    }
    
    // Resetear preferencias
    this.preferences = {
      contraste: false,
      tipografia: false,
      tamanoTexto: 3,
      modoCeguera: false,
      reducirMovimiento: false,
      subrayarEnlaces: false,
      enfoqueMejorado: false,
      espaciadoLineas: 1.0,
      espaciadoLetras: 0,
      cursorGrande: false,
      posicionCursor: false
    };
    
    this.updateUI();
    this.savePreferences();
    
    if (announce) {
      this.announce('Preferencias restablecidas');
    }
  }

  // Anunciar con lector de pantalla
  announce(message) {
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(message);
    }
  }

  // Exponer métodos globales
  exposeGlobalMethods() {
    window.toggleContrasteAlto = () => this.toggleHighContrast();
    window.toggleTipografiaLegible = () => this.toggleReadableFont();
    window.toggleModoCeguera = () => this.toggleBlindnessMode();
    window.toggleReducirMovimiento = () => this.toggleReducirMovimiento();
    window.toggleSubrayarEnlaces = () => this.toggleSubrayarEnlaces();
    window.toggleEnfoqueMejorado = () => this.toggleEnfoqueMejorado();
    window.toggleCursorGrande = () => this.toggleCursorGrande();
    window.togglePosicionCursor = () => this.togglePosicionCursor();
    
    window.ajustarTamanoTexto = (increase = true) => {
      return increase ? this.increaseTextSize() : this.decreaseTextSize();
    };
    
    window.cambiarTamanoTextoRango = (value) => this.changeTextSizeFromRange(value);
    window.cambiarEspaciadoLineas = (value) => this.changeLineSpacing(value);
    window.cambiarEspaciadoLetras = (value) => this.changeLetterSpacing(value);
    
    window.aplicarPerfilPredefinido = (profile, button) => this.applyProfile(profile, button);
    window.restablecerAjustes = () => this.resetPreferences();
    window.guardarPreferencias = () => {
      this.savePreferences();
      alert('Preferencias guardadas correctamente');
    };
  }
}
