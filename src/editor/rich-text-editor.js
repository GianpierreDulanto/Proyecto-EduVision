// src/editor/rich-text-editor.js
// Editor WYSIWYG para contenido rico

class RichTextEditor {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.quill = null;
    this.options = {
      placeholder: options.placeholder || 'Escribe aquí...',
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'script': 'sub'}, { 'script': 'super' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }],
          ['link', 'image', 'video'],
          ['code-block', 'blockquote'],
          ['clean']
        ],
        syntax: true
      },
      ...options
    };
  }

  /**
   * Inicializar editor
   */
  init() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Contenedor ${this.containerId} no encontrado`);
      return null;
    }

    // Crear contenedor para Quill si no existe
    if (!container.querySelector('.ql-container')) {
      container.innerHTML = '<div id="' + this.containerId + '-editor"></div>';
      const editorDiv = document.getElementById(this.containerId + '-editor');
      if (editorDiv) {
        this.quill = new Quill('#' + this.containerId + '-editor', this.options);
        this.setupAccessibility();
        this.setupMathSupport();
      }
    } else {
      this.quill = new Quill('#' + this.containerId, this.options);
      this.setupAccessibility();
      this.setupMathSupport();
    }

    return this.quill;
  }

  /**
   * Configurar accesibilidad
   */
  setupAccessibility() {
    if (!this.quill) return;

    // Agregar aria-label al editor
    const editor = this.quill.container;
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-label', this.options.placeholder || 'Editor de texto enriquecido');
    editor.setAttribute('aria-multiline', 'true');

    // Mejorar navegación por teclado
    this.quill.keyboard.addBinding({
      key: 'Tab'
    }, (range, context) => {
      // Permitir tabulación normal
      return true;
    });
  }

  /**
   * Configurar soporte para ecuaciones matemáticas
   */
  setupMathSupport() {
    if (!this.quill) return;

    // Agregar botón para insertar ecuación matemática
    const toolbar = this.quill.getModule('toolbar');
    if (toolbar) {
      // Se puede extender con KaTeX o MathJax
      // Por ahora, permitir código inline para fórmulas
    }
  }

  /**
   * Obtener contenido HTML
   */
  getHTML() {
    if (!this.quill) return '';
    return this.quill.root.innerHTML;
  }

  /**
   * Obtener contenido en texto plano
   */
  getText() {
    if (!this.quill) return '';
    return this.quill.getText();
  }

  /**
   * Establecer contenido HTML
   */
  setHTML(html) {
    if (!this.quill) return;
    this.quill.root.innerHTML = html;
  }

  /**
   * Establecer contenido en texto plano
   */
  setText(text) {
    if (!this.quill) return;
    this.quill.setText(text);
  }

  /**
   * Limpiar editor
   */
  clear() {
    if (!this.quill) return;
    this.quill.setText('');
  }

  /**
   * Habilitar/deshabilitar editor
   */
  enable(enabled = true) {
    if (!this.quill) return;
    this.quill.enable(enabled);
  }

  /**
   * Insertar código con syntax highlighting
   */
  insertCode(code, language = 'javascript') {
    if (!this.quill) return;
    
    const range = this.quill.getSelection(true);
    this.quill.insertText(range.index, code, 'code-block');
    
    // Aplicar syntax highlighting (se puede mejorar con highlight.js)
    const codeBlock = this.quill.getLine(range.index);
    if (codeBlock) {
      codeBlock[0].domNode.setAttribute('data-language', language);
    }
  }

  /**
   * Insertar imagen
   */
  insertImage(url, alt = '') {
    if (!this.quill) return;
    
    const range = this.quill.getSelection(true);
    this.quill.insertEmbed(range.index, 'image', url);
    
    // Agregar alt text
    setTimeout(() => {
      const img = this.quill.container.querySelector('img[src="' + url + '"]');
      if (img) {
        img.setAttribute('alt', alt);
      }
    }, 100);
  }

  /**
   * Obtener instancia de Quill
   */
  getQuill() {
    return this.quill;
  }
}

export default RichTextEditor;

