// src/theme/theme-manager.js
// Gestor de temas claro/oscuro

export class ThemeManager {
  constructor() {
    this.currentTheme = 'dark'; // dark, light, auto
    this.init();
  }

  init() {
    // Cargar tema guardado
    const saved = localStorage.getItem('eduVisionTheme');
    if (saved) {
      this.currentTheme = saved;
    } else {
      // Detectar preferencia del sistema
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        this.currentTheme = 'light';
      }
    }

    this.applyTheme(this.currentTheme);
    this.setupThemeToggle();
    this.watchSystemPreference();
  }

  applyTheme(theme) {
    const html = document.documentElement;
    const body = document.body;

    // Remover clases anteriores
    html.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');

    if (theme === 'auto') {
      // Detectar preferencia del sistema
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const actualTheme = isDark ? 'dark' : 'light';
      html.classList.add(actualTheme);
      body.classList.add(actualTheme);
    } else {
      html.classList.add(theme);
      body.classList.add(theme);
    }

    this.currentTheme = theme;
    localStorage.setItem('eduVisionTheme', theme);
    
    // Actualizar UI del selector de tema
    this.updateThemeUI();
    
    // Emitir evento
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  toggleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.applyTheme(themes[nextIndex]);
  }

  setTheme(theme) {
    if (['light', 'dark', 'auto'].includes(theme)) {
      this.applyTheme(theme);
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  getActualTheme() {
    if (this.currentTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return this.currentTheme;
  }

  setupThemeToggle() {
    // Botón en el header
    const themeBtn = document.getElementById('btnTema');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Selector en ajustes de accesibilidad
    const themeSelector = document.getElementById('selectorTema');
    if (themeSelector) {
      themeSelector.value = this.currentTheme;
      themeSelector.addEventListener('change', (e) => {
        this.setTheme(e.target.value);
      });
    }

    // Exponer método global
    window.cambiarTema = (theme) => this.setTheme(theme);
  }

  updateThemeUI() {
    // Actualizar icono del botón
    const themeBtn = document.getElementById('btnTema');
    if (themeBtn) {
      const icon = themeBtn.querySelector('.material-symbols-outlined');
      if (icon) {
        const actualTheme = this.getActualTheme();
        icon.textContent = actualTheme === 'dark' ? 'light_mode' : 'dark_mode';
      }
    }

    // Actualizar selector
    const themeSelector = document.getElementById('selectorTema');
    if (themeSelector) {
      themeSelector.value = this.currentTheme;
    }

    // Actualizar texto descriptivo
    const themeLabel = document.getElementById('temaActualLabel');
    if (themeLabel) {
      const labels = {
        'light': 'Claro',
        'dark': 'Oscuro',
        'auto': 'Automático (Sistema)'
      };
      themeLabel.textContent = `Tema actual: ${labels[this.currentTheme]}`;
    }
  }

  watchSystemPreference() {
    if (!window.matchMedia) return;

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      if (this.currentTheme === 'auto') {
        this.applyTheme('auto');
      }
    });
  }

  // Método para obtener colores según el tema
  getColors() {
    const actualTheme = this.getActualTheme();
    
    if (actualTheme === 'dark') {
      return {
        background: '#0F172A',
        backgroundAlt: '#1E293B',
        text: '#F1F5F9',
        textSecondary: '#CBD5E1',
        border: '#334155',
        primary: '#0d59f2',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      };
    } else {
      return {
        background: '#FFFFFF',
        backgroundAlt: '#F8FAFC',
        text: '#0F172A',
        textSecondary: '#475569',
        border: '#E2E8F0',
        primary: '#0d59f2',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      };
    }
  }
}

// Exportar instancia global
export default ThemeManager;

