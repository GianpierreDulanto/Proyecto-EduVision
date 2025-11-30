// src/certificates/certificates-controller.js
// Controlador para gestión de certificados

import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

class CertificatesController {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Inicializar controlador
   */
  init() {
    this.currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
  }

  /**
   * Cargar certificados del alumno
   */
  async loadStudentCertificates(alumnoId) {
    try {
      const certificates = await API.getStudentCertificates(alumnoId);
      this.renderCertificates(certificates);
      return certificates;
    } catch (error) {
      console.error('Error al cargar certificados:', error);
      showNotification('Error al cargar certificados', 'error');
      throw error;
    }
  }

  /**
   * Renderizar certificados
   */
  renderCertificates(certificates) {
    const container = document.getElementById('certificatesContainer');
    if (!container) return;

    if (certificates.length === 0) {
      container.innerHTML = `
        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-12 text-center">
          <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">
            workspace_premium
          </span>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Aún no tienes certificados
          </h3>
          <p class="text-slate-600 dark:text-slate-400 mb-6">
            Completa cursos para obtener tus certificados de logro
          </p>
          <a 
            href="#cursos" 
            class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span class="material-symbols-outlined">school</span>
            Explorar Cursos
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Mis Certificados
            </h2>
            <p class="text-slate-600 dark:text-slate-400">
              ${certificates.length} ${certificates.length === 1 ? 'certificado obtenido' : 'certificados obtenidos'}
            </p>
          </div>
          <span class="material-symbols-outlined text-6xl text-primary">
            workspace_premium
          </span>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${certificates.map(cert => this.renderCertificateCard(cert)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renderizar tarjeta de certificado
   */
  renderCertificateCard(certificate) {
    return `
      <article 
        class="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-xl overflow-hidden border-2 border-primary/20 hover:shadow-2xl transition-all"
        aria-label="Certificado de ${certificate.titulo_curso}"
      >
        <!-- Header con imagen del curso -->
        <div class="relative h-40 bg-gradient-to-br from-primary to-blue-600 overflow-hidden">
          ${certificate.imagen_portada ? `
            <img 
              src="${certificate.imagen_portada}" 
              alt="${certificate.titulo_curso}"
              class="w-full h-full object-cover opacity-30"
            />
          ` : ''}
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="material-symbols-outlined text-white text-7xl opacity-50">
              workspace_premium
            </span>
          </div>
        </div>

        <!-- Contenido del certificado -->
        <div class="p-6">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
            ${certificate.titulo_curso}
          </h3>
          
          <div class="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-primary">person</span>
              <span>Docente: ${certificate.nombre_docente}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-primary">calendar_today</span>
              <time datetime="${certificate.fecha_emision}">
                ${new Date(certificate.fecha_emision).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>
            ${certificate.calificacion_final ? `
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base text-primary">grade</span>
                <span>Calificación: ${certificate.calificacion_final}%</span>
              </div>
            ` : ''}
          </div>

          <!-- Código de verificación -->
          <div class="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 mb-4">
            <p class="text-xs text-slate-600 dark:text-slate-400 mb-1">Código de Verificación</p>
            <code class="text-sm font-mono font-bold text-slate-900 dark:text-white block break-all">
              ${certificate.codigo_verificacion}
            </code>
          </div>

          <!-- Botones de acción -->
          <div class="flex gap-2">
            <button 
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              data-certificate-id="${certificate.id_certificado}"
              data-action="download"
              aria-label="Descargar certificado de ${certificate.titulo_curso}"
            >
              <span class="material-symbols-outlined text-xl">download</span>
              <span>Descargar</span>
            </button>
            <button 
              class="flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              data-certificate-code="${certificate.codigo_verificacion}"
              data-action="share"
              aria-label="Compartir certificado"
              title="Compartir"
            >
              <span class="material-symbols-outlined text-xl">share</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Verificar certificado
   */
  async verifyCertificate(codigo) {
    try {
      const certificate = await API.verifyCertificate(codigo);
      this.showCertificateVerification(certificate);
      return certificate;
    } catch (error) {
      console.error('Error al verificar certificado:', error);
      showNotification('Certificado no encontrado', 'error');
      throw error;
    }
  }

  /**
   * Mostrar resultado de verificación
   */
  showCertificateVerification(certificate) {
    const container = document.getElementById('verificationContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-2xl mx-auto border-4 border-green-500">
        <!-- Badge de verificación -->
        <div class="flex justify-center mb-6">
          <div class="relative">
            <span class="material-symbols-outlined text-9xl text-green-500 animate-pulse">
              verified
            </span>
            <span class="absolute inset-0 flex items-center justify-center material-symbols-outlined text-white text-5xl">
              check
            </span>
          </div>
        </div>

        <h2 class="text-3xl font-bold text-center text-slate-900 dark:text-white mb-6">
          Certificado Verificado
        </h2>

        <div class="space-y-4 bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mb-6">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Estudiante</p>
              <p class="font-bold text-slate-900 dark:text-white">${certificate.nombre_alumno}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Curso</p>
              <p class="font-bold text-slate-900 dark:text-white">${certificate.titulo_curso}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Docente</p>
              <p class="font-bold text-slate-900 dark:text-white">${certificate.nombre_docente}</p>
            </div>
            <div>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Fecha de Emisión</p>
              <p class="font-bold text-slate-900 dark:text-white">
                ${new Date(certificate.fecha_emision).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          ${certificate.calificacion_final ? `
            <div class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p class="text-sm text-green-800 dark:text-green-300 mb-1">Calificación Final</p>
              <p class="text-3xl font-bold text-green-600 dark:text-green-400">
                ${certificate.calificacion_final}%
              </p>
            </div>
          ` : ''}

          <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p class="text-sm text-blue-800 dark:text-blue-300 mb-1">Código de Verificación</p>
            <code class="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 block break-all">
              ${certificate.codigo_verificacion}
            </code>
          </div>
        </div>

        <div class="text-center">
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Este certificado ha sido emitido por EduVision y es completamente válido.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Descargar certificado
   */
  downloadCertificate(certificateId) {
    // Implementar descarga de PDF
    showNotification('Funcionalidad de descarga próximamente disponible', 'info');
  }

  /**
   * Compartir certificado
   */
  shareCertificate(codigo) {
    const shareUrl = `${window.location.origin}/#verificar-certificado?codigo=${codigo}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Mi Certificado de EduVision',
        text: '¡He completado un curso en EduVision! Verifica mi certificado:',
        url: shareUrl
      }).catch(err => console.log('Error al compartir:', err));
    } else {
      // Copiar al portapapeles
      navigator.clipboard.writeText(shareUrl).then(() => {
        showNotification('Enlace copiado al portapapeles', 'success');
      });
    }
  }
}

// Exportar instancia única
export const certificatesController = new CertificatesController();
export default certificatesController;

