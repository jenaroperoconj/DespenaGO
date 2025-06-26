// Configuración del backend
const config = {
  port: process.env.PORT || 3001,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Configuración de Google Cloud Vision
  googleVision: {
    // Opción 1: Archivo de credenciales (menos seguro)
    credentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || './credentials.json',
    
    // Opción 2: Credenciales desde variable de entorno (más seguro)
    credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON,
    
    // Determinar qué método usar
    useCredentialsFile: !process.env.GOOGLE_CREDENTIALS_JSON
  }
};

module.exports = config; 