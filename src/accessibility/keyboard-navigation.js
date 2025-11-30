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
    this.setupTabNavigation();
    this.setupModalFocusTrap();
    this.ensureHiddenElementsNotFocusable();
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
    const setupSwitches = () => {
      // Switches con role="switch"
      const switches = document.querySelectorAll('[role="switch"]');
      
      switches.forEach(switchBtn => {
        switchBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            switchBtn.click();
          }
        });
      });

      // Checkboxes ocultos usados como switches (con clase peer)
      const hiddenCheckboxes = document.querySelectorAll('input[type="checkbox"].opacity-0.w-0.h-0.peer, input[type="checkbox"].peer[class*="opacity-0"]');
      
      hiddenCheckboxes.forEach(checkbox => {
        // Asegurar que pueda recibir foco
        if (!checkbox.hasAttribute('tabindex')) {
          checkbox.setAttribute('tabindex', '0');
        }

        // Agregar event listener para Enter y Space
        checkbox.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            checkbox.checked = !checkbox.checked;
            // Disparar evento change para que se ejecuten los handlers
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        // Mejorar visibilidad del foco
        checkbox.addEventListener('focus', () => {
          const label = checkbox.closest('label');
          if (label) {
            label.style.outline = '2px solid #0d59f2';
            label.style.outlineOffset = '2px';
            label.style.borderRadius = '4px';
          }
        });

        checkbox.addEventListener('blur', () => {
          const label = checkbox.closest('label');
          if (label) {
            label.style.outline = '';
            label.style.outlineOffset = '';
            label.style.borderRadius = '';
          }
        });
      });

      // Radio buttons - asegurar navegación por flechas
      const radioGroups = document.querySelectorAll('input[type="radio"][name]');
      const radioGroupsMap = new Map();
      
      radioGroups.forEach(radio => {
        const name = radio.getAttribute('name');
        if (!radioGroupsMap.has(name)) {
          radioGroupsMap.set(name, []);
        }
        radioGroupsMap.get(name).push(radio);
      });

      radioGroupsMap.forEach((radios, name) => {
        radios.forEach((radio, index) => {
          radio.addEventListener('keydown', (e) => {
            let targetIndex = index;
            
            switch(e.key) {
              case 'ArrowRight':
              case 'ArrowDown':
                e.preventDefault();
                targetIndex = (index + 1) % radios.length;
                radios[targetIndex].focus();
                radios[targetIndex].checked = true;
                radios[targetIndex].dispatchEvent(new Event('change', { bubbles: true }));
                break;
                
              case 'ArrowLeft':
              case 'ArrowUp':
                e.preventDefault();
                targetIndex = (index - 1 + radios.length) % radios.length;
                radios[targetIndex].focus();
                radios[targetIndex].checked = true;
                radios[targetIndex].dispatchEvent(new Event('change', { bubbles: true }));
                break;
                
              case 'Home':
                e.preventDefault();
                radios[0].focus();
                radios[0].checked = true;
                radios[0].dispatchEvent(new Event('change', { bubbles: true }));
                break;
                
              case 'End':
                e.preventDefault();
                const lastIndex = radios.length - 1;
                radios[lastIndex].focus();
                radios[lastIndex].checked = true;
                radios[lastIndex].dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
          });
        });
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupSwitches);
    } else {
      setupSwitches();
    }

    // Observar cambios dinámicos en el DOM
    const observer = new MutationObserver(() => {
      setupSwitches();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
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

  /**
   * Asegurar que todos los elementos ocultos no sean accesibles con Tab
   */
  ensureHiddenElementsNotFocusable() {
    const observer = new MutationObserver(() => {
      this.updateHiddenElementsTabindex();
    });

    // Observar cambios en el DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });

    // Ejecutar inicialmente
    this.updateHiddenElementsTabindex();

    // Ejecutar cuando se carga el DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.updateHiddenElementsTabindex();
      });
    }
  }

  /**
   * Actualizar tabindex de elementos ocultos
   */
  updateHiddenElementsTabindex() {
    // Elementos con clase 'hidden'
    document.querySelectorAll('.hidden').forEach(el => {
      if (!el.hasAttribute('tabindex')) {
        el.setAttribute('tabindex', '-1');
      }
    });

    // Elementos con display: none
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        if (el.getAttribute('tabindex') !== '-1') {
          const currentTabindex = el.getAttribute('tabindex');
          if (!currentTabindex || currentTabindex === '0') {
            el.setAttribute('data-original-tabindex', currentTabindex || '0');
            el.setAttribute('tabindex', '-1');
          }
        }
      } else {
        // Restaurar tabindex original si existe
        const originalTabindex = el.getAttribute('data-original-tabindex');
        if (originalTabindex !== null) {
          el.setAttribute('tabindex', originalTabindex);
          el.removeAttribute('data-original-tabindex');
        }
      }
    });

    // Elementos con atributo hidden
    document.querySelectorAll('[hidden]').forEach(el => {
      if (el.getAttribute('tabindex') !== '-1') {
        el.setAttribute('data-original-tabindex', el.getAttribute('tabindex') || '0');
        el.setAttribute('tabindex', '-1');
      }
    });
  }

  /**
   * Configurar navegación por Tab para asegurar que todos los elementos interactivos sean accesibles
   */
  setupTabNavigation() {
    // Asegurar que todos los elementos interactivos tengan tabindex correcto
    const ensureFocusable = () => {
      // Botones sin tabindex
      document.querySelectorAll('button:not([tabindex])').forEach(btn => {
        if (!btn.hasAttribute('tabindex') && !btn.disabled) {
          btn.setAttribute('tabindex', '0');
        }
      });

      // Enlaces sin tabindex
      document.querySelectorAll('a[href]:not([tabindex])').forEach(link => {
        if (!link.hasAttribute('tabindex')) {
          link.setAttribute('tabindex', '0');
        }
      });

      // Inputs, selects, textareas
      document.querySelectorAll('input, select, textarea').forEach(input => {
        if (!input.hasAttribute('tabindex') && !input.disabled) {
          input.setAttribute('tabindex', '0');
        }
      });

      // Elementos con role interactivo
      document.querySelectorAll('[role="button"], [role="link"], [role="tab"], [role="menuitem"]').forEach(el => {
        if (!el.hasAttribute('tabindex') && !el.hasAttribute('aria-disabled')) {
          el.setAttribute('tabindex', '0');
        }
      });
    };

    // Ejecutar al cargar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureFocusable);
    } else {
      ensureFocusable();
    }

    // Observar cambios dinámicos
    const observer = new MutationObserver(ensureFocusable);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Implementar focus trap en modales
   */
  setupModalFocusTrap() {
    const trapFocus = (modal) => {
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (!firstFocusable) return;

      // Enfocar el primer elemento al abrir
      setTimeout(() => firstFocusable.focus(), 100);

      // Manejar Tab y Shift+Tab
      const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      };

      modal.addEventListener('keydown', handleTabKey);

      // Guardar referencia para limpiar después
      modal._focusTrapHandler = handleTabKey;
    };

    // Observar cuando se abren modales
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Verificar si es un modal
            const modals = node.matches && node.matches('[role="dialog"]') 
              ? [node] 
              : node.querySelectorAll && node.querySelectorAll('[role="dialog"]');
            
            if (modals) {
              Array.from(modals).forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                  trapFocus(modal);
                }
              });
            }

            // Verificar si el nodo contiene modales
            if (node.querySelectorAll) {
              node.querySelectorAll('[role="dialog"]:not(.hidden)').forEach(modal => {
                if (!modal._focusTrapHandler) {
                  trapFocus(modal);
                }
              });
            }
          }
        });

        // Verificar cambios en clases para detectar cuando se muestran modales
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.hasAttribute('role') && target.getAttribute('role') === 'dialog') {
            if (!target.classList.contains('hidden') && !target._focusTrapHandler) {
              trapFocus(target);
            } else if (target.classList.contains('hidden') && target._focusTrapHandler) {
              // Limpiar cuando se cierra
              target.removeEventListener('keydown', target._focusTrapHandler);
              delete target._focusTrapHandler;
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    // Aplicar a modales existentes
    document.querySelectorAll('[role="dialog"]:not(.hidden)').forEach(modal => {
      trapFocus(modal);
    });
  }
}

// Inicializar automáticamente
const keyboardNav = new KeyboardNavigation();
keyboardNav.setupGlobalShortcuts();
keyboardNav.enhanceFocusVisibility();

export default keyboardNav;

