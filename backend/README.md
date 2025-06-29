# Backend OCR - DespenaGO

Backend para procesamiento de OCR usando Google Cloud Vision API.

## Despliegue en Render (Recomendado)

### 1. Preparación
1. Crea una cuenta en [Render.com](https://render.com)
2. Conecta tu repositorio de GitHub
3. Asegúrate de que el archivo de credenciales de Google Cloud esté en la raíz del backend

### 2. Crear Web Service en Render
1. Ve a Dashboard → New → Web Service
2. Conecta tu repositorio
3. Configuración:
   - **Name**: `despensago-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Variables de Entorno
En Render, ve a Environment y agrega:
- `GOOGLE_APPLICATION_CREDENTIALS`: `./tu-archivo-credenciales.json` (nombre de tu archivo)
- `CORS_ORIGIN`: `*` (o tu dominio específico)

### 4. Desplegar
1. Click en "Create Web Service"
2. Espera a que se despliegue
3. Copia la URL (ej: `https://despensago-backend.onrender.com`)

## Configuración de Credenciales

### Para desarrollo local:
1. Descarga tu archivo de credenciales desde Google Cloud Console
2. Colócalo en la carpeta `backend/`
3. El archivo debe estar en `.gitignore` para no subirse a GitHub

### Para producción (Render):
1. Sube el archivo de credenciales a tu repositorio (solo para despliegue)
2. O usa variables de entorno para las credenciales (más seguro)

## Actualizar Frontend

Una vez desplegado, actualiza la URL en el frontend:

```typescript
// En src/app/core/api.config.ts
BASE_URL: 'https://tu-backend.onrender.com' // Cambiar esta URL
```

## Alternativas de Despliegue

### Railway
- Similar a Render, muy fácil de usar
- URL: https://railway.app

### Heroku
- Más establecido pero requiere tarjeta de crédito
- URL: https://heroku.com

### Vercel
- Excelente para frontend, también soporta Node.js
- URL: https://vercel.com

## Notas Importantes

1. **Credenciales de Google**: Nunca subas las credenciales a GitHub en producción
2. **CORS**: Configura correctamente los orígenes permitidos
3. **Límites**: Los servicios gratuitos tienen límites de uso
4. **SSL**: Todos estos servicios proporcionan HTTPS automáticamente

## Pruebas

Una vez desplegado, puedes probar desde cualquier dispositivo con conexión a internet usando la URL del backend desplegado. 