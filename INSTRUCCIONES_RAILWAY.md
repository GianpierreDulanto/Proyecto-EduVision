# 📋 Instrucciones Completas para Railway

## 🎯 Resumen Rápido

1. **Sube tu código a GitHub**
2. **Crea proyecto en Railway** y conéctalo con GitHub
3. **Agrega MySQL** como servicio
4. **Importa la base de datos** (`eduVision.sql`)
5. **Configura variables de entorno** (`JWT_SECRET`)
6. **¡Listo!** Railway desplegará automáticamente

---

## 📝 Paso a Paso Detallado

### Paso 1: Preparar el Repositorio Git

Si aún no tienes Git inicializado:

```bash
# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Proyecto listo para Railway"

# Crear repositorio en GitHub y luego:
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git branch -M main
git push -u origin main
```

**Archivos importantes que DEBEN estar en el repositorio:**
- ✅ `package.json`
- ✅ `server.js`
- ✅ `index.html`
- ✅ `src/` (toda la carpeta)
- ✅ `styles/` (toda la carpeta)
- ✅ `eduVision.sql`
- ✅ `.gitignore`

**Archivos que NO deben estar:**
- ❌ `node_modules/` (se instala automáticamente)
- ❌ `.env` (usa variables de entorno en Railway)

### Paso 2: Crear Cuenta y Proyecto en Railway

