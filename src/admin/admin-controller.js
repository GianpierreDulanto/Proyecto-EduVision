// src/admin/admin-controller.js
// Controlador para funcionalidades de administrador

import API from '../api/api.js';

export class AdminController {
  constructor() {
    this.currentTab = 'pendientes';
    this.usuarios = [];
    this.pendientes = {
      cursos: [],
      contenidos: [],
      recursos: []
    };
    this.categorias = [];
    this.grados = [];
    
    this.initialize();
  }

  async initialize() {
    try {
      // Cargar datos iniciales
      await this.cargarEstadisticas();
      await this.cargarPendientes();
      await this.cargarUsuarios();
      await this.cargarCategorias();
      await this.cargarGrados();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('✓ Controlador de administrador inicializado');
    } catch (error) {
      console.error('Error al inicializar controlador de admin:', error);
    }
  }

  setupEventListeners() {
    // Formularios
    const formAprobacion = document.getElementById('formAprobacion');
    if (formAprobacion) {
      formAprobacion.addEventListener('submit', (e) => this.handleAprobacion(e));
    }
    
    const formEditarUsuario = document.getElementById('formEditarUsuario');
    if (formEditarUsuario) {
      formEditarUsuario.addEventListener('submit', (e) => this.handleEditarUsuario(e));
    }
    
    const formCategoria = document.getElementById('formCategoria');
    if (formCategoria) {
      formCategoria.addEventListener('submit', (e) => this.handleGuardarCategoria(e));
    }
    
    const formGrado = document.getElementById('formGrado');
    if (formGrado) {
      formGrado.addEventListener('submit', (e) => this.handleGuardarGrado(e));
    }
  }

  // ================== NAVEGACIÓN DE TABS ==================

