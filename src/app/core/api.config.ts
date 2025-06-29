// Configuración de la API
export const API_CONFIG = {
  // URL del backend - cambiar cuando se despliegue en Render
  BASE_URL: 'https://despenago-backend.onrender.com',
  
  // Para producción (cuando tengas la URL de Render)
  // BASE_URL: 'https://tu-app.onrender.com',
  
  ENDPOINTS: {
    SCAN_RECEIPT: '/scan-receipt',
    HEALTH: '/health'
  }
};

// Función para obtener la URL completa de un endpoint
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Función para cambiar entre entornos
export function setApiUrl(url: string): void {
  API_CONFIG.BASE_URL = url;
}

export const API_ENDPOINTS = {
  OCR: '/ocr',
  DETECTAR_CATEGORIA: '/detectar-categoria'
}; 