1. Ve a **[railway.app](https://railway.app)**
2. Inicia sesión con **GitHub** (recomendado)
3. Haz clic en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Autoriza Railway a acceder a tus repositorios
6. Selecciona tu repositorio **EduVision**
7. Railway comenzará a detectar automáticamente el proyecto

### Paso 3: Agregar Base de Datos MySQL

1. En tu proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"**
3. Elige **"MySQL"**
4. Railway creará automáticamente un servicio MySQL

**Railway configurará automáticamente estas variables:**
- `MYSQLHOST`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`
- `MYSQLPORT`

### Paso 4: Importar el Esquema de Base de Datos

Tienes varias opciones:

#### Opción A: Usando Railway CLI (Recomendado)

1. Instala Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Inicia sesión:
   ```bash
   railway login
   ```

3. Conéctate a tu proyecto:
   ```bash
   railway link
   ```

4. Conéctate a MySQL y ejecuta el script:
   ```bash
   railway connect mysql
   mysql -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < eduVision.sql
   ```

#### Opción B: Usando MySQL Workbench o DBeaver

1. En Railway, haz clic en tu servicio **MySQL**
2. Ve a la pestaña **"Connect"**
3. Copia las credenciales de conexión
4. Conéctate usando un cliente MySQL
5. Ejecuta el contenido de `eduVision.sql`

#### Opción C: Desde el código (temporal)

Puedes crear un endpoint temporal en `server.js` para ejecutar el script (solo para desarrollo).

### Paso 5: Configurar Variables de Entorno

1. En Railway, ve a tu proyecto → **"Variables"**
2. Haz clic en **"+ New Variable"**
3. Agrega las siguientes variables:

#### Variable: `JWT_SECRET`

**Valor:** Genera uno seguro ejecutando:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado y úsalo como valor.

#### Variable: `PORT` (Opcional)

Railway asigna el puerto automáticamente, pero puedes agregarlo si quieres:
```
PORT=3000
```

**Nota:** Las variables de MySQL (`MYSQLHOST`, `MYSQLUSER`, etc.) se configuran automáticamente cuando agregas el servicio MySQL. NO necesitas agregarlas manualmente.

### Paso 6: Verificar el Despliegue

1. Railway comenzará a desplegar automáticamente
2. Ve a **"Deployments"** para ver el progreso
3. Haz clic en un deployment para ver los **logs**
4. Una vez completado, Railway te dará una URL:
   - Ejemplo: `eduvision-production.up.railway.app`

### Paso 7: Probar la Aplicación

1. Abre la URL proporcionada por Railway
2. Verifica que la aplicación carga
3. Prueba iniciar sesión con un usuario de prueba
4. Verifica que todas las funcionalidades funcionen

---

## 🔧 Configuración Adicional

### Dominio Personalizado

1. En Railway → **Settings** → **Domains**
2. Haz clic en **"Generate Domain"** para obtener un dominio de Railway
3. O agrega tu dominio personalizado:
   - Agrega el dominio
   - Configura los registros DNS según las instrucciones

### Monitoreo y Logs

- **Logs en tiempo real:** Proyecto → Deployments → Selecciona deployment → View Logs
- **Métricas:** CPU, memoria, red en tiempo real
- **Variables de entorno:** Gestión centralizada en la pestaña Variables

---

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"

**Causas posibles:**
- Las variables de entorno de MySQL no están configuradas
- El script SQL no se ejecutó
- La base de datos no está lista

**Solución:**
1. Verifica que el servicio MySQL esté activo en Railway
2. Revisa las variables de entorno en Railway → Variables
3. Asegúrate de ejecutar `eduVision.sql`
4. Revisa los logs del servicio MySQL

### Error: "Module not found"

**Causas posibles:**
- Falta una dependencia en `package.json`
- `npm install` falló

**Solución:**
1. Verifica que todas las dependencias estén en `package.json`
2. Revisa los logs de build en Railway
3. Prueba ejecutar `npm install` localmente

### Error: "Port already in use"

**Causa:** Configuraste un puerto fijo

**Solución:**
- Railway asigna el puerto automáticamente
- Usa `process.env.PORT` en `server.js` (ya está configurado)
- No configures un puerto fijo

### Los archivos estáticos no cargan

**Causas posibles:**
- `express.static` no está configurado correctamente
- Los archivos no están en la raíz del proyecto

**Solución:**
1. Verifica que `server.js` tenga:
   ```javascript
   app.use(express.static(path.join(__dirname, '')));
   ```
2. Asegúrate de que `index.html` esté en la raíz

### La aplicación carga pero la base de datos no funciona

**Solución:**
1. Verifica que el script SQL se ejecutó correctamente
2. Revisa las variables de entorno de MySQL
3. Prueba la conexión desde los logs

---

## 📊 Estructura de Archivos para Railway

```
EduVision_V711/
├── package.json          ✅ Requerido
├── server.js             ✅ Requerido
├── index.html            ✅ Requerido
├── eduVision.sql         ✅ Requerido
├── .gitignore            ✅ Requerido
├── railway.json          ⚙️ Opcional (configuración)
├── nixpacks.toml         ⚙️ Opcional (configuración)
├── src/                  ✅ Requerido
│   ├── main.js
│   ├── api/
│   ├── auth/
│   └── ...
├── styles/               ✅ Requerido
│   ├── accessibility.css
│   └── theme-light.css
└── uploads/              ✅ Requerido (con .gitkeep)
    └── .gitkeep
```

---

## 💰 Costos

**Plan Gratuito de Railway:**
- $5 de crédito mensual
- 500 horas de uso
- Perfecto para desarrollo y pruebas

**Plan Pro ($20/mes):**
- Para producción
- Más recursos
- Soporte prioritario

---

## 🔄 Actualizar la Aplicación

Para actualizar después del despliegue inicial:

1. Haz cambios en tu código local
2. Haz commit y push:
   ```bash
   git add .
   git commit -m "Descripción de cambios"
   git push
   ```
3. Railway detectará automáticamente los cambios
4. Desplegará una nueva versión automáticamente

---

## 📞 Recursos

- [Documentación Railway](https://docs.railway.app)
- [Guía MySQL en Railway](https://docs.railway.app/databases/mysql)
- [Variables de Entorno](https://docs.railway.app/environment-variables)
- [Railway Discord](https://discord.gg/railway) - Para soporte

---

## ✅ Checklist Final

Antes de considerar el despliegue completo:

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Railway
- [ ] MySQL agregado y configurado
- [ ] Script `eduVision.sql` ejecutado
- [ ] Variable `JWT_SECRET` configurada
- [ ] Despliegue exitoso sin errores
- [ ] Aplicación accesible en la URL de Railway
- [ ] Login funciona correctamente
- [ ] Base de datos funciona
- [ ] Archivos estáticos cargan correctamente

---

¡Listo! Tu aplicación debería estar funcionando en Railway. 🎉

Si tienes problemas, revisa los logs en Railway o consulta la documentación.

