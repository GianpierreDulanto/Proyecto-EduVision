// src/accessibility/color-blindness.js
// Filtros específicos para diferentes tipos de daltonismo

export class ColorBlindnessFilters {
  constructor() {
    this.activeFilter = 'none';
    this.init();
  }

  init() {
    this.injectSVGFilters();
    this.loadSavedFilter();
    this.exposeGlobalMethods();
  }

  // Crear filtros SVG para cada tipo de daltonismo
  injectSVGFilters() {
    if (document.getElementById('daltonismo-filters')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'daltonismo-filters';
    svg.style.cssText = 'position: absolute; width: 0; height: 0;';
    svg.innerHTML = `
      <defs>
        <!-- Protanopia (Rojo-ciego) -->
        <filter id="protanopia-filter">
          <feColorMatrix type="matrix" values="
            0.567, 0.433, 0,     0, 0
            0.558, 0.442, 0,     0, 0
            0,     0.242, 0.758, 0, 0
            0,     0,     0,     1, 0
          "/>
        </filter>
        
        <!-- Deuteranopia (Verde-ciego) -->
        <filter id="deuteranopia-filter">
          <feColorMatrix type="matrix" values="
            0.625, 0.375, 0,   0, 0
            0.7,   0.3,   0,   0, 0
            0,     0.3,   0.7, 0, 0
            0,     0,     0,   1, 0
          "/>
        </filter>
        
        <!-- Tritanopia (Azul-ciego) -->
        <filter id="tritanopia-filter">
          <feColorMatrix type="matrix" values="
            0.95, 0.05,  0,     0, 0
            0,    0.433, 0.567, 0, 0
            0,    0.475, 0.525, 0, 0
            0,    0,     0,     1, 0
          "/>
        </filter>
        
        <!-- Protanomaly (Rojo débil) -->
        <filter id="protanomaly-filter">
          <feColorMatrix type="matrix" values="
            0.817, 0.183, 0,     0, 0
            0.333, 0.667, 0,     0, 0
            0,     0.125, 0.875, 0, 0
            0,     0,     0,     1, 0
          "/>
        </filter>
        
        <!-- Deuteranomaly (Verde débil) -->
        <filter id="deuteranomaly-filter">
          <feColorMatrix type="matrix" values="
            0.8,   0.2,   0,     0, 0
            0.258, 0.742, 0,     0, 0
            0,     0.142, 0.858, 0, 0
            0,     0,     0,     1, 0
          "/>
        </filter>
        
        <!-- Tritanomaly (Azul débil) -->
        <filter id="tritanomaly-filter">
          <feColorMatrix type="matrix" values="
            0.967, 0.033, 0,     0, 0
            0,     0.733, 0.267, 0, 0
            0,     0.183, 0.817, 0, 0
            0,     0,     0,     1, 0
          "/>
        </filter>
        
        <!-- Achromatopsia (Monocromático) -->
        <filter id="achromatopsia-filter">
          <feColorMatrix type="matrix" values="
            0.299, 0.587, 0.114, 0, 0
            0.299, 0.587, 0.114, 0, 0
            0.299, 0.587, 0.114, 0, 0
            0,     0,     0,     1, 0
          "/>
        </filter>
      </defs>
    `;
    
    document.body.appendChild(svg);
  }

  applyFilter(filterType) {
    const body = document.body;
    
    // Remover filtros anteriores
    body.style.filter = '';
    body.classList.remove('filter-protanopia', 'filter-deuteranopia', 'filter-tritanopia',
                         'filter-protanomaly', 'filter-deuteranomaly', 'filter-tritanomaly',
                         'filter-achromatopsia');

    if (filterType === 'none') {
      this.activeFilter = 'none';
      localStorage.setItem('colorBlindnessFilter', 'none');
      return;
    }

    // Aplicar nuevo filtro
    if (filterType && filterType !== 'none') {
      body.style.filter = `url(#${filterType}-filter)`;
      body.classList.add(`filter-${filterType}`);
      this.activeFilter = filterType;
      localStorage.setItem('colorBlindnessFilter', filterType);
    }

    // Anunciar cambio
    this.announceFilter(filterType);
  }

  loadSavedFilter() {
    const saved = localStorage.getItem('colorBlindnessFilter');
    if (saved && saved !== 'none') {
      this.applyFilter(saved);
    }
  }

  announceFilter(filterType) {
    const names = {
      'protanopia': 'Protanopia (Ceguera al rojo)',
      'deuteranopia': 'Deuteranopia (Ceguera al verde)',
      'tritanopia': 'Tritanopia (Ceguera al azul)',
      'protanomaly': 'Protanomalía (Visión débil del rojo)',
      'deuteranomaly': 'Deuteranomalía (Visión débil del verde)',
      'tritanomaly': 'Tritanomalía (Visión débil del azul)',
      'achromatopsia': 'Acromatopsia (Visión monocromática)',
      'none': 'Sin filtro'
    };

    const message = `Filtro aplicado: ${names[filterType] || filterType}`;
    
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(message);
    }

    console.log(`✓ ${message}`);
  }

  getActiveFilter() {
    return this.activeFilter;
  }

  // Información sobre cada tipo
  getFilterInfo(filterType) {
    const info = {
      'protanopia': {
        name: 'Protanopia',
        description: 'Ceguera total al rojo. Afecta a ~1% de hombres.',
        severity: 'alta',
        colors: 'Dificultad para distinguir rojo, naranja, amarillo y verde'
      },
      'deuteranopia': {
        name: 'Deuteranopia',
        description: 'Ceguera total al verde. La forma más común, afecta a ~1% de hombres.',
        severity: 'alta',
        colors: 'Dificultad para distinguir verde, amarillo y rojo'
      },
      'tritanopia': {
        name: 'Tritanopia',
        description: 'Ceguera total al azul. Muy rara, afecta a ~0.001% de personas.',
        severity: 'alta',
        colors: 'Dificultad para distinguir azul, amarillo y verde'
      },
      'protanomaly': {
        name: 'Protanomalía',
        description: 'Visión débil del rojo. Afecta a ~1% de hombres.',
        severity: 'media',
        colors: 'Visión reducida del rojo'
      },
      'deuteranomaly': {
        name: 'Deuteranomalía',
        description: 'Visión débil del verde. Afecta a ~5% de hombres, 0.4% de mujeres.',
        severity: 'media',
        colors: 'Visión reducida del verde'
      },
      'tritanomaly': {
        name: 'Tritanomalía',
        description: 'Visión débil del azul. Muy rara.',
        severity: 'media',
        colors: 'Visión reducida del azul'
      },
      'achromatopsia': {
        name: 'Acromatopsia',
        description: 'Visión monocromática total. Extremadamente rara.',
        severity: 'muy alta',
        colors: 'Sin percepción de colores'
      }
    };

    return info[filterType] || null;
  }

  // Exponer métodos globalmente
  exposeGlobalMethods() {
    window.aplicarFiltroDaltonismo = (filterType) => this.applyFilter(filterType);
    window.obtenerFiltroActivo = () => this.getActiveFilter();
    window.obtenerInfoFiltro = (filterType) => this.getFilterInfo(filterType);
  }
}

export default ColorBlindnessFilters;

