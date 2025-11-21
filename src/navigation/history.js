// src/navigation/history.js
// Gestión del historial de navegación

export class NavigationHistory {
  constructor() {
    this.history = ['inicio'];
  }

  push(sectionId) {
    // Si la sección ya existe en el historial y no es la última
    const existingIndex = this.history.indexOf(sectionId);
    
    if (existingIndex !== -1 && existingIndex !== this.history.length - 1) {
      // Cortar el historial desde esa posición (navegación hacia atrás)
      this.history.splice(existingIndex + 1);
    } else if (existingIndex === -1) {
      // Nueva sección, agregar al historial
      this.history.push(sectionId);
    }
    // Si es la última, no hacer nada (ya está ahí)
  }

  pop() {
    if (this.history.length > 1) {
      this.history.pop();
      return this.history[this.history.length - 1];
    }
    return this.history[0];
  }

  getCurrent() {
    return this.history[this.history.length - 1];
  }

  getAll() {
    return [...this.history];
  }

  navigateToIndex(index) {
    if (index >= 0 && index < this.history.length) {
      // Cortar historial hasta el índice especificado
      this.history.splice(index + 1);
      return this.history[index];
    }
    return null;
  }

  clear() {
    this.history = ['inicio'];
  }

  getPrevious() {
    if (this.history.length > 1) {
      return this.history[this.history.length - 2];
    }
    return null;
  }

  canGoBack() {
    return this.history.length > 1;
  }
}