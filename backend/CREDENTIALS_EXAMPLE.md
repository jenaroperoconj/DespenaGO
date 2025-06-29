# Configuración de Credenciales

## Estructura del archivo de credenciales

Tu archivo de credenciales de Google Cloud debe tener esta estructura:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "tu-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n",
  "client_email": "tu-service-account@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "tu-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/tu-service-account%40tu-proyecto.iam.gserviceaccount.com"
}
```

## Cómo obtener las credenciales

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "IAM & Admin" > "Service Accounts"
4. Crea una nueva cuenta de servicio o usa una existente
5. Crea una nueva clave (JSON)
6. Descarga el archivo JSON

## Configuración local

1. Coloca el archivo JSON en la carpeta `backend/`
2. El archivo debe estar en `.gitignore` para no subirse a GitHub
3. El backend lo detectará automáticamente

## Configuración en producción (Render)

### Opción 1: Subir archivo (menos seguro)
1. Sube el archivo JSON a tu repositorio
2. Configura la variable de entorno: `GOOGLE_APPLICATION_CREDENTIALS=./tu-archivo.json`

### Opción 2: Variables de entorno (más seguro)
1. Convierte el contenido del JSON a una variable de entorno
2. En Render, agrega: `GOOGLE_CREDENTIALS_JSON` con todo el contenido del JSON
3. Modifica el código para usar la variable de entorno

## Seguridad

- ✅ Nunca subas credenciales reales a GitHub
- ✅ Usa variables de entorno en producción
- ✅ Rota las credenciales regularmente
- ✅ Limita los permisos de la cuenta de servicio 