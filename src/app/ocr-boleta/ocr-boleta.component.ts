import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonButton, IonSpinner, IonTextarea, IonList, IonItem, IonLabel, IonChip, IonToast } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import Tesseract from 'tesseract.js';
import { SupabaseService } from '../core/supabase.service';

interface ProductoAprendido {
  nombre: string;
  categoria: string;
  confianza: number;
  vecesDetectado: number;
  codigoProducto?: string | null;
}

@Component({
  selector: 'app-ocr-boleta',
  templateUrl: './ocr-boleta.component.html',
  styleUrls: ['./ocr-boleta.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonSpinner, IonTextarea, IonList, IonItem, IonLabel, IonChip, IonToast],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OcrBoletaComponent {
  image: string | null = null;
  ocrText: string = '';
  loading: boolean = false;
  productosFiltrados: any[] = [];
  productosAprendidos: ProductoAprendido[] = [];
  mostrarToast: boolean = false;
  mensajeToast: string = '';
  seleccionados: boolean[] = [];
  precisionGlobal: number = 0;
  
  // Palabras clave negativas (no alimenticios)
  palabrasNoAlimenticias = {
    limpieza: ['jabon', 'detergente', 'limpia', 'lavavajilla', 'cloro', 'desinfectante', 'suavizante', 'limpiador'],
    papeleria: ['papel', 'servilleta', 'toalla', 'pañuelo', 'rollo'],
    higiene: ['cepillo', 'pasta', 'shampoo', 'acondicionador', 'desodorante', 'crema', 'jabón'],
    otros: ['bateria', 'pilas', 'foco', 'bombilla', 'vajilla', 'utensilio']
  };

  // Sistema de puntuación para categorías
  categoriasAlimenticias = {
    bebidas: {
      palabras: ['agua', 'coca', 'bebida', 'jugo', 'gaseosa', 'refresco', 'té', 'café', 'ron', 'mojito', 'citrus', 'manantial', 'cerveza', 'golden', 'royal'],
      patrones: ['cachantun', 'score', 'bacard', 'pet', 'gas', 'cg', 'royal golden'],
      puntuacion: 0
    },
    panaderia: {
      palabras: ['pan', 'galleta', 'torta', 'pastel', 'masa', 'bollo', 'ciabatta'],
      patrones: ['soda', 'line', 'integr', 'costa', 'choc'],
      puntuacion: 0
    },
    snacks: {
      palabras: ['snack', 'nachos', 'mani', 'almendra', 'sesam'],
      patrones: ['costena', 'cafe', 'coco'],
      puntuacion: 0
    },
    dulces: {
      palabras: ['bombon', 'choc', 'chocolate', 'dulce', 'postre'],
      patrones: ['mantecol', 'alusweet', 'tableta'],
      puntuacion: 0
    },
    lacteos: {
      palabras: ['leche', 'yogur', 'queso', 'mantequilla', 'crema', 'yogurt', 'cult'],
      patrones: ['gouda', 'ligh', 'chir'],
      puntuacion: 0
    },
    carnes: {
      palabras: ['carne', 'pollo', 'cerdo', 'res', 'vacuno', 'pavo', 'jamón', 'salchicha', 'salame'],
      patrones: ['mol', 'ahumado', 'pf'],
      puntuacion: 0
    },
    condimentos: {
      palabras: ['sal', 'azúcar', 'aceite', 'vinagre', 'salsa', 'ketchup', 'mayonesa'],
      patrones: ['royal', 'liofiliz'],
      puntuacion: 0
    }
  };

  // Palabras clave para ignorar líneas administrativas o de totales
  palabrasClaveIgnorar = [
    'boleta electronica', 's.i.i.', 'timbre', 'verifique', 'res.', 'nro.', 'cuotas', 'monto', 'aprobado',
    'disponible', 'avance', 'super avance', 'puntos', 'cliente', 'sucursal', 'total', 'sub total', 'descuento',
    'iva', 'neto', 'valor', 'cuota', 'vencimiento', 'credito', 'interes', 'primer', 'acercate', 'mas cercana', 'documento'
  ];

  constructor(private supabaseService: SupabaseService) {
    this.sincronizarProductosAprendidosGlobal();
    this.obtenerPrecisionGlobal();
  }

  async sincronizarProductosAprendidosGlobal() {
    try {
      this.productosAprendidos = await this.supabaseService.obtenerProductosAprendidosGlobal();
    } catch (e) {
      this.mostrarMensaje('No se pudo sincronizar aprendizaje global.');
    }
  }

  async obtenerPrecisionGlobal() {
    try {
      this.precisionGlobal = await this.supabaseService.obtenerPrecisionGlobal();
    } catch (e) {
      this.precisionGlobal = 0;
    }
  }

  async takePicture() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true, // Permitir edición para mejorar la captura
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Rear,
        correctOrientation: true, // Corregir orientación automáticamente
        presentationStyle: 'fullscreen'
      });
      
      this.image = image.dataUrl || null;
      this.ocrText = '';
      this.productosFiltrados = [];
    } catch (error) {
      this.mostrarMensaje('Error al tomar la foto. Por favor, intente nuevamente.');
    }
  }

  async processOCR() {
    if (!this.image) return;
    this.loading = true;
    this.ocrText = 'Procesando...';
    
    try {
      // Configurar Tesseract para mejor reconocimiento
      const result = await Tesseract.recognize(
        this.image,
        'spa',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              this.ocrText = `Procesando... ${Math.floor(m.progress * 100)}%`;
            }
          }
        }
      );
      
      this.ocrText = result.data.text;
      await this.filtrarProductosAlimenticios(this.ocrText);
    } catch (err) {
      this.mostrarMensaje('Error al procesar la imagen. Por favor, intente nuevamente.');
    } finally {
      this.loading = false;
    }
  }

  private mostrarMensaje(mensaje: string) {
    this.mensajeToast = mensaje;
    this.mostrarToast = true;
  }

  esProductoNoAlimenticio(linea: string): boolean {
    const lineaLimpia = linea.toLowerCase();
    
    for (const categoria of Object.values(this.palabrasNoAlimenticias)) {
      if (categoria.some(palabra => lineaLimpia.includes(palabra))) {
        return true;
      }
    }
    
    return false;
  }

  calcularPuntuacionCategoria(linea: string, categoria: any): number {
    let puntuacion = 0;
    const lineaLimpia = linea.toLowerCase();

    // Verificar si el producto ya fue aprendido
    const productoAprendido = this.productosAprendidos.find(
      p => p.nombre.toLowerCase() === lineaLimpia
    );
    
    if (productoAprendido) {
      // Si el producto ya fue aprendido, dar puntuación extra
      puntuacion += productoAprendido.confianza * 2;
      return puntuacion;
    }

    // Puntos por palabras clave
    categoria.palabras.forEach((palabra: string) => {
      if (lineaLimpia.includes(palabra)) {
        puntuacion += 2;
      }
    });

    // Puntos por patrones
    categoria.patrones.forEach((patron: string) => {
      if (lineaLimpia.includes(patron)) {
        puntuacion += 3;
      }
    });

    return puntuacion;
  }

  obtenerMejorCategoria(linea: string): { categoria: string, puntuacion: number } {
    let mejorCategoria = '';
    let mejorPuntuacion = 0;

    for (const [nombreCategoria, config] of Object.entries(this.categoriasAlimenticias)) {
      const puntuacion = this.calcularPuntuacionCategoria(linea, config);
      if (puntuacion > mejorPuntuacion) {
        mejorPuntuacion = puntuacion;
        mejorCategoria = nombreCategoria;
      }
    }

    return { categoria: mejorCategoria, puntuacion: mejorPuntuacion };
  }

  private esNumeroBoleta(linea: string): boolean {
    // Patrones comunes de números de boleta
    const patronesBoleta = [
      /^\d{8}$/, // 8 dígitos
      /^B\d{8}$/, // B seguido de 8 dígitos
      /^S\d{8}$/, // S seguido de 8 dígitos
      /^T\d{8}$/, // T seguido de 8 dígitos
      /^E\d{8}$/  // E seguido de 8 dígitos
    ];
    
    return patronesBoleta.some(patron => patron.test(linea.trim()));
  }

  private extraerCodigoProducto(linea: string): string | null {
    // Buscar patrones comunes de códigos de producto
    const patronesCodigo = [
      /\b\d{8,13}\b/, // Códigos de 8-13 dígitos
      /\b[A-Z]\d{7,12}\b/, // Letra seguida de 7-12 dígitos
      /\b\d{7,12}[A-Z]\b/  // 7-12 dígitos seguidos de letra
    ];

    for (const patron of patronesCodigo) {
      const match = linea.match(patron);
      if (match) {
        return match[0];
      }
    }
    return null;
  }

  private contienePalabraClaveIgnorar(linea: string): boolean {
    const texto = linea.toLowerCase();
    return this.palabrasClaveIgnorar.some(palabra => texto.includes(palabra));
  }

  // Agrega esta función para limpiar precios de una línea
  private limpiarPreciosDeLinea(linea: string): string {
    // Elimina patrones de precios tipo $800, 800, -$80, -80, $1.170, 1.170, etc.
    // También elimina precios al final o en medio de la línea
    return linea.replace(/(\s*-?\$?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?\s*)+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  async filtrarProductosAlimenticios(texto: string) {
    const lineas = texto.split('\n');
    this.productosFiltrados = [];
    this.seleccionados = [];

    for (const linea of lineas) {
      // Ignorar líneas vacías o muy cortas
      if (!linea.trim() || linea.trim().length < 3) continue;

      // Ignorar líneas administrativas o de totales
      if (this.contienePalabraClaveIgnorar(linea)) continue;

      // Ignorar números de boleta
      if (this.esNumeroBoleta(linea)) continue;

      // Ignorar líneas que sean precios (con o sin $)
      if (/^\$?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/.test(linea.trim())) continue;

      // Verificar si es un producto no alimenticio
      if (this.esProductoNoAlimenticio(linea)) continue;

      // Extraer código de producto si existe
      const codigoProducto = this.extraerCodigoProducto(linea);

      // Obtener la mejor categoría para el producto
      const { categoria, puntuacion } = this.obtenerMejorCategoria(linea);

      // Solo incluir si tiene una puntuación mínima
      if (puntuacion >= 2) {
        // Limpiar precios de la línea antes de normalizar y aprender
        const lineaSinPrecios = this.limpiarPreciosDeLinea(linea.trim());
        const nombreNormalizado = this.normalizarNombreProducto(lineaSinPrecios);
        // Aprender del producto (solo local, para puntuación)
        this.aprenderProducto(lineaSinPrecios, categoria, puntuacion, codigoProducto);
        this.productosFiltrados.push({
          nombre: nombreNormalizado,
          nombreOriginal: linea.trim(),
          categoria: categoria,
          esAlimenticio: true,
          confianza: puntuacion,
          codigoProducto: codigoProducto
        });
        this.seleccionados.push(true); // Por defecto, todos seleccionados
      }
    }
    this.productosFiltrados.sort((a, b) => b.confianza - a.confianza);
  }

  private aprenderProducto(nombre: string, categoria: string, confianza: number, codigoProducto: string | null) {
    const productoExistente = this.productosAprendidos.find(
      p => p.nombre.toLowerCase() === nombre.toLowerCase() || 
          (codigoProducto && p.codigoProducto === codigoProducto)
    );

    if (productoExistente) {
      // Actualizar producto existente
      productoExistente.vecesDetectado++;
      productoExistente.confianza = (productoExistente.confianza + confianza) / 2;
      if (codigoProducto && !productoExistente.codigoProducto) {
        productoExistente.codigoProducto = codigoProducto;
      }
    } else {
      // Agregar nuevo producto
      this.productosAprendidos.push({
        nombre: nombre,
        categoria: categoria,
        confianza: confianza,
        vecesDetectado: 1,
        codigoProducto: codigoProducto
      });
    }
  }

  normalizarNombreProducto(nombre: string): string {
    const abreviaturas: { [key: string]: string } = {
      'pet': 'PET',
      'gas': 'Gaseosa',
      'cg': 'Con Gas',
      'integr': 'Integral',
      'choc': 'Chocolate',
      'mol': 'Molida',
      'pf': 'Preparado',
      'cult': 'Cultivado',
      'ligh': 'Light',
      'chir': 'Chirimoya',
      'liofiliz': 'Liofilizado'
    };

    let nombreNormalizado = nombre;
    
    Object.entries(abreviaturas).forEach(([abrev, completo]) => {
      const regex = new RegExp(`\\b${abrev}\\b`, 'gi');
      nombreNormalizado = nombreNormalizado.replace(regex, completo);
    });

    nombreNormalizado = nombreNormalizado.split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(' ');

    return nombreNormalizado;
  }

  getIconoCategoria(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'bebidas': '🥤',
      'panaderia': '🍞',
      'snacks': '🥨',
      'dulces': '🍫',
      'lacteos': '🥛',
      'carnes': '🥩',
      'condimentos': '🧂'
    };
    
    return iconos[categoria] || '📦';
  }

  getNivelConfianza(confianza: number): string {
    if (confianza >= 5) return 'Alta';
    if (confianza >= 3) return 'Media';
    return 'Baja';
  }

  resetOCR() {
    this.image = null;
    this.ocrText = '';
    this.productosFiltrados = [];
    this.seleccionados = [];
    this.loading = false;
  }

  async aceptarSeleccionados() {
    console.log('Botón Registrar aprendizaje presionado');
    this.loading = true;
    try {
      for (let i = 0; i < this.productosFiltrados.length; i++) {
        const prod = this.productosFiltrados[i];
        // Siempre marcar como correcto
        const esCorrecto = true;
        await this.supabaseService.registrarAceptacionProducto({
          nombreOriginal: prod.nombreOriginal,
          categoria: prod.categoria,
          codigoProducto: prod.codigoProducto,
          esCorrecta: esCorrecto,
        });
      }
      this.mostrarMensaje('¡Aprendizaje registrado con éxito!');
      await this.obtenerPrecisionGlobal();
      this.productosFiltrados = [];
      this.seleccionados = [];
      this.image = null;
      this.ocrText = '';
    } catch (error: any) {
      this.mostrarMensaje(`Error: ${error.message}`);
    } finally {
      this.loading = false;
    }
  }

  aceptarTodos() {
    console.log('Botón Aceptar todos presionado');
    this.seleccionados = this.productosFiltrados.map(() => true);
  }

  toggleSeleccionado(idx: number) {
    this.seleccionados[idx] = !this.seleccionados[idx];
  }
}
