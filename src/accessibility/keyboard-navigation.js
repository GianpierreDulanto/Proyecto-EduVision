// src/accessibility/keyboard-navigation.js
// Mejora la navegación por teclado en controles personalizados

export class KeyboardNavigation {
  constructor() {
    this.init();
  }

  init() {
    this.setupRadioGroupNavigation();
    this.setupSwitchNavigation();
    this.setupButtonKeyboard();
    this.setupSliderKeyboard();
  }

  // Navegación para grupos de radio (perfiles)
  setupRadioGroupNavigation() {
    document.addEventListener('DOMContentLoaded', () => {
      const radioGroups = document.querySelectorAll('[role="radiogroup"]');
      
      radioGroups.forEach(group => {
        const radios = Array.from(group.querySelectorAll('[role="radio"]'));
        
        radios.forEach((radio, index) => {
          // Click y Enter/Space para activar
          radio.addEventListener('click', () => {
            this.selectRadio(radio, radios);
          });
          
          radio.addEventListener('keydown', (e) => {
            switch(e.key) {
              case 'Enter':
              case ' ':
                e.preventDefault();
                radio.click();
                break;
                
              case 'ArrowRight':
              case 'ArrowDown':
                e.preventDefault();
                this.focusNextRadio(radios, index);
                break;
                
              case 'ArrowLeft':
              case 'ArrowUp':
                e.preventDefault();
                this.focusPreviousRadio(radios, index);
                break;
                
              case 'Home':
                e.preventDefault();
                this.focusRadio(radios[0], radios);
                break;
                
              case 'End':
                e.preventDefault();
                this.focusRadio(radios[radios.length - 1], radios);
                break;
            }
          });
        });
      });
    });
  }

  selectRadio(selected, allRadios) {
    allRadios.forEach(radio => {
      radio.setAttribute('aria-checked', 'false');
      radio.setAttribute('tabindex', '-1');
    });
    
    selected.setAttribute('aria-checked', 'true');
    selected.setAttribute('tabindex', '0');
  }

  focusRadio(radio, allRadios) {
    this.selectRadio(radio, allRadios);
    radio.focus();
  }

  focusNextRadio(radios, currentIndex) {
    const nextIndex = (currentIndex + 1) % radios.length;
    this.focusRadio(radios[nextIndex], radios);
  }

  focusPreviousRadio(radios, currentIndex) {
    const prevIndex = (currentIndex - 1 + radios.length) % radios.length;
    this.focusRadio(radios[prevIndex], radios);
  }

