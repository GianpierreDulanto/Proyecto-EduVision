# Solución de Errores 500 en Railway

## Problema
Los endpoints `/api/test-db`, `/api/categorias` y `/api/login` están devolviendo errores 500, lo que indica problemas de conexión a la base de datos.

## Causas Comunes

### 1. Variables de Entorno No Configuradas

Railway requiere que configures las variables de entorno para la conexión a MySQL. Las variables necesarias son:

```
MYSQLHOST=containers-us-east-XXX.railway.app
MYSQLUSER=root
MYSQLPASSWORD=tu_contraseña
MYSQLDATABASE=railway
MYSQLPORT=3306
```

### 2. Cómo Configurar Variables de Entorno en Railway

1. **En Railway Dashboard:**
   - Ve a tu proyecto
   - Selecciona el servicio de tu aplicación (no el de MySQL)
   - Ve a la pestaña **"Variables"**
   - Haz clic en **"New Variable"**

2. **Agrega cada variable:**
   - **Nombre:** `MYSQLHOST`
   - **Valor:** Copia el valor de `MYSQLHOST` del servicio MySQL (en Railway, ve al servicio MySQL → Variables)

3. **Repite para todas las variables:**
   - `MYSQLUSER` (generalmente `root`)
   - `MYSQLPASSWORD` (copia del servicio MySQL)
   - `MYSQLDATABASE` (generalmente `railway` o el nombre que hayas dado)
   - `MYSQLPORT` (generalmente `3306`)

### 3. Obtener Valores del Servicio MySQL

1. En Railway Dashboard, ve al servicio **MySQL**
2. Ve a la pestaña **"Variables"**
3. Copia los valores de:
   - `MYSQLHOST`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`

### 4. Verificar que la Base de Datos Existe

Después de configurar las variables, verifica que:

1. **La base de datos existe:**
   - Conecta a MySQL usando Railway's MySQL service
   - O usa un cliente MySQL con las credenciales de Railway

2. **Las tablas están creadas:**
   - Ejecuta el script `eduVision.sql` en la base de datos
   - Puedes hacerlo desde Railway's MySQL service → Connect → Query

### 5. Verificar Logs en Railway

1. Ve a tu servicio de aplicación en Railway
2. Ve a la pestaña **"Deployments"**
3. Selecciona el deployment más reciente
4. Ve a **"View Logs"**
5. Busca mensajes como:
   - `🔍 Probando conexión a base de datos...`
   - `❌ Error en query:`
   - `Código:`, `Errno:`, `SQLState:`

### 6. Solución Rápida: Usar Variables del Servicio MySQL Directamente

Railway puede compartir variables entre servicios. Para hacerlo automáticamente:

1. En tu servicio de aplicación → **Variables**
2. Haz clic en **"Reference Variable"**
3. Selecciona el servicio MySQL
4. Selecciona las variables que necesitas referenciar

Esto creará referencias automáticas que se actualizarán si cambian en el servicio MySQL.

## Verificación

Después de configurar las variables:

1. **Reinicia el servicio** (Railway lo hará automáticamente al detectar cambios)
2. **Prueba el endpoint:** `https://tu-app.railway.app/api/test-db`
3. **Deberías ver:** `{"ok":true,"message":"Conexión exitosa",...}`

## Errores Comunes y Soluciones

### Error: "ECONNREFUSED"
- **Causa:** `MYSQLHOST` o `MYSQLPORT` incorrectos
- **Solución:** Verifica que los valores coincidan con los del servicio MySQL

### Error: "Access denied for user"
- **Causa:** `MYSQLUSER` o `MYSQLPASSWORD` incorrectos
- **Solución:** Copia exactamente los valores del servicio MySQL

### Error: "Unknown database"
- **Causa:** `MYSQLDATABASE` no existe
- **Solución:** Crea la base de datos o usa el nombre correcto (generalmente `railway`)

### Error: "Table doesn't exist"
- **Causa:** Las tablas no están creadas
- **Solución:** Ejecuta `eduVision.sql` en la base de datos

## Próximos Pasos

1. Configura las variables de entorno en Railway
2. Ejecuta `eduVision.sql` en la base de datos
3. Reinicia el servicio
4. Verifica los logs para confirmar la conexión

