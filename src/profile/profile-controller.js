// src/profile/profile-controller.js
// Controlador para gestión de perfil de usuario

import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

class ProfileController {
  constructor() {
    this.currentUser = null;
    this.isEditing = false;
  }

  /**
   * Inicializar el controlador de perfil
   */
  init() {
    this.currentUser = JSON.parse(localStorage.getItem('usuario') || '{}');
    this.setupEventListeners();
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    // Botón editar perfil
    const btnEditProfile = document.getElementById('btnEditProfile');
    if (btnEditProfile) {
      btnEditProfile.addEventListener('click', () => this.toggleEditMode());
    }

    // Formulario de perfil
    const formProfile = document.getElementById('formProfile');
    if (formProfile) {
      formProfile.addEventListener('submit', (e) => this.handleProfileSubmit(e));
    }

    // Upload de avatar
    const inputAvatar = document.getElementById('inputAvatar');
    if (inputAvatar) {
      inputAvatar.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }
  }

  /**
   * Cargar perfil del usuario
   */
  async loadProfile(usuarioId) {
    try {
      const profile = await API.getUserProfile(usuarioId);
      this.renderProfile(profile);
      
      // Cargar configuración de accesibilidad
      const accessConfig = await API.getAccessibilityConfig(usuarioId);
      this.renderAccessibilitySettings(accessConfig);
      
      // Cargar logros si es alumno
      if (profile.rol === 'alumno' && profile.id_alumno) {
        if (window.app?.achievements) {
          await window.app.achievements.loadAlumnoLogros(profile.id_alumno);
        }
        // Cargar estadísticas
        if (window.app?.statistics) {
          await window.app.statistics.loadStudentStatistics(profile.id_alumno);
        }
      }
      
      return profile;
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      showNotification('Error al cargar perfil', 'error');
      throw error;
    }
  }