  // Navegación para switches
  setupSwitchNavigation() {
    document.addEventListener('DOMContentLoaded', () => {
      const switches = document.querySelectorAll('[role="switch"]');
      
      switches.forEach(switchBtn => {
        switchBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            switchBtn.click();
          }
        });
      });
    });
  }

  // Mejorar navegación de botones
  setupButtonKeyboard() {
    document.addEventListener('DOMContentLoaded', () => {
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(button => {
        // Enter y Space activan el botón
        button.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            button.click();
          }
        });
        
        // Feedback visual al presionar
        button.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            button.style.transform = 'scale(0.95)';
          }
        });
        
        button.addEventListener('keyup', () => {
          button.style.transform = '';
        });
      });
    });
  }

  // Mejorar navegación de sliders con teclado
  setupSliderKeyboard() {
    document.addEventListener('DOMContentLoaded', () => {
      const sliders = document.querySelectorAll('input[type="range"]');
      
      sliders.forEach(slider => {
        slider.addEventListener('keydown', (e) => {
          const min = parseFloat(slider.min) || 0;
          const max = parseFloat(slider.max) || 100;
          const step = parseFloat(slider.step) || 1;
          let value = parseFloat(slider.value);
          
          switch(e.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
              e.preventDefault();
              value = Math.max(min, value - step);
              slider.value = value;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              break;
              
            case 'ArrowRight':
            case 'ArrowUp':
              e.preventDefault();
              value = Math.min(max, value + step);
              slider.value = value;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              break;
              
            case 'Home':
              e.preventDefault();
              slider.value = min;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              break;
              
            case 'End':
              e.preventDefault();
              slider.value = max;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              break;
              
            case 'PageUp':
              e.preventDefault();
              value = Math.min(max, value + (step * 10));
              slider.value = value;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              break;
              
            case 'PageDown':
              e.preventDefault();
              value = Math.max(min, value - (step * 10));
              slider.value = value;
              slider.dispatchEvent(new Event('input', { bubbles: true }));
              break;
          }
        });
        
        // Anunciar cambios con el lector de pantalla
        slider.addEventListener('input', () => {
          const label = slider.getAttribute('aria-label') || 'Control deslizante';
          const value = slider.value;
          const valuetext = slider.getAttribute('aria-valuetext') || value;
          
          if (window.lectorPantalla && window.lectorPantalla.activo) {
            window.lectorPantalla.anunciar(`${label}: ${valuetext}`);
          }
        });
      });
    });
  }

  // Método para configurar navegación por flechas en listas
  setupListNavigation(listElement) {
    const items = Array.from(listElement.querySelectorAll('[role="listitem"], li'));
    
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      item.addEventListener('keydown', (e) => {
        let targetIndex;
        
        switch(e.key) {
          case 'ArrowDown':
            e.preventDefault();
            targetIndex = (index + 1) % items.length;
            items[targetIndex].focus();
            break;
            
          case 'ArrowUp':
            e.preventDefault();
            targetIndex = (index - 1 + items.length) % items.length;
            items[targetIndex].focus();
            break;
            
          case 'Home':
            e.preventDefault();
            items[0].focus();
            break;
            
          case 'End':
            e.preventDefault();
            items[items.length - 1].focus();
            break;
        }
      });
      
      item.addEventListener('focus', () => {
        items.forEach(i => i.setAttribute('tabindex', '-1'));
        item.setAttribute('tabindex', '0');
      });
    });
  }

  // Método para crear atajos de teclado globales
  setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + A: Ir a Ajustes de Accesibilidad
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const ajustesLink = document.querySelector('[href="#ajustesAccesibilidad"]');
        if (ajustesLink) ajustesLink.click();
      }
      
      // Alt + H: Ir a Inicio
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        const inicioLink = document.querySelector('[href="#inicio"]');
        if (inicioLink) inicioLink.click();
      }
      
      // Alt + C: Ir a Cursos
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        const cursosLink = document.querySelector('[href="#cursos"]');
        if (cursosLink) cursosLink.click();
      }
      
      // Alt + L: Activar/Desactivar lector de pantalla
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        if (window.lectorPantalla) {
          if (window.lectorPantalla.activo) {
            window.lectorPantalla.desactivar();
          } else {
            window.lectorPantalla.activar();
          }
        }
      }
      
      // Escape: Cerrar modales o volver
      if (e.key === 'Escape') {
        const modal = document.querySelector('[role="dialog"]:not(.hidden)');
        if (modal) {
          const closeBtn = modal.querySelector('[aria-label*="Cerrar"]');
          if (closeBtn) closeBtn.click();
        }
      }
    });
  }

  // Método para mejorar el enfoque visible
  enhanceFocusVisibility() {
    let focusedElement = null;
    
    document.addEventListener('focusin', (e) => {
      if (focusedElement) {
        focusedElement.classList.remove('keyboard-focused');
      }
      
      focusedElement = e.target;
      focusedElement.classList.add('keyboard-focused');
    });
    
    document.addEventListener('focusout', () => {
      if (focusedElement) {
        focusedElement.classList.remove('keyboard-focused');
        focusedElement = null;
      }
    });
    
    // Detectar si se está usando el teclado o el mouse
    document.addEventListener('mousedown', () => {
      document.body.classList.add('using-mouse');
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.remove('using-mouse');
      }
    });
  }

  // Método para gestionar el enfoque en elementos dinámicos
  manageFocusOnDynamicContent(container) {
    const firstFocusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  // Método para crear un roving tabindex
  createRovingTabindex(container, selector) {
    const items = Array.from(container.querySelectorAll(selector));
    
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      item.addEventListener('keydown', (e) => {
        let targetIndex;
        
        switch(e.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            targetIndex = (index + 1) % items.length;
            this.focusItem(items[targetIndex], items);
            break;
            
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            targetIndex = (index - 1 + items.length) % items.length;
            this.focusItem(items[targetIndex], items);
            break;
            
          case 'Home':
            e.preventDefault();
            this.focusItem(items[0], items);
            break;
            
          case 'End':
            e.preventDefault();
            this.focusItem(items[items.length - 1], items);
            break;
        }
      });
    });
  }

  focusItem(item, allItems) {
    allItems.forEach(i => i.setAttribute('tabindex', '-1'));
    item.setAttribute('tabindex', '0');
    item.focus();
  }
}

// Inicializar automáticamente
const keyboardNav = new KeyboardNavigation();
keyboardNav.setupGlobalShortcuts();
keyboardNav.enhanceFocusVisibility();

export default keyboardNav;