  cambiarTab(tabName) {
    this.currentTab = tabName;
    
    // Ocultar todos los tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
      tab.classList.add('hidden');
    });
    
    // Remover active de todos los botones
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.classList.remove('active', 'border-primary', 'text-slate-900', 'dark:text-white');
      btn.classList.add('text-slate-600', 'dark:text-slate-400', 'border-transparent');
    });
    
    // Mostrar tab seleccionado
    const tabContent = document.getElementById(`adminTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (tabContent) {
      tabContent.classList.remove('hidden');
    }
    
    // Activar botón
    const activeBtn = Array.from(document.querySelectorAll('.admin-tab')).find(btn => 
      btn.textContent.includes(this.getTabLabel(tabName))
    );
    if (activeBtn) {
      activeBtn.classList.add('active', 'border-primary', 'text-slate-900', 'dark:text-white');
      activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400', 'border-transparent');
    }
    
    // Cargar datos según el tab
    switch(tabName) {
      case 'pendientes':
        this.cargarPendientes();
        break;
      case 'usuarios':
        this.cargarUsuarios();
        break;
      case 'categorias':
        this.cargarCategorias();
        this.cargarGrados();
        break;
      case 'estadisticas':
        this.cargarEstadisticas();
        break;
      case 'historial':
        this.cargarHistorialAprobaciones();
        break;
    }
  }

  getTabLabel(tabName) {
    const labels = {
      'pendientes': 'Pendientes',
      'usuarios': 'Usuarios',
      'categorias': 'Categorías',
      'estadisticas': 'Estadísticas',
      'historial': 'Historial'
    };
    return labels[tabName] || tabName;
  }

  // ================== ESTADÍSTICAS ==================

  async cargarEstadisticas() {
    try {
      // Cargar usuarios
      const usuarios = await API.getUsuarios();
      const totalUsuarios = usuarios.length;
      const totalAlumnos = usuarios.filter(u => u.rol === 'alumno').length;
      
      // Cargar pendientes
      const pendientes = await API.getPendientesAprobacion();
      const totalPendientes = (pendientes.cursos?.length || 0) + 
                             (pendientes.contenidos?.length || 0) + 
                             (pendientes.recursos?.length || 0);
      
      // Cargar cursos (todos)
      const cursos = await API.getCursos({});
      const totalCursos = cursos.length;
      
      // Actualizar UI
      document.getElementById('adminStatUsuarios').textContent = totalUsuarios;
      document.getElementById('adminStatPendientes').textContent = totalPendientes;
      document.getElementById('adminStatCursos').textContent = totalCursos;
      document.getElementById('adminStatAlumnos').textContent = totalAlumnos;
      
      // Cargar estadísticas detalladas si estamos en el tab
      if (this.currentTab === 'estadisticas') {
        this.renderEstadisticasDetalladas(usuarios, cursos, pendientes);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }

  renderEstadisticasDetalladas(usuarios, cursos, pendientes) {
    const container = document.getElementById('adminEstadisticas');
    if (!container) return;
    
    const usuariosPorRol = {
      admin: usuarios.filter(u => u.rol === 'admin').length,
      docente: usuarios.filter(u => u.rol === 'docente').length,
      alumno: usuarios.filter(u => u.rol === 'alumno').length
    };
    
    const cursosPorEstado = {
      pendiente: cursos.filter(c => c.estado === 'pendiente').length,
      aprobado: cursos.filter(c => c.estado === 'aprobado').length,
      publicado: cursos.filter(c => c.estado === 'publicado').length,
      rechazado: cursos.filter(c => c.estado === 'rechazado').length
    };
    
    // Calcular estadísticas adicionales
    const usuariosActivos = usuarios.filter(u => u.estado === 'activo').length;
    const usuariosInactivos = usuarios.filter(u => u.estado === 'inactivo').length;
    
    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Gráfico de Usuarios por Rol -->
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Usuarios por Rol</h3>
          <div style="height: 250px; position: relative;">
            <canvas id="chartUsuariosRol"></canvas>
          </div>
        </div>
        
        <!-- Gráfico de Cursos por Estado -->
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Cursos por Estado</h3>
          <div style="height: 250px; position: relative;">
            <canvas id="chartCursosEstado"></canvas>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Gráfico de Estado de Usuarios -->
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Estado de Usuarios</h3>
          <div style="height: 250px; position: relative;">
            <canvas id="chartUsuariosEstado"></canvas>
          </div>
        </div>
        
        <!-- Estadísticas de Pendientes -->
        <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Contenido Pendiente</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-yellow-600 text-2xl">school</span>
                <span class="text-slate-700 dark:text-slate-300">Cursos</span>
              </div>
              <span class="text-2xl font-bold text-yellow-600">${pendientes.cursos?.length || 0}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-yellow-600 text-2xl">description</span>
                <span class="text-slate-700 dark:text-slate-300">Contenidos</span>
              </div>
              <span class="text-2xl font-bold text-yellow-600">${pendientes.contenidos?.length || 0}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-yellow-600 text-2xl">link</span>
                <span class="text-slate-700 dark:text-slate-300">Recursos</span>
              </div>
              <span class="text-2xl font-bold text-yellow-600">${pendientes.recursos?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Resumen de Estadísticas -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Resumen General</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p class="text-3xl font-bold text-blue-600">${usuariosPorRol.docente}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Docentes</p>
          </div>
          <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p class="text-3xl font-bold text-green-600">${usuariosPorRol.alumno}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Alumnos</p>
          </div>
          <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p class="text-3xl font-bold text-purple-600">${cursosPorEstado.publicado}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Cursos Publicados</p>
          </div>
          <div class="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p class="text-3xl font-bold text-orange-600">${usuariosActivos}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Usuarios Activos</p>
          </div>
        </div>
      </div>
      
      <!-- Estadísticas Adicionales -->
      <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-4">Estadísticas Detalladas</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Administradores</p>
            <p class="text-2xl font-bold text-slate-900 dark:text-white">${usuariosPorRol.admin || 0}</p>
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Cursos Pendientes</p>
            <p class="text-2xl font-bold text-yellow-600">${cursosPorEstado.pendiente || 0}</p>
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Cursos Aprobados</p>
            <p class="text-2xl font-bold text-green-600">${cursosPorEstado.aprobado || 0}</p>
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Cursos Rechazados</p>
            <p class="text-2xl font-bold text-red-600">${cursosPorEstado.rechazado || 0}</p>
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Usuarios Inactivos</p>
            <p class="text-2xl font-bold text-red-600">${usuariosInactivos || 0}</p>
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Total de Cursos</p>
            <p class="text-2xl font-bold text-blue-600">${Object.values(cursosPorEstado).reduce((a, b) => a + (b || 0), 0)}</p>
          </div>
        </div>
      </div>
    `;
    
    // Renderizar gráficos después de que el HTML esté en el DOM
    setTimeout(() => {
      this.renderCharts(usuariosPorRol, cursosPorEstado, usuariosActivos, usuariosInactivos);
    }, 100);
  }

  renderCharts(usuariosPorRol, cursosPorEstado, usuariosActivos, usuariosInactivos) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e2e8f0' : '#1e293b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';
    
    // Gráfico de Usuarios por Rol (Doughnut)
    const ctxUsuariosRol = document.getElementById('chartUsuariosRol');
    if (ctxUsuariosRol) {
      new Chart(ctxUsuariosRol, {
        type: 'doughnut',
        data: {
          labels: ['Docentes', 'Alumnos', 'Administradores'],
          datasets: [{
            data: [usuariosPorRol.docente, usuariosPorRol.alumno, usuariosPorRol.admin],
            backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor }
            }
          }
        }
      });
    }
    
    // Gráfico de Cursos por Estado (Bar)
    const ctxCursosEstado = document.getElementById('chartCursosEstado');
    if (ctxCursosEstado) {
      new Chart(ctxCursosEstado, {
        type: 'bar',
        data: {
          labels: ['Pendientes', 'Aprobados', 'Publicados', 'Rechazados'],
          datasets: [{
            label: 'Cursos',
            data: [cursosPorEstado.pendiente, cursosPorEstado.aprobado, cursosPorEstado.publicado, cursosPorEstado.rechazado],
            backgroundColor: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: textColor },
              grid: { color: gridColor }
            },
            x: {
              ticks: { color: textColor },
              grid: { color: gridColor }
            }
          }
        }
      });
    }
    
    // Gráfico de Estado de Usuarios (Pie)
    const ctxUsuariosEstado = document.getElementById('chartUsuariosEstado');
    if (ctxUsuariosEstado) {
      new Chart(ctxUsuariosEstado, {
        type: 'pie',
        data: {
          labels: ['Activos', 'Inactivos'],
          datasets: [{
            data: [usuariosActivos, usuariosInactivos],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor }
            }
          }
        }
      });
    }
  }

  // ================== PENDIENTES DE APROBACIÓN ==================

  async cargarPendientes(tipo = null) {
    try {
      this.pendientes = await API.getPendientesAprobacion(tipo);
      this.renderPendientes();
    } catch (error) {
      console.error('Error al cargar pendientes:', error);
      this.showError('No se pudieron cargar los elementos pendientes');
    }
  }

  renderPendientes() {
    const container = document.getElementById('adminListaPendientes');
    if (!container) return;
    
    const todosPendientes = [
      ...(this.pendientes.cursos || []).map(c => ({ ...c, tipo: 'curso' })),
      ...(this.pendientes.contenidos || []).map(c => ({ ...c, tipo: 'contenido' })),
      ...(this.pendientes.recursos || []).map(r => ({ ...r, tipo: 'recurso' }))
    ];
    
    if (todosPendientes.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">✅</div>
          <p class="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No hay contenido pendiente
          </p>
          <p class="text-slate-600 dark:text-slate-400">
            Todos los elementos han sido revisados
          </p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = todosPendientes.map(item => {
      const nombre = item.titulo || item.seccion || item.nombre || 'Sin título';
      const autor = item.docente_nombre || item.autor_nombre || 'Desconocido';
      const fecha = item.fecha_creacion || item.fecha_subida || 'N/A';
      
      // Obtener ID y tipo de forma segura
      const itemId = item.id_curso || item.id_contenido || item.id_recurso;
      const itemTipo = item.tipo || 'curso';
      
      if (!itemId) {
        console.error('[ERROR] Item sin ID:', item);
        return '';
      }
      
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border-2 border-yellow-200 dark:border-yellow-800">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-semibold rounded">
                  ${itemTipo === 'curso' ? '📚 Curso' : itemTipo === 'contenido' ? '📄 Contenido' : '🔗 Recurso'}
                </span>
                <span class="px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded">
                  ${item.estado || 'pendiente'}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">
                ${this.escapeHtml(nombre)}
              </h3>
              <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Por: ${this.escapeHtml(autor)}
              </p>
              <p class="text-xs text-slate-500 dark:text-slate-500">
                ${fecha}
              </p>
            </div>
            <button onclick="console.log('Botón Revisar clickeado', ${itemId}, '${itemTipo}'); if(window.app?.admin?.revisarItem) { window.app.admin.revisarItem(${itemId}, '${itemTipo}'); } else { console.error('window.app.admin.revisarItem no disponible', window.app); alert('Error: No se pudo abrir el modal de revisión'); }" 
                    class="ml-4 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    aria-label="Revisar ${this.escapeHtml(nombre)}"
                    data-item-id="${itemId}"
                    data-item-tipo="${itemTipo}"
                    type="button">
              Revisar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async revisarItem(itemId, tipo) {
    console.log('[DEBUG] revisarItem llamado con:', { itemId, tipo });
    
    if (!itemId) {
      console.error('[ERROR] itemId no proporcionado');
      this.showError('Error: No se pudo identificar el elemento a revisar');
      return;
    }
    
    if (!tipo) {
      console.error('[ERROR] tipo no proporcionado');
      this.showError('Error: No se pudo identificar el tipo de elemento');
      return;
    }
    
    const item = [
      ...(this.pendientes.cursos || []).map(c => ({ ...c, tipo: 'curso' })),
      ...(this.pendientes.contenidos || []).map(c => ({ ...c, tipo: 'contenido' })),
      ...(this.pendientes.recursos || []).map(r => ({ ...r, tipo: 'recurso' }))
    ].find(i => {
      const id = i.id_curso || i.id_contenido || i.id_recurso;
      return id === itemId || id === parseInt(itemId, 10);
    });
    
    if (!item) {
      console.error('[ERROR] Item no encontrado:', { itemId, tipo, pendientes: this.pendientes });
      this.showError('No se encontró el elemento a revisar');
      return;
    }
    
    console.log('[DEBUG] Item encontrado:', item);
    
    // Cargar detalles completos para preview
    let detalles = null;
    try {
      if (tipo === 'curso') {
        detalles = await API.getCurso(itemId);
      } else if (tipo === 'contenido') {
        // Obtener contenido desde el curso
        const cursoId = item.curso_id;
        if (cursoId) {
          const contenidos = await API.getCursoContenido(cursoId);
          detalles = contenidos.find(c => c.id_contenido === itemId);
        }
      } else if (tipo === 'recurso') {
        detalles = await API.getRecurso(itemId);
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    }
    
    const nombre = item.titulo || item.seccion || item.nombre || 'Sin título';
    
    // Usar el tipo del item si está disponible, sino usar el parámetro
    const tipoFinal = item.tipo || tipo;
    
    console.log('[DEBUG] Mostrando modal de aprobación:', { itemId, tipo: tipoFinal, nombre });
    
    if (typeof window.mostrarModalAprobacion === 'function') {
      window.mostrarModalAprobacion(itemId, tipoFinal, nombre, detalles);
    } else {
      console.error('[ERROR] window.mostrarModalAprobacion no está definido');
      this.showError('Error al abrir el modal de aprobación');
    }
  }

  async cargarHistorialAprobaciones() {
    try {
      const filtroTipo = document.getElementById('filtroHistorialTipo')?.value || '';
      const filtroEstado = document.getElementById('filtroHistorialEstado')?.value || '';
      
      const filters = {};
      if (filtroTipo) filters.objeto_tipo = filtroTipo;
      if (filtroEstado) filters.estado = filtroEstado;
      
      const historial = await API.getHistorialAprobaciones(filters);
      this.renderHistorialAprobaciones(historial);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      this.showError('No se pudo cargar el historial de aprobaciones');
    }
  }

  renderHistorialAprobaciones(historial) {
    const container = document.getElementById('adminHistorialAprobaciones');
    if (!container) return;

    if (historial.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">history</span>
          <p class="text-slate-600 dark:text-slate-400">No hay historial de aprobaciones</p>
        </div>
      `;
      return;
    }

    container.innerHTML = historial.map(aprobacion => {
      const estadoColor = {
        'aprobado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'rechazado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        'pendiente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      }[aprobacion.estado] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';

      return `
        <div class="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-1 ${estadoColor} text-xs font-semibold rounded">
                  ${aprobacion.estado}
                </span>
                <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded">
                  ${aprobacion.objeto_tipo}
                </span>
              </div>
              <h3 class="font-semibold text-slate-900 dark:text-white mb-1">
                ${this.escapeHtml(aprobacion.objeto_nombre || 'Sin nombre')}
              </h3>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                Por: ${this.escapeHtml(aprobacion.autor_nombre || 'Desconocido')}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500 dark:text-slate-500">
                ${new Date(aprobacion.fecha_revision || aprobacion.fecha_creacion).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
          ${aprobacion.comentario ? `
            <div class="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p class="text-sm text-slate-700 dark:text-slate-300">
                <strong>Comentario:</strong> ${this.escapeHtml(aprobacion.comentario)}
              </p>
            </div>
          ` : ''}
          <div class="mt-3 text-xs text-slate-500 dark:text-slate-500">
            Revisado por: ${this.escapeHtml(aprobacion.admin_nombre || 'Administrador')}
          </div>
        </div>
      `;
    }).join('');
  }

  async handleAprobacion(event) {
    event.preventDefault();
    
    const objetoId = document.getElementById('aprobacionObjetoId').value;
    const objetoTipo = document.getElementById('aprobacionObjetoTipo').value;
    const estado = document.querySelector('input[name="estadoAprobacion"]:checked')?.value;
    const comentario = document.getElementById('aprobacionComentario').value;
    
    if (!estado) {
      this.showError('Debes seleccionar una decisión');
      return;
    }
    
    // Obtener admin_id de la sesión
    const sessionData = localStorage.getItem('eduVisionSession');
    if (!sessionData) {
      this.showError('No hay sesión activa');
      return;
    }
    
    const session = JSON.parse(sessionData);
    const user = session.user;
    
    if (user.rol !== 'admin') {
      this.showError('Solo los administradores pueden aprobar contenido');
      return;
    }
    
    try {
      await API.crearAprobacion({
        admin_id: user.id_usuario,
        objeto_tipo: objetoTipo,
        objeto_id: parseInt(objetoId),
        estado: estado,
        comentario: comentario || null
      });
      
      this.showSuccess(`${objetoTipo} ${estado === 'aprobado' ? 'aprobado' : 'rechazado'} exitosamente`);
      window.cerrarModalAprobacion();
      
      // Recargar pendientes
      await this.cargarPendientes();
      await this.cargarEstadisticas();
    } catch (error) {
      console.error('Error al procesar aprobación:', error);
      this.showError('No se pudo procesar la aprobación: ' + (error.message || 'Error desconocido'));
    }
  }

  // ================== GESTIÓN DE USUARIOS ==================

  async cargarUsuarios() {
    try {
      this.usuarios = await API.getUsuarios();
      this.renderUsuarios();
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      this.showError('No se pudieron cargar los usuarios');
    }
  }

  renderUsuarios(usuariosFiltrados = null) {
    const container = document.getElementById('adminListaUsuarios');
    if (!container) return;
    
    const usuarios = usuariosFiltrados || this.usuarios;
    
    if (usuarios.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <p class="text-slate-600 dark:text-slate-400">
            No se encontraron usuarios
          </p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = usuarios.map(usuario => {
      const rolIcon = {
        'admin': '🛡️',
        'docente': '👨‍🏫',
        'alumno': '👨‍🎓'
      }[usuario.rol] || '👤';
      
      const estadoColor = usuario.estado === 'activo' 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      
      return `
        <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4 flex-1">
              <div class="text-3xl">${rolIcon}</div>
              <div class="flex-1">
                <h3 class="font-semibold text-slate-900 dark:text-white">
                  ${this.escapeHtml(usuario.nombre)} ${this.escapeHtml(usuario.apellido)}
                </h3>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  ${this.escapeHtml(usuario.correo)}
                </p>
                <div class="flex gap-2 mt-2">
                  <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-semibold rounded">
                    ${usuario.rol}
                  </span>
                  <span class="px-2 py-1 ${estadoColor} text-xs font-semibold rounded">
                    ${usuario.estado}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="window.app.admin.editarUsuario(${usuario.id_usuario})" 
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors">
                Editar
              </button>
              <button onclick="window.app.admin.cambiarEstadoUsuario(${usuario.id_usuario}, '${usuario.estado === 'activo' ? 'inactivo' : 'activo'}')" 
                      class="px-4 py-2 ${usuario.estado === 'activo' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold text-sm transition-colors">
                ${usuario.estado === 'activo' ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  filtrarUsuarios() {
    const filtroRol = document.getElementById('adminFiltroRol')?.value || '';
    const filtroEstado = document.getElementById('adminFiltroEstado')?.value || '';
    const busqueda = document.getElementById('adminBuscarUsuario')?.value.toLowerCase() || '';
    
    let usuariosFiltrados = this.usuarios;
    
    if (filtroRol) {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.rol === filtroRol);
    }
    
    if (filtroEstado) {
      usuariosFiltrados = usuariosFiltrados.filter(u => u.estado === filtroEstado);
    }
    
    if (busqueda) {
      usuariosFiltrados = usuariosFiltrados.filter(u => 
        u.nombre.toLowerCase().includes(busqueda) ||
        u.apellido.toLowerCase().includes(busqueda) ||
        u.correo.toLowerCase().includes(busqueda)
      );
    }
    
    this.renderUsuarios(usuariosFiltrados);
  }

  async editarUsuario(usuarioId) {
    const usuario = this.usuarios.find(u => u.id_usuario === usuarioId);
    if (!usuario) return;
    
    document.getElementById('editarUsuarioId').value = usuario.id_usuario;
    document.getElementById('editarUsuarioNombre').value = usuario.nombre;
    document.getElementById('editarUsuarioApellido').value = usuario.apellido;
    document.getElementById('editarUsuarioCorreo').value = usuario.correo;
    document.getElementById('editarUsuarioEstado').value = usuario.estado;
    
    window.mostrarModalEditarUsuario(usuarioId);
  }

  async handleEditarUsuario(event) {
    event.preventDefault();
    
    const usuarioId = document.getElementById('editarUsuarioId').value;
    const nombre = document.getElementById('editarUsuarioNombre').value;
    const apellido = document.getElementById('editarUsuarioApellido').value;
    const correo = document.getElementById('editarUsuarioCorreo').value;
    const estado = document.getElementById('editarUsuarioEstado').value;
    
    try {
      await API.updateUsuario(usuarioId, {
        nombre,
        apellido,
        correo,
        estado
      });
      
      this.showSuccess('Usuario actualizado exitosamente');
      window.cerrarModalEditarUsuario();
      await this.cargarUsuarios();
      await this.cargarEstadisticas();
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      this.showError('No se pudo actualizar el usuario: ' + (error.message || 'Error desconocido'));
    }
  }

  async cambiarEstadoUsuario(usuarioId, nuevoEstado) {
    if (!confirm(`¿Estás seguro de ${nuevoEstado === 'activo' ? 'activar' : 'desactivar'} este usuario?`)) {
      return;
    }
    
    try {
      await API.cambiarEstadoUsuario(usuarioId, nuevoEstado);
      this.showSuccess(`Usuario ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} exitosamente`);
      await this.cargarUsuarios();
      await this.cargarEstadisticas();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      this.showError('No se pudo cambiar el estado: ' + (error.message || 'Error desconocido'));
    }
  }

  mostrarModalCrearUsuario() {
    // Por ahora redirigir al registro, pero se puede crear un modal específico
    window.app.router.navigateTo('login');
  }

  // ================== GESTIÓN DE CATEGORÍAS ==================

  async cargarCategorias() {
    try {
      this.categorias = await API.getCategorias();
      this.renderCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }

  renderCategorias() {
    const container = document.getElementById('adminListaCategorias');
    if (!container) return;
    
    if (this.categorias.length === 0) {
      container.innerHTML = `
        <p class="text-center text-slate-600 dark:text-slate-400 py-4">
          No hay categorías registradas
        </p>
      `;
      return;
    }
    
    container.innerHTML = this.categorias.map(cat => `
      <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-2">
        <div class="flex-1">
          <h4 class="font-semibold text-slate-900 dark:text-white">${this.escapeHtml(cat.nombre)}</h4>
          ${cat.descripcion ? `<p class="text-sm text-slate-600 dark:text-slate-400">${this.escapeHtml(cat.descripcion)}</p>` : ''}
        </div>
        <div class="flex gap-2">
          <button onclick="window.app.admin.editarCategoria(${cat.id_categoria})" 
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold">
            Editar
          </button>
          <button onclick="window.app.admin.eliminarCategoria(${cat.id_categoria})" 
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold">
            Eliminar
          </button>
        </div>
      </div>
    `).join('');
  }

  mostrarModalCrearCategoria() {
    document.getElementById('modalCategoriaTitulo').textContent = 'Crear Nueva Categoría';
    document.getElementById('categoriaId').value = '';
    document.getElementById('formCategoria').reset();
    window.mostrarModalCrearCategoria();
  }

  editarCategoria(categoriaId) {
    const categoria = this.categorias.find(c => c.id_categoria === categoriaId);
    if (!categoria) return;
    
    document.getElementById('modalCategoriaTitulo').textContent = 'Editar Categoría';
    document.getElementById('categoriaId').value = categoria.id_categoria;
    document.getElementById('categoriaNombre').value = categoria.nombre;
    document.getElementById('categoriaDescripcion').value = categoria.descripcion || '';
    
    window.mostrarModalCrearCategoria();
  }

  async handleGuardarCategoria(event) {
    event.preventDefault();
    
    const categoriaId = document.getElementById('categoriaId').value;
    const nombre = document.getElementById('categoriaNombre').value;
    const descripcion = document.getElementById('categoriaDescripcion').value;
    
    try {
      if (categoriaId) {
        // Actualizar
        await API.updateCategoria(categoriaId, { nombre, descripcion });
        this.showSuccess('Categoría actualizada exitosamente');
      } else {
        // Crear
        await API.createCategoria({ nombre, descripcion });
        this.showSuccess('Categoría creada exitosamente');
      }
      
      window.cerrarModalCategoria();
      await this.cargarCategorias();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      this.showError('No se pudo guardar la categoría: ' + (error.message || 'Error desconocido'));
    }
  }

  async eliminarCategoria(categoriaId) {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await API.deleteCategoria(categoriaId);
      this.showSuccess('Categoría eliminada exitosamente');
      await this.cargarCategorias();
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      this.showError('No se pudo eliminar la categoría: ' + (error.message || 'Error desconocido'));
    }
  }

  // ================== GESTIÓN DE GRADOS ==================

  async cargarGrados() {
    try {
      this.grados = await API.getGrados();
      this.renderGrados();
    } catch (error) {
      console.error('Error al cargar grados:', error);
    }
  }

  renderGrados() {
    const container = document.getElementById('adminListaGrados');
    if (!container) return;
    
    if (this.grados.length === 0) {
      container.innerHTML = `
        <p class="text-center text-slate-600 dark:text-slate-400 py-4">
          No hay grados registrados
        </p>
      `;
      return;
    }
    
    container.innerHTML = this.grados.map(grado => `
      <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-2">
        <div class="flex-1">
          <h4 class="font-semibold text-slate-900 dark:text-white">${this.escapeHtml(grado.nombre)}</h4>
          ${grado.descripcion ? `<p class="text-sm text-slate-600 dark:text-slate-400">${this.escapeHtml(grado.descripcion)}</p>` : ''}
        </div>
        <div class="flex gap-2">
          <button onclick="window.app.admin.editarGrado(${grado.id_grado})" 
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold">
            Editar
          </button>
          <button onclick="window.app.admin.eliminarGrado(${grado.id_grado})" 
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold">
            Eliminar
          </button>
        </div>
      </div>
    `).join('');
  }

  mostrarModalCrearGrado() {
    document.getElementById('modalGradoTitulo').textContent = 'Crear Nuevo Grado';
    document.getElementById('gradoId').value = '';
    document.getElementById('formGrado').reset();
    window.mostrarModalCrearGrado();
  }

  editarGrado(gradoId) {
    const grado = this.grados.find(g => g.id_grado === gradoId);
    if (!grado) return;
    
    document.getElementById('modalGradoTitulo').textContent = 'Editar Grado';
    document.getElementById('gradoId').value = grado.id_grado;
    document.getElementById('gradoNombre').value = grado.nombre;
    document.getElementById('gradoDescripcion').value = grado.descripcion || '';
    
    window.mostrarModalCrearGrado();
  }

  async handleGuardarGrado(event) {
    event.preventDefault();
    
    const gradoId = document.getElementById('gradoId').value;
    const nombre = document.getElementById('gradoNombre').value;
    const descripcion = document.getElementById('gradoDescripcion').value;
    
    try {
      if (gradoId) {
        // Actualizar
        await API.updateGrado(gradoId, { nombre, descripcion });
        this.showSuccess('Grado actualizado exitosamente');
      } else {
        // Crear
        await API.createGrado({ nombre, descripcion });
        this.showSuccess('Grado creado exitosamente');
      }
      
      window.cerrarModalGrado();
      await this.cargarGrados();
    } catch (error) {
      console.error('Error al guardar grado:', error);
      this.showError('No se pudo guardar el grado: ' + (error.message || 'Error desconocido'));
    }
  }

  async eliminarGrado(gradoId) {
    if (!confirm('¿Estás seguro de eliminar este grado? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await API.deleteGrado(gradoId);
      this.showSuccess('Grado eliminado exitosamente');
      await this.cargarGrados();
    } catch (error) {
      console.error('Error al eliminar grado:', error);
      this.showError('No se pudo eliminar el grado: ' + (error.message || 'Error desconocido'));
    }
  }

  // ================== UTILIDADES ==================

  renderPreview(detalles, tipo) {
    if (!detalles) {
      return '<p class="text-slate-600 dark:text-slate-400">No hay detalles adicionales disponibles.</p>';
    }
    
    if (tipo === 'curso') {
      return `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            ${detalles.id_curso ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">ID del Curso:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.id_curso}</span>
              </div>
            ` : ''}
            ${detalles.estado ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">Estado:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${this.escapeHtml(detalles.estado)}</span>
              </div>
            ` : ''}
          </div>
          
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white mb-2">Descripción</h4>
            <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${this.escapeHtml(detalles.descripcion || 'Sin descripción')}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            ${detalles.categoria || detalles.nombre_categoria ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">Categoría:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${this.escapeHtml(detalles.categoria || detalles.nombre_categoria || 'N/A')}</span>
              </div>
            ` : ''}
            ${detalles.grado || detalles.nombre_grado ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">Grado:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${this.escapeHtml(detalles.grado || detalles.nombre_grado || 'N/A')}</span>
              </div>
            ` : ''}
          </div>
          
          ${detalles.docente_id ? `
            <div>
              <span class="text-sm text-slate-600 dark:text-slate-400">ID Docente:</span>
              <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.docente_id}</span>
            </div>
          ` : ''}
          
          ${detalles.fecha_creacion ? `
            <div>
              <span class="text-sm text-slate-600 dark:text-slate-400">Fecha de Creación:</span>
              <span class="ml-2 font-medium text-slate-900 dark:text-white">${new Date(detalles.fecha_creacion).toLocaleString('es-ES')}</span>
            </div>
          ` : ''}
        </div>
      `;
    } else if (tipo === 'contenido') {
      return `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            ${detalles.id_contenido ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">ID del Contenido:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.id_contenido}</span>
              </div>
            ` : ''}
            ${detalles.curso_id ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">ID del Curso:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.curso_id}</span>
              </div>
            ` : ''}
          </div>
          
          <div>
            <h4 class="font-semibold text-slate-900 dark:text-white mb-2">Tipo de Contenido</h4>
            <p class="text-slate-700 dark:text-slate-300">${this.escapeHtml(detalles.tipo || detalles.tipo_contenido || 'N/A')}</p>
          </div>
          
          ${detalles.url ? `
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white mb-2">URL/Recurso</h4>
              <a href="${this.escapeHtml(detalles.url)}" target="_blank" rel="noopener noreferrer" 
                 class="text-primary hover:underline break-all">
                ${this.escapeHtml(detalles.url)}
              </a>
            </div>
          ` : ''}
          
          ${detalles.orden ? `
            <div>
              <span class="text-sm text-slate-600 dark:text-slate-400">Orden:</span>
              <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.orden}</span>
            </div>
          ` : ''}
          
          ${detalles.fecha_subida ? `
            <div>
              <span class="text-sm text-slate-600 dark:text-slate-400">Fecha de Subida:</span>
              <span class="ml-2 font-medium text-slate-900 dark:text-white">${new Date(detalles.fecha_subida).toLocaleString('es-ES')}</span>
            </div>
          ` : ''}
        </div>
      `;
    } else if (tipo === 'recurso') {
      return `
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            ${detalles.id_recurso ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">ID del Recurso:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.id_recurso}</span>
              </div>
            ` : ''}
            ${detalles.curso_id ? `
              <div>
                <span class="text-sm text-slate-600 dark:text-slate-400">ID del Curso:</span>
                <span class="ml-2 font-medium text-slate-900 dark:text-white">${detalles.curso_id}</span>
              </div>
            ` : ''}
          </div>
          
          ${detalles.descripcion ? `
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white mb-2">Descripción</h4>
              <p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">${this.escapeHtml(detalles.descripcion)}</p>
            </div>
          ` : ''}
          
          ${detalles.url_recurso ? `
            <div>
              <h4 class="font-semibold text-slate-900 dark:text-white mb-2">URL del Recurso</h4>
              <a href="${this.escapeHtml(detalles.url_recurso)}" target="_blank" rel="noopener noreferrer" 
                 class="text-primary hover:underline break-all">
                ${this.escapeHtml(detalles.url_recurso)}
              </a>
            </div>
          ` : ''}
          
          ${detalles.tipo_id || detalles.tipo_recurso ? `
            <div>
              <span class="text-sm text-slate-600 dark:text-slate-400">Tipo de Recurso:</span>
              <span class="ml-2 font-medium text-slate-900 dark:text-white">${this.escapeHtml(detalles.tipo_recurso || detalles.nombre_tipo || 'N/A')}</span>
            </div>
          ` : ''}
          
          ${detalles.fecha_subida ? `
            <div>
              <span class="text-sm text-slate-600 dark:text-slate-400">Fecha de Subida:</span>
              <span class="ml-2 font-medium text-slate-900 dark:text-white">${new Date(detalles.fecha_subida).toLocaleString('es-ES')}</span>
            </div>
          ` : ''}
        </div>
      `;
    }
    
    // Si no coincide ningún tipo, mostrar todos los detalles disponibles
    return `
      <div class="space-y-2">
        <h4 class="font-semibold text-slate-900 dark:text-white mb-2">Información Detallada</h4>
        <pre class="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 p-3 rounded overflow-auto">${JSON.stringify(detalles, null, 2)}</pre>
      </div>
    `;
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2';
    notification.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  showError(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2';
    notification.innerHTML = `
      <span class="material-symbols-outlined">error</span>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

export default AdminController;