  /**
   * Renderizar perfil
   */
  renderProfile(profile) {
    const container = document.getElementById('profileContainer');
    if (!container) return;

    const avatarUrl = profile.avatar || '/uploads/default-avatar.png';

    container.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <!-- Header del perfil -->
        <div class="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <!-- Avatar -->
          <div class="relative group">
            <img 
              src="${avatarUrl}" 
              alt="Avatar de ${profile.nombre}" 
              class="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
              aria-label="Foto de perfil"
            />
            <button 
              id="btnChangeAvatar"
              class="absolute bottom-0 right-0 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Cambiar foto de perfil"
              title="Cambiar avatar"
            >
              <span class="material-symbols-outlined text-xl">photo_camera</span>
            </button>
            <input type="file" id="inputAvatar" accept="image/*" class="hidden" />
          </div>

          <!-- Información básica -->
          <div class="flex-1 text-center sm:text-left">
            <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              ${profile.nombre} ${profile.apellido}
            </h2>
            <p class="text-lg text-slate-600 dark:text-slate-400 mb-3">
              ${profile.correo}
            </p>
            <div class="flex items-center gap-3 justify-center sm:justify-start">
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                profile.rol === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                profile.rol === 'docente' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }">
                <span class="material-symbols-outlined text-base">
                  ${profile.rol === 'admin' ? 'admin_panel_settings' : profile.rol === 'docente' ? 'school' : 'person'}
                </span>
                ${profile.rol === 'admin' ? 'Administrador' : profile.rol === 'docente' ? 'Docente' : 'Alumno'}
              </span>
              ${profile.verificado ? `
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <span class="material-symbols-outlined text-base">verified</span>
                  Verificado
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Botón editar -->
          <button 
            id="btnEditProfile"
            class="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Editar perfil"
          >
            <span class="material-symbols-outlined">edit</span>
            <span class="hidden sm:inline">Editar Perfil</span>
          </button>
        </div>

        <!-- Formulario de edición (oculto por defecto) -->
        <form id="formProfile" class="hidden">
          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label for="inputNombre" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Nombre
              </label>
              <input 
                type="text" 
                id="inputNombre" 
                name="nombre" 
                value="${profile.nombre}"
                class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                required
                aria-label="Nombre"
              />
            </div>
            <div>
              <label for="inputApellido" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Apellido
              </label>
              <input 
                type="text" 
                id="inputApellido" 
                name="apellido" 
                value="${profile.apellido}"
                class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                required
                aria-label="Apellido"
              />
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label for="inputTelefono" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Teléfono
              </label>
              <input 
                type="tel" 
                id="inputTelefono" 
                name="telefono" 
                value="${profile.telefono || ''}"
                class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                aria-label="Teléfono"
              />
            </div>
            <div>
              <label for="inputPais" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                País
              </label>
              <input 
                type="text" 
                id="inputPais" 
                name="pais" 
                value="${profile.pais || ''}"
                class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                aria-label="País"
              />
            </div>
          </div>

          <div class="mb-6">
            <label for="inputBiografia" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Biografía
            </label>
            <textarea 
              id="inputBiografia" 
              name="biografia" 
              rows="4"
              class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              aria-label="Biografía"
            >${profile.biografia || ''}</textarea>
          </div>

          <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label for="inputSitioWeb" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Sitio Web
              </label>
              <input 
                type="url" 
                id="inputSitioWeb" 
                name="sitio_web" 
                value="${profile.sitio_web || ''}"
                class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                placeholder="https://ejemplo.com"
                aria-label="Sitio web"
              />
            </div>
            <div>
              <label for="inputLinkedin" class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                LinkedIn
              </label>
              <input 
                type="url" 
                id="inputLinkedin" 
                name="linkedin" 
                value="${profile.linkedin || ''}"
                class="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                placeholder="https://linkedin.com/in/..."
                aria-label="Perfil de LinkedIn"
              />
            </div>
          </div>

          <div class="flex gap-4 justify-end">
            <button 
              type="button" 
              id="btnCancelEdit"
              class="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
              aria-label="Cancelar edición"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              class="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Guardar cambios"
            >
              Guardar Cambios
            </button>
          </div>
        </form>

        <!-- Información en modo vista -->
        <div id="profileViewMode" class="space-y-6">
          ${profile.biografia ? `
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Biografía</h3>
              <p class="text-slate-700 dark:text-slate-300">${profile.biografia}</p>
            </div>
          ` : ''}

          <div class="grid md:grid-cols-2 gap-6">
            ${profile.telefono ? `
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary text-2xl">phone</span>
                <div>
                  <p class="text-sm text-slate-600 dark:text-slate-400">Teléfono</p>
                  <p class="font-semibold text-slate-900 dark:text-white">${profile.telefono}</p>
                </div>
              </div>
            ` : ''}
            ${profile.pais ? `
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary text-2xl">public</span>
                <div>
                  <p class="text-sm text-slate-600 dark:text-slate-400">País</p>
                  <p class="font-semibold text-slate-900 dark:text-white">${profile.pais}</p>
                </div>
              </div>
            ` : ''}
          </div>

          ${profile.sitio_web || profile.linkedin ? `
            <div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-3">Enlaces</h3>
              <div class="flex flex-wrap gap-3">
                ${profile.sitio_web ? `
                  <a href="${profile.sitio_web}" target="_blank" rel="noopener noreferrer" 
                     class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
                    <span class="material-symbols-outlined text-xl">language</span>
                    Sitio Web
                  </a>
                ` : ''}
                ${profile.linkedin ? `
                  <a href="${profile.linkedin}" target="_blank" rel="noopener noreferrer" 
                     class="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <span class="material-symbols-outlined text-xl">work</span>
                    LinkedIn
                  </a>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Configurar eventos después de renderizar
    this.setupEventListeners();
    
    // Botón cambiar avatar
    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    if (btnChangeAvatar) {
      btnChangeAvatar.addEventListener('click', () => {
        document.getElementById('inputAvatar').click();
      });
    }

    // Botón cancelar
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => this.toggleEditMode());
    }
  }

  /**
   * Alternar modo de edición
   */
  toggleEditMode() {
    this.isEditing = !this.isEditing;
    const form = document.getElementById('formProfile');
    const viewMode = document.getElementById('profileViewMode');
    const btnEdit = document.getElementById('btnEditProfile');

    if (this.isEditing) {
      form?.classList.remove('hidden');
      viewMode?.classList.add('hidden');
      if (btnEdit) {
        btnEdit.innerHTML = '<span class="material-symbols-outlined">close</span><span class="hidden sm:inline">Cancelar</span>';
      }
    } else {
      form?.classList.add('hidden');
      viewMode?.classList.remove('hidden');
      if (btnEdit) {
        btnEdit.innerHTML = '<span class="material-symbols-outlined">edit</span><span class="hidden sm:inline">Editar Perfil</span>';
      }
    }
  }

  /**
   * Manejar envío del formulario de perfil
   */
  async handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      await API.updateUserProfile(this.currentUser.id_usuario, data);
      showNotification('Perfil actualizado correctamente', 'success');
      
      // Recargar perfil
      await this.loadProfile(this.currentUser.id_usuario);
      this.toggleEditMode();
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      showNotification('Error al actualizar perfil', 'error');
    }
  }

  /**
   * Manejar upload de avatar
   */
  async handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      showNotification('Por favor selecciona una imagen válida', 'error');
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification('La imagen no debe superar 5MB', 'error');
      return;
    }

    try {
      const result = await API.uploadAvatar(this.currentUser.id_usuario, file);
      showNotification('Avatar actualizado correctamente', 'success');
      
      // Actualizar imagen en la UI
      const imgAvatar = document.querySelector('img[alt^="Avatar de"]');
      if (imgAvatar) {
        imgAvatar.src = result.url;
      }
    } catch (error) {
      console.error('Error al subir avatar:', error);
      showNotification('Error al subir avatar', 'error');
    }
  }

  /**
   * Renderizar configuración de accesibilidad
   */
  renderAccessibilitySettings(config) {
    // Este método se puede expandir para mostrar la configuración de accesibilidad del usuario
    console.log('Configuración de accesibilidad:', config);
  }

  /**
   * Mostrar modal de cambio de contraseña
   */
  showChangePasswordModal() {
    const modal = document.getElementById('modalChangePassword');
    if (modal) {
      modal.classList.remove('hidden');
      document.getElementById('formChangePassword').reset();
    }
  }

  /**
   * Cerrar modal de cambio de contraseña
   */
  closeChangePasswordModal() {
    const modal = document.getElementById('modalChangePassword');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Manejar cambio de contraseña
   */
  async handleChangePassword(e) {
    e.preventDefault();
    
    const contraseñaActual = document.getElementById('inputContraseñaActual').value;
    const contraseñaNueva = document.getElementById('inputContraseñaNueva').value;
    const contraseñaConfirmar = document.getElementById('inputContraseñaConfirmar').value;
    
    if (!contraseñaActual || !contraseñaNueva || !contraseñaConfirmar) {
      showNotification('Por favor completa todos los campos', 'warning');
      return;
    }
    
    if (contraseñaNueva !== contraseñaConfirmar) {
      showNotification('Las contraseñas no coinciden', 'error');
      return;
    }
    
    if (contraseñaNueva.length < 6) {
      showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    
    try {
      await API.changePassword(this.currentUser.id_usuario, contraseñaActual, contraseñaNueva);
      showNotification('Contraseña actualizada correctamente', 'success');
      this.closeChangePasswordModal();
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      showNotification(error.message || 'Error al cambiar la contraseña', 'error');
    }
  }

  /**
   * Mostrar preferencias de notificaciones
   */
  showNotificationPreferences() {
    const modal = document.getElementById('modalNotificationPreferences');
    if (modal) {
      modal.classList.remove('hidden');
      this.loadNotificationPreferences();
    }
  }

  /**
   * Cargar preferencias de notificaciones
   */
  async loadNotificationPreferences() {
    // Por ahora usar localStorage, luego se puede conectar con backend
    const prefs = JSON.parse(localStorage.getItem('notificationPreferences') || '{}');
    
    document.getElementById('prefEmailNotifications').checked = prefs.email !== false;
    document.getElementById('prefPushNotifications').checked = prefs.push !== false;
    document.getElementById('prefCourseUpdates').checked = prefs.courseUpdates !== false;
    document.getElementById('prefNewMessages').checked = prefs.newMessages !== false;
    document.getElementById('prefAchievements').checked = prefs.achievements !== false;
  }

  /**
   * Guardar preferencias de notificaciones
   */
  async saveNotificationPreferences() {
    const prefs = {
      email: document.getElementById('prefEmailNotifications').checked,
      push: document.getElementById('prefPushNotifications').checked,
      courseUpdates: document.getElementById('prefCourseUpdates').checked,
      newMessages: document.getElementById('prefNewMessages').checked,
      achievements: document.getElementById('prefAchievements').checked
    };
    
    localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
    showNotification('Preferencias guardadas correctamente', 'success');
    
    const modal = document.getElementById('modalNotificationPreferences');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
}

// Exportar instancia única
export const profileController = new ProfileController();
export default profileController;

