// src/auth/session.js
// Gestión de sesión de usuario con autenticación real

import { login as apiLogin, register as apiRegister } from '../api/api.js';
import API from '../api/api.js';
import { showNotification } from '../utils/helpers.js';

export class SessionManager {
  constructor() {
    this.loggedIn = false;
    this.user = null; // Objeto completo del usuario
    
    // Cargar sesión desde localStorage
    this.loadSession();
    
    this.setupLoginButton();
    this.setupRegisterButton();
  }

  setupLoginButton() {
    const btnConectarse = document.getElementById('btnConectarse');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');

    if (btnConectarse && loginEmailInput && loginPasswordInput) {
      btnConectarse.addEventListener('click', async (event) => {
        event.preventDefault();
        const correo = loginEmailInput.value.trim();
        const contraseña = loginPasswordInput.value.trim();
        
        if (correo && contraseña) {
          await this.login(correo, contraseña);
        } else {
          showNotification('Por favor completa todos los campos', 'warning');
        }
      });
    }
  }

  setupRegisterButton() {
    const registerForm = document.getElementById('formRegister');
    if (registerForm) {
      registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.handleRegister();
      });
    }

    // Botones para mostrar/ocultar contraseñas
    this.setupPasswordToggles();
  }

  setupPasswordToggles() {
    // Toggle para contraseña de login
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    const loginPassword = document.getElementById('login-password');
    if (toggleLoginPassword && loginPassword) {
      toggleLoginPassword.addEventListener('click', () => {
        const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassword.setAttribute('type', type);
        toggleLoginPassword.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
        toggleLoginPassword.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
      });
    }

    // Toggle para contraseña de registro
    const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
    const registerPassword = document.getElementById('register-password');
    if (toggleRegisterPassword && registerPassword) {
      toggleRegisterPassword.addEventListener('click', () => {
        const type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        registerPassword.setAttribute('type', type);
        toggleRegisterPassword.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
        toggleRegisterPassword.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
      });
    }

    // Toggle para confirmar contraseña
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPassword = document.getElementById('confirm-password');
    if (toggleConfirmPassword && confirmPassword) {
      toggleConfirmPassword.addEventListener('click', () => {
        const type = confirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPassword.setAttribute('type', type);
        toggleConfirmPassword.querySelector('span').textContent = type === 'password' ? 'visibility' : 'visibility_off';
        toggleConfirmPassword.setAttribute('aria-label', type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña');
      });
    }
  }

  async handleRegister() {
    try {
      // Ocultar mensajes anteriores
      this.hideRegisterMessages();

      // Obtener valores del formulario
      const nombre = document.getElementById('register-nombre')?.value.trim();
      const apellido = document.getElementById('register-apellido')?.value.trim();
      const correo = document.getElementById('register-email')?.value.trim();
      const contraseña = document.getElementById('register-password')?.value;
      const confirmarContraseña = document.getElementById('confirm-password')?.value;
      const rolSelect = document.getElementById('user-type');
      const rol = rolSelect?.value;

      // Validaciones del frontend
      if (!nombre || !apellido || !correo || !contraseña || !confirmarContraseña || !rol) {
        const errorMsg = 'Por favor completa todos los campos';
        this.showRegisterError(errorMsg);
        showNotification(errorMsg, 'warning');
        return;
      }

      if (contraseña.length < 6) {
        const errorMsg = 'La contraseña debe tener al menos 6 caracteres';
        this.showRegisterError(errorMsg);
        showNotification(errorMsg, 'warning');
        return;
      }

      if (contraseña !== confirmarContraseña) {
        const errorMsg = 'Las contraseñas no coinciden';
        this.showRegisterError(errorMsg);
        showNotification(errorMsg, 'warning');
        return;
      }

      // Mostrar loading
      const btnRegistrarse = document.getElementById('btnRegistrarse');
      if (btnRegistrarse) {
        btnRegistrarse.disabled = true;
        btnRegistrarse.innerHTML = '<span class="material-symbols-outlined inline-block align-middle mr-2 animate-spin">sync</span> Registrando...';
      }

      // Llamar a la API
      const response = await apiRegister({
        nombre,
        apellido,
        correo,
        contraseña,
        rol
      });

      if (response.success) {
        const successMsg = '¡Cuenta creada exitosamente! 🎉';
        this.showRegisterSuccess(successMsg);
        showNotification(successMsg, 'success', 5000);
        
        // Limpiar formulario
        document.getElementById('formRegister')?.reset();
        
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          // Enfocar el campo de email del login
          const loginEmail = document.getElementById('login-email');
          if (loginEmail) {
            loginEmail.focus();
          }
          const msg = 'Ahora puedes iniciar sesión con tu nueva cuenta';
          this.showRegisterSuccess(msg);
          showNotification(msg, 'info', 4000);
        }, 2000);
      } else {
        const errorMsg = response.error || 'Error al registrar usuario';
        this.showRegisterError(errorMsg);
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Error en registro:', error);
      let errorMessage = 'Error al registrar usuario. Intenta nuevamente.';
      
      // Mensajes de error más específicos
      if (error.message) {
        if (error.message.includes('correo') || error.message.includes('email')) {
          errorMessage = 'Este correo electrónico ya está registrado. Intenta con otro.';
        } else if (error.message.includes('500') || error.message.includes('servidor')) {
          errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
        } else if (error.message.includes('red') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.showRegisterError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      // Restaurar botón
      const btnRegistrarse = document.getElementById('btnRegistrarse');
      if (btnRegistrarse) {
        btnRegistrarse.disabled = false;
        btnRegistrarse.innerHTML = '<span class="material-symbols-outlined inline-block align-middle mr-2">person_add</span> Registrarse';
      }
    }
  }

  showRegisterError(message) {
    const errorDiv = document.getElementById('register-error');
    const errorText = document.getElementById('register-error-text');
    const successDiv = document.getElementById('register-success');
    
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.remove('hidden');
      if (successDiv) successDiv.classList.add('hidden');
      
      // Anunciar al lector de pantalla
      errorDiv.setAttribute('aria-live', 'assertive');
    }
  }

  showRegisterSuccess(message) {
    const successDiv = document.getElementById('register-success');
    const successText = document.getElementById('register-success-text');
    const errorDiv = document.getElementById('register-error');
    
    if (successDiv && successText) {
      successText.textContent = message;
      successDiv.classList.remove('hidden');
      if (errorDiv) errorDiv.classList.add('hidden');
      
      // Anunciar al lector de pantalla
      successDiv.setAttribute('aria-live', 'polite');
    }
  }

  hideRegisterMessages() {
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    if (errorDiv) errorDiv.classList.add('hidden');
    if (successDiv) successDiv.classList.add('hidden');
  }

  async login(correo, contraseña) {
    try {
      // Ocultar mensajes anteriores
      this.hideLoginError();
      
      // Mostrar loading
      const btnConectarse = document.getElementById('btnConectarse');
      if (btnConectarse) {
        btnConectarse.disabled = true;
        btnConectarse.innerHTML = '<span class="material-symbols-outlined inline-block align-middle mr-2 animate-spin">sync</span> Conectando...';
      }
      
      // Llamar a la API
      const response = await apiLogin(correo, contraseña);
      
      if (response.success && response.user) {
        this.loggedIn = true;
        this.user = response.user;
        
        // Guardar sesión en localStorage
        this.saveSession();
        
        // Mostrar notificación de éxito
        const nombreUsuario = `${this.user.nombre} ${this.user.apellido}`.trim() || this.user.correo;
        showNotification(`¡Bienvenido, ${nombreUsuario}! 🎉`, 'success', 4000);
        
        // Actualizar UI
        this.updateNavbarButton();
        
        // Actualizar vista de cursos si está activa
        const cursosSection = document.getElementById('listaCursosAlumno');
        if (cursosSection && !cursosSection.classList.contains('hidden')) {
          if (window.app && window.app.courses) {
            window.app.courses.checkSessionAndRender();
          }
        }
        
        // Redirigir según rol
        let dashboardId = 'dashboardAlumno';
        if (this.user.rol === 'admin') {
          dashboardId = 'dashboardAdmin';
          // Inicializar AdminController si existe
          if (window.app && !window.app.admin) {
            import('../admin/admin-controller.js').then(({ AdminController }) => {
              window.app.admin = new AdminController();
            });
          }
        } else if (this.user.rol === 'docente') {
          dashboardId = 'dashboardDocente';
        } else if (this.user.rol === 'alumno') {
          dashboardId = 'dashboardAlumno';
          // Inicializar StudentController si existe
          if (window.app && !window.app.student) {
            import('../student/student-controller.js').then(({ StudentController }) => {
              window.app.student = new StudentController();
            });
          }
        }
        this.redirectToDashboard(dashboardId);
        
        // Actualizar nombre en dashboard
        this.updateDashboardName();
        
        console.log(`✓ Sesión iniciada: ${this.user.rol} - ${this.user.correo}`);
      } else {
        const errorMsg = 'Error al iniciar sesión. Verifica tus credenciales.';
        this.showLoginError(errorMsg);
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Error en login:', error);
      let errorMessage = 'Credenciales incorrectas o error de conexión';
      
      // Mensajes de error más específicos
      if (error.message) {
        if (error.message.includes('401') || error.message.includes('Credenciales')) {
          errorMessage = 'Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.';
        } else if (error.message.includes('500') || error.message.includes('servidor')) {
          errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
        } else if (error.message.includes('red') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.showLoginError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      // Restaurar botón
      const btnConectarse = document.getElementById('btnConectarse');
      if (btnConectarse) {
        btnConectarse.disabled = false;
        btnConectarse.innerHTML = '<span class="material-symbols-outlined inline-block align-middle mr-2">login</span> Conectarse';
      }
    }
  }

  showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');
    
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.remove('hidden');
      
      // Anunciar al lector de pantalla
      errorDiv.setAttribute('aria-live', 'assertive');
      
      // Enfocar el campo de email para corrección
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) {
        setTimeout(() => loginEmail.focus(), 100);
      }
    } else {
      // Fallback al método anterior si no existe el div
      this.showError(message);
    }
  }

  hideLoginError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
      errorDiv.classList.add('hidden');
    }
  }

  logout() {
    const nombreUsuario = this.user ? `${this.user.nombre} ${this.user.apellido}`.trim() : 'Usuario';
    
    this.loggedIn = false;
    this.user = null;
    
    // Limpiar localStorage
    localStorage.removeItem('eduVisionSession');
    
    // Limpiar campos de login
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';

    // Limpiar vistas de cursos
    if (window.app && window.app.courses) {
      // Forzar actualización de la vista de cursos
      window.app.courses.alumnoId = null;
      window.app.courses.cursosInscritos = [];
      
      // Limpiar vista del catálogo
      const vistaLogueadoCatalogo = document.getElementById('vistaCursosLogueadoCatalogo');
      const vistaNoLogueadoCatalogo = document.getElementById('vistaCursosNoLogueadoCatalogo');
      if (vistaLogueadoCatalogo) vistaLogueadoCatalogo.classList.add('hidden');
      if (vistaNoLogueadoCatalogo) {
        vistaNoLogueadoCatalogo.classList.remove('hidden');
        // Cargar vista informativa
        window.app.courses.loadInformativeViewCatalogo();
      }
      
      // Limpiar vista de Mis Cursos
      const vistaLogueado = document.getElementById('vistaCursosLogueado');
      const vistaNoLogueado = document.getElementById('vistaCursosNoLogueado');
      if (vistaLogueado) vistaLogueado.classList.add('hidden');
      if (vistaNoLogueado) {
        vistaNoLogueado.classList.remove('hidden');
        window.app.courses.loadInformativeView();
      }
    }

    this.updateNavbarButton();
    console.log('👋 Sesión cerrada');
    
    // Mostrar notificación de cierre de sesión
    showNotification(`Sesión cerrada. ¡Hasta pronto, ${nombreUsuario}! 👋`, 'info', 3000);
    
    // Redirigir a inicio
    if (window.app && window.app.router) {
      window.app.router.navigateTo('inicio');
    }
  }

  saveSession() {
    if (this.user) {
      localStorage.setItem('eduVisionSession', JSON.stringify({
        loggedIn: this.loggedIn,
        user: this.user
      }));
    }
  }

  loadSession() {
    try {
      const sessionData = localStorage.getItem('eduVisionSession');
      if (sessionData) {
        const data = JSON.parse(sessionData);
        if (data.loggedIn && data.user) {
          this.loggedIn = data.loggedIn;
          this.user = data.user;
          this.updateNavbarButton();
          console.log('✓ Sesión restaurada:', this.user.correo);
        }
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      localStorage.removeItem('eduVisionSession');
    }
  }

  redirectToDashboard(dashboardId) {
    if (window.app && window.app.router) {
      window.app.router.navigateTo(dashboardId);
    }
  }

  updateNavbarButton() {
    const btnLoginLogout = document.getElementById('btnLoginLogout');
    
    // Actualizar botón Login/Logout
    if (btnLoginLogout) {
      if (this.loggedIn) {
        btnLoginLogout.innerHTML = '<span class="material-symbols-outlined">logout</span><span class="hidden sm:inline">Logout</span>';
        btnLoginLogout.setAttribute('aria-label', 'Cerrar sesión');
        btnLoginLogout.onclick = (e) => {
          e.preventDefault();
          this.logout();
        };
      } else {
        btnLoginLogout.innerHTML = '<span class="material-symbols-outlined">login</span><span class="hidden sm:inline">Login</span>';
        btnLoginLogout.setAttribute('aria-label', 'Iniciar sesión');
        btnLoginLogout.href = '#login';
        btnLoginLogout.onclick = null;
      }
    }

    // Mostrar/ocultar opciones según el rol
    this.updateNavbarVisibility();
  }

  updateNavbarVisibility() {
    const isLoggedIn = this.loggedIn;
    const rol = this.user?.rol;

    // Manejar "Inicio" según el estado de sesión
    const navInicio = document.querySelector('a[data-section="inicio"]');
    const mobileNavInicio = document.querySelector('.mobile-nav-link[data-section="inicio"]');
    const navInicioAlumno = document.getElementById('navInicioAlumno');
    const mobileNavInicioAlumno = document.getElementById('mobileNavInicioAlumno');
    
    if (isLoggedIn) {
      // Si es alumno, mostrar "Inicio" que apunta a dashboardAlumno
      if (rol === 'alumno') {
        // Ocultar el enlace "inicio" normal
        if (navInicio) {
          navInicio.classList.add('hidden');
        }
        if (mobileNavInicio) {
          mobileNavInicio.classList.add('hidden');
        }
        // Mostrar el enlace "Inicio" que apunta a dashboardAlumno
        if (navInicioAlumno) {
          navInicioAlumno.classList.remove('hidden');
          navInicioAlumno.classList.add('flex');
        }
        if (mobileNavInicioAlumno) {
          mobileNavInicioAlumno.classList.remove('hidden');
        }
      } else {
        // Para otros roles, ocultar "Inicio"
        if (navInicio) {
          navInicio.classList.add('hidden');
        }
        if (mobileNavInicio) {
          mobileNavInicio.classList.add('hidden');
        }
        if (navInicioAlumno) {
          navInicioAlumno.classList.add('hidden');
        }
        if (mobileNavInicioAlumno) {
          mobileNavInicioAlumno.classList.add('hidden');
        }
      }
    } else {
      // Mostrar enlace "Inicio" normal cuando NO está logueado
      if (navInicio) {
        navInicio.classList.remove('hidden');
      }
      if (mobileNavInicio) {
        mobileNavInicio.classList.remove('hidden');
      }
      // Ocultar el enlace de dashboardAlumno
      if (navInicioAlumno) {
        navInicioAlumno.classList.add('hidden');
      }
      if (mobileNavInicioAlumno) {
        mobileNavInicioAlumno.classList.add('hidden');
      }
    }

    // Opciones para usuarios logueados
    const navMisCursos = document.getElementById('navMisCursos');
    const navMiPerfil = document.getElementById('navMiPerfil');
    const navDocente = document.getElementById('navDocente');
    const mobileNavMisCursos = document.getElementById('mobileNavMisCursos');
    const mobileNavMiPerfil = document.getElementById('mobileNavMiPerfil');
    const mobileNavDocente = document.getElementById('mobileNavDocente');

    if (isLoggedIn) {
      // Mostrar "Mi Perfil" siempre que esté logueado
      if (navMiPerfil) {
        navMiPerfil.classList.remove('hidden');
        navMiPerfil.classList.add('flex');
      }
      if (mobileNavMiPerfil) {
        mobileNavMiPerfil.classList.remove('hidden');
      }

      // Mostrar "Mis Cursos" solo para alumnos
      if (rol === 'alumno') {
        if (navMisCursos) {
          navMisCursos.classList.remove('hidden');
          navMisCursos.classList.add('flex');
        }
        if (mobileNavMisCursos) {
          mobileNavMisCursos.classList.remove('hidden');
        }
      } else {
        if (navMisCursos) navMisCursos.classList.add('hidden');
        if (mobileNavMisCursos) mobileNavMisCursos.classList.add('hidden');
      }

      // Mostrar "Panel Docente" solo para docentes
      if (rol === 'docente') {
        if (navDocente) {
          navDocente.classList.remove('hidden');
          navDocente.classList.add('flex');
        }
        if (mobileNavDocente) {
          mobileNavDocente.classList.remove('hidden');
        }
      } else {
        if (navDocente) navDocente.classList.add('hidden');
        if (mobileNavDocente) mobileNavDocente.classList.add('hidden');
      }

      // Mostrar "Panel Admin" solo para administradores
      const navAdmin = document.getElementById('navAdmin');
      const mobileNavAdmin = document.getElementById('mobileNavAdmin');
      if (rol === 'admin') {
        if (navAdmin) {
          navAdmin.classList.remove('hidden');
          navAdmin.classList.add('flex');
        }
        if (mobileNavAdmin) {
          mobileNavAdmin.classList.remove('hidden');
        }
      } else {
        if (navAdmin) navAdmin.classList.add('hidden');
        if (mobileNavAdmin) mobileNavAdmin.classList.add('hidden');
      }
    } else {
      // Ocultar todas las opciones de usuario logueado
      if (navMisCursos) navMisCursos.classList.add('hidden');
      if (navMiPerfil) navMiPerfil.classList.add('hidden');
      if (navDocente) navDocente.classList.add('hidden');
      const navAdmin = document.getElementById('navAdmin');
      const mobileNavAdmin = document.getElementById('mobileNavAdmin');
      if (navAdmin) navAdmin.classList.add('hidden');
      if (mobileNavAdmin) mobileNavAdmin.classList.add('hidden');
      if (mobileNavMisCursos) mobileNavMisCursos.classList.add('hidden');
      if (mobileNavMiPerfil) mobileNavMiPerfil.classList.add('hidden');
      if (mobileNavDocente) mobileNavDocente.classList.add('hidden');
    }

    // Cargar datos del perfil si está logueado
    if (isLoggedIn && rol) {
      this.loadProfileData();
    }

    // Mostrar/ocultar botón "Mis Cursos" en el catálogo
    const btnMisCursosCatalogo = document.getElementById('btnMisCursosCatalogo');
    if (btnMisCursosCatalogo) {
      if (isLoggedIn && rol === 'alumno') {
        btnMisCursosCatalogo.classList.remove('hidden');
      } else {
        btnMisCursosCatalogo.classList.add('hidden');
      }
    }

    // Ocultar enlace "Cursos" para docentes (solo deben ver sus propios cursos en el panel docente)
    const navCursos = document.querySelector('a[data-section="cursos"]');
    const mobileNavCursos = document.querySelector('.mobile-nav-link[data-section="cursos"]');
    
    if (isLoggedIn && rol === 'docente') {
      // Ocultar enlace de cursos para docentes
      if (navCursos) {
        navCursos.classList.add('hidden');
      }
      if (mobileNavCursos) {
        mobileNavCursos.classList.add('hidden');
      }
    } else {
      // Mostrar enlace de cursos para otros usuarios o no logueados
      if (navCursos) {
        navCursos.classList.remove('hidden');
      }
      if (mobileNavCursos) {
        mobileNavCursos.classList.remove('hidden');
      }
    }
  }

  loadProfileData() {
    if (!this.user) return;

    // Actualizar información del perfil
    const perfilNombre = document.getElementById('perfil-nombre');
    const perfilApellido = document.getElementById('perfil-apellido');
    const perfilCorreo = document.getElementById('perfil-correo');
    const perfilRol = document.getElementById('perfil-rol');

    if (perfilNombre) perfilNombre.textContent = this.user.nombre || 'No disponible';
    if (perfilApellido) perfilApellido.textContent = this.user.apellido || 'No disponible';
    if (perfilCorreo) perfilCorreo.textContent = this.user.correo || 'No disponible';
    
    if (perfilRol) {
      const roles = {
        'alumno': '👨‍🎓 Alumno',
        'docente': '👨‍🏫 Docente',
        'admin': '👤 Administrador'
      };
      perfilRol.textContent = roles[this.user.rol] || this.user.rol;
    }

    // Ocultar estadísticas (Cursos, Progreso) - Solo para alumnos
    const estadisticasSection = document.getElementById('estadisticasPerfil');
    if (estadisticasSection) {
      if (this.user.rol === 'alumno') {
        estadisticasSection.classList.remove('hidden');
        // Cargar estadísticas del alumno
        this.loadAlumnoEstadisticas();
      } else {
        // Ocultar para docentes y administradores
        estadisticasSection.classList.add('hidden');
      }
    }
  }

  /**
   * Cargar estadísticas del alumno para el perfil
   * Usa la misma lógica que el dashboard: porcentaje de cursos completados
   */
  async loadAlumnoEstadisticas() {
    if (!this.user || this.user.rol !== 'alumno' || !this.user.id_alumno) return;

    try {
      // Obtener cursos del alumno
      const cursos = await API.getAlumnoCursos(this.user.id_alumno);
      const totalCursos = cursos && Array.isArray(cursos) ? cursos.length : 0;

      // Calcular progreso usando la misma lógica que el dashboard
      // Progreso = (cursos completados / total cursos) * 100
      let progresoPorcentaje = 0;
      if (cursos && Array.isArray(cursos) && cursos.length > 0) {
        // Contar cursos completados (donde finalizado === true o 1)
        const cursosCompletados = cursos.filter(c => c.finalizado === true || c.finalizado === 1).length;
        
        // Calcular porcentaje igual que en StudentController
        if (totalCursos > 0) {
          progresoPorcentaje = Math.round((cursosCompletados / totalCursos) * 100);
        }
      }

      // Actualizar UI
      const perfilTotalCursos = document.getElementById('perfil-total-cursos');
      const perfilProgreso = document.getElementById('perfil-progreso');

      if (perfilTotalCursos) {
        perfilTotalCursos.textContent = totalCursos;
      }
      if (perfilProgreso) {
        // Asegurar que siempre sea un número válido
        const progresoFinal = isNaN(progresoPorcentaje) ? 0 : progresoPorcentaje;
        perfilProgreso.textContent = `${progresoFinal}%`;
      }
    } catch (error) {
      console.error('Error al cargar estadísticas del alumno:', error);
      // Asegurar que se muestre 0% en caso de error
      const perfilProgreso = document.getElementById('perfil-progreso');
      if (perfilProgreso) {
        perfilProgreso.textContent = '0%';
      }
    }
  }

  updateDashboardName() {
    if (!this.user) return;
    
    // Actualizar nombre en dashboard de alumno
    const alumnoName = document.querySelector('#dashboardAlumno h2');
    if (alumnoName && this.user.rol === 'alumno') {
      alumnoName.textContent = `Bienvenido, ${this.user.nombre}!`;
    }
    
    // Actualizar nombre en dashboard de docente
    const docenteName = document.querySelector('#dashboardDocente .text-2xl');
    if (docenteName && this.user.rol === 'docente') {
      docenteName.textContent = `¡Bienvenida, ${this.user.nombre}!`;
    }
  }

  showError(message) {
    // Crear o actualizar mensaje de error
    let errorDiv = document.querySelector('.login-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'login-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4';
      errorDiv.setAttribute('role', 'alert');
      
      const loginSection = document.getElementById('login');
      const firstForm = loginSection.querySelector('form');
      if (firstForm) {
        firstForm.parentNode.insertBefore(errorDiv, firstForm);
      }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
    
    // Leer con lector de pantalla
    if (window.lectorPantalla && window.lectorPantalla.activo) {
      window.lectorPantalla.anunciar(message);
    }
  }

  showLoading(show) {
    const btnConectarse = document.getElementById('btnConectarse');
    if (btnConectarse) {
      btnConectarse.disabled = show;
      btnConectarse.textContent = show ? 'Conectando...' : 'Conectarse';
    }
  }

  // Getters
  isLoggedIn() {
    return this.loggedIn;
  }

  getUser() {
    return this.user;
  }

  getUserId() {
    return this.user ? this.user.id_usuario : null;
  }

  getUserType() {
    return this.user ? this.user.rol : null;
  }

  getUserEmail() {
    return this.user ? this.user.correo : null;
  }

  getAlumnoId() {
    return this.user && this.user.rol === 'alumno' ? this.user.id_alumno : null;
  }

  getDocenteId() {
    return this.user && this.user.rol === 'docente' ? this.user.id_docente : null;
  }

  isStudent() {
    return this.user && this.user.rol === 'alumno';
  }

  isTeacher() {
    return this.user && this.user.rol === 'docente';
  }

  isAdmin() {
    return this.user && this.user.rol === 'admin';
  }
}