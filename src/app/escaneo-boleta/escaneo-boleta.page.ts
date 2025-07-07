import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  IonButton, 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonChip, 
  IonIcon, 
  IonCheckbox, 
  IonModal, 
  IonCard, 
  IonCardContent, 
  IonCardHeader, 
  IonCardTitle, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonBadge, 
  IonAlert, 
  IonLoading, 
  IonButtons, 
  IonProgressBar,
  IonFab,
  IonFabList,
  IonFabButton,
  IonBackdrop,
  IonSpinner
} from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { 
  cameraOutline, 
  refreshOutline, 
  checkmarkCircleOutline, 
  addOutline, homeOutline, 
  bagOutline, checkmarkCircle, 
  closeOutline, warningOutline, 
  informationCircleOutline, receiptOutline, 
  hourglassOutline, checkmarkDoneOutline, 
  pricetagOutline, checkmarkOutline, 
  imagesOutline, arrowForwardOutline, shieldOutline
} from 'ionicons/icons';
import { getApiUrl, API_ENDPOINTS } from '../core/api.config';
import { SupabaseService } from '../core/supabase.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';

interface EscaneoState {
  estado: 'inicial' | 'tomando_foto' | 'procesando_imagen' | 'extrayendo_texto' | 'detectando_categorias' | 'completado' | 'error';
  mensaje: string;
  progreso: number;
  icono: string;
}

@Component({
  selector: 'app-escaneo-boleta',
  templateUrl: './escaneo-boleta.page.html',
  styleUrls: ['./escaneo-boleta.page.scss'],
  standalone: true,
  imports: [ 
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    CommonModule, 
    FormsModule, 
    RouterModule,
    IonButton, 
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonIcon,
    IonCheckbox,
    IonModal,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonGrid,
    IonRow,
    IonCol,
    IonButtons,
    IonProgressBar,
    IonBadge,
    IonFab,
    IonFabButton,
    IonFabList,
    IonBackdrop,
    IonSpinner,
    HttpClientModule
  ]
})
export class EscaneoBoletaPage implements OnInit {

  products: { nombre: string, categoria: string, seleccionado: boolean }[] = [];
  procesando = false;
  despensas: any[] = [];
  mostrarSelectorDespensa = false;
  productosSeleccionados: { nombre: string, categoria: string }[] = [];
  despensaSeleccionada: any = null;
  agregandoProductos = false;
  todosSeleccionados: boolean = false;
  loadingStep: number = 0;
  loadingMessage: string = '';
  mostrarLoading: boolean = false;
  estadoEscaneo: EscaneoState = {
    estado: 'inicial',
    mensaje: 'Listo para escanear',
    progreso: 0,
    icono: 'camera-outline'
  };

  private readonly estadosEscaneo: { [key: string]: EscaneoState } = {
    inicial: {
      estado: 'inicial',
      mensaje: 'Listo para escanear',
      progreso: 0,
      icono: 'camera-outline'
    },
    tomando_foto: {
      estado: 'tomando_foto',
      mensaje: 'Tomando foto de la boleta...',
      progreso: 20,
      icono: 'camera-outline'
    },
    procesando_imagen: {
      estado: 'procesando_imagen',
      mensaje: 'Procesando imagen...',
      progreso: 40,
      icono: 'image-outline'
    },
    extrayendo_texto: {
      estado: 'extrayendo_texto',
      mensaje: 'Extrayendo texto de la boleta...',
      progreso: 60,
      icono: 'document-text-outline'
    },
    detectando_categorias: {
      estado: 'detectando_categorias',
      mensaje: 'Detectando categorías de productos...',
      progreso: 80,
      icono: 'pricetag-outline'
    },
    completado: {
      estado: 'completado',
      mensaje: '¡Escaneo completado!',
      progreso: 100,
      icono: 'checkmark-circle-outline'
    },
    error: {
      estado: 'error',
      mensaje: 'Error en el escaneo',
      progreso: 0,
      icono: 'warning-outline'
    }
  };

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {
    addIcons({receiptOutline,imagesOutline,refreshOutline,checkmarkDoneOutline,closeOutline,pricetagOutline,addOutline,informationCircleOutline,bagOutline,homeOutline,warningOutline,cameraOutline,checkmarkOutline,checkmarkCircleOutline,checkmarkCircle,hourglassOutline,arrowForwardOutline,shieldOutline});
  }

  ngOnInit() {
    this.cargarDespensas();
  }

  async cargarDespensas() {
    try {
      this.despensas = await this.supabaseService.obtenerDespensasUsuario();
    } catch (error) {
      console.error('Error al cargar despensas:', error);
    }
  }

  async escanearBoleta() {
    this.procesando = true;
    this.products = [];
    this.actualizarEstado('tomando_foto');

    try {
      // Tomar foto
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (!image || !image.dataUrl) {
        throw new Error('No se obtuvo imagen de la cámara');
      }

      this.actualizarEstado('procesando_imagen');
      await this.delay(500); // Simular procesamiento

      this.actualizarEstado('extrayendo_texto');

      // Enviar al backend para OCR
      const response: any = await this.http.post(getApiUrl(API_ENDPOINTS.OCR), {
        imageBase64: image.dataUrl
      }).toPromise();

      const texto = response.text || '';
      const labels = response.labels || [];

      // Extraer productos del texto
      const productos = this.extraerProductos(texto);

      if (productos.length === 0) {
        this.actualizarEstado('error', 'No se detectaron productos en la boleta. Intenta con una imagen más clara.');
        this.procesando = false;
        return;
      }

      this.actualizarEstado('detectando_categorias');

      // Detectar categorías usando la nueva API (si existe)
      let categoriaResponse: any = { productos: [] };
      try {
        categoriaResponse = await this.http.post(getApiUrl(API_ENDPOINTS.DETECTAR_CATEGORIA), {
          productos: productos,
          labels: labels
        }).toPromise();
      } catch (e) {
        // Si falla, asignar categoría localmente
        categoriaResponse.productos = productos.map((producto: any) => ({
          ...producto,
          categoria: this.detectarCategoriaLocal(producto.nombre)
        }));
      }

      // Agregar propiedad seleccionado a cada producto
      this.products = categoriaResponse.productos.map((producto: any) => ({
        ...producto,
        seleccionado: true // Por defecto todos seleccionados
      }));

      this.actualizarEstado('completado', `Se detectaron ${this.products.length} productos exitosamente`);

      // Resetear estado después de 2 segundos
      setTimeout(() => {
        if (this.estadoEscaneo.estado === 'completado') {
          this.estadoEscaneo = this.estadosEscaneo['inicial'];
        }
      }, 2000);

    } catch (error: any) {
      this.actualizarEstado('error', this.obtenerMensajeError(error));
    } finally {
      this.procesando = false;
    }
  }

  actualizarEstado(nuevoEstado: string, mensajePersonalizado?: string) {
    const estado = this.estadosEscaneo[nuevoEstado];
    if (estado) {
      this.estadoEscaneo = {
        ...estado,
        mensaje: mensajePersonalizado || estado.mensaje
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private obtenerMensajeError(error: any): string {
    if (error.message?.includes('camera')) {
      return 'Error al acceder a la cámara. Verifica los permisos.';
    } else if (error.message?.includes('network')) {
      return 'Error de conexión. Verifica tu internet.';
    } else if (error.status === 413) {
      return 'La imagen es demasiado grande. Intenta con una resolución menor.';
    } else if (error.status === 500) {
      return 'Error del servidor. Intenta nuevamente en unos momentos.';
    } else {
      return 'Error inesperado. Intenta nuevamente.';
    }
  }

  detectarCategoriaLocal(nombre: string): string {
    const nombreUpper = nombre.toUpperCase();
    
    const categorias = {
      'Lácteos': ['LECHE', 'QUESO', 'YOGUR', 'YOGURT', 'MANTECA', 'CREMA', 'MANTEQUILLA'],
      'Carnes': ['CARNE', 'POLLO', 'PESCADO', 'RES', 'VACUNO', 'CERDO', 'PAVO', 'JAMON', 'SALCHICHA', 'ATUN', 'SARDINA', 'SALMON'],
      'Frutas y Verduras': ['MANZANA', 'NARANJA', 'BANANA', 'TOMATE', 'CEBOLLA', 'PAPA', 'ZANAHORIA', 'LECHUGA', 'ESPINACA', 'BROCOLI', 'COLIFLOR', 'FRUTA', 'VERDURA'],
      'Granos y Cereales': ['ARROZ', 'PASTA', 'PAN', 'HARINA', 'AZUCAR'],
      'Bebidas': ['BEBIDA', 'JUGO', 'AGUA', 'CAFE', 'TE', 'VINO', 'CERVEZA'],
      'Condimentos': ['SAL', 'PIMIENTA', 'ACEITE'],
      'Dulces': ['CHOCOLATE', 'GALETA', 'AZUCAR'],
      'Otros': ['HUEVO']
    };
    
    for (const [categoria, palabras] of Object.entries(categorias)) {
      if (palabras.some(palabra => nombreUpper.includes(palabra))) {
        return categoria;
      }
    }
    
    return 'Otros';
  }

  // Función para convertir a InitCap
  private toInitCap(texto: string): string {
    return texto
      .toLowerCase()
      .replace(/\b([a-záéíóúñü])([a-záéíóúñü]*)/gi, (match, p1, p2) => p1.toUpperCase() + p2);
  }

  extraerProductos(texto: string): { nombre: string }[] {
    const lineas = texto.split('\n');
    const productos: { nombre: string }[] = [];
    
    // Buscar la sección de productos en la boleta
    let inicioProductos = -1;
    let finProductos = -1;
    
    // Buscar el inicio (línea que contenga CODIGO o DESCRIPCION)
    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i].toUpperCase();
      if (linea.includes('CODIGO') || linea.includes('DESCRIPCION') || 
          linea.includes('CÓDIGO') || linea.includes('DESCRIPCIÓN')) {
        inicioProductos = i + 1; // Empezar desde la siguiente línea
        break;
      }
    }
    
    // Buscar el fin (línea que contenga SUB TOTAL, NETO, TOTAL, IVA)
    for (let i = inicioProductos; i < lineas.length; i++) {
      const linea = lineas[i].toUpperCase();
      if (linea.includes('SUB TOTAL') || linea.includes('NETO') || 
          linea.includes('TOTAL') || linea.includes('IVA') ||
          linea.includes('SUBTOTAL') || linea.includes('DESCUENTO')) {
        finProductos = i;
        break;
      }
    }
    
    // Si no se encontró el fin, usar hasta el final
    if (finProductos === -1) {
      finProductos = lineas.length;
    }
    
    // Si no se encontró el inicio, usar todo el texto
    if (inicioProductos === -1) {
      inicioProductos = 0;
    }
    
    console.log(`Sección de productos: líneas ${inicioProductos} a ${finProductos}`);
    
    // Extraer productos solo de la sección correcta
    for (let i = inicioProductos; i < finProductos; i++) {
      const linea = lineas[i].trim();
      
      // Saltar líneas vacías o que sean encabezados
      if (!linea || linea.length < 3) continue;
      
      // Saltar líneas que sean encabezados de boleta
      if (this.esEncabezadoBoleta(linea)) continue;
      
      // Patrón 1: código de 8+ dígitos seguido de nombre de producto
      const match = linea.match(/^\d{8,}\s+(.+)/);
      if (match) {
        let nombre = match[1].trim();
        
        // Filtrar nombres muy cortos o que parezcan códigos
        if (nombre.length > 2 && !/^\d+$/.test(nombre)) {
          if (!this.esInformacionBoleta(nombre)) {
            if (!this.esDuplicado(nombre, productos)) {
              nombre = this.toInitCap(nombre);
              productos.push({ nombre });
              console.log(`Producto detectado (patrón 1): "${nombre}"`);
            }
          }
        }
      }
      
      // Patrón 2: líneas que empiecen con nombres de productos comunes
      // (para casos donde no hay código)
      const nombreMatch = linea.match(/^([A-Za-zÁáÉéÍíÓóÚúÑñ\s]+)\s+\d+[,.]?\d*/);
      if (nombreMatch) {
        let nombre = nombreMatch[1].trim();
        if (nombre.length > 3 && 
            !this.esInformacionBoleta(nombre) &&
            !this.esDuplicado(nombre, productos)) {
          nombre = this.toInitCap(nombre);
          productos.push({ nombre });
          console.log(`Producto detectado (patrón 2): "${nombre}"`);
        }
      }
      
      // Patrón 3: líneas que contengan palabras alimenticias clave
      // (para casos donde el formato no es estándar)
      if (this.contienePalabrasAlimenticias(linea) && 
          !this.esInformacionBoleta(linea) &&
          linea.length > 5 &&
          !this.esDuplicado(linea, productos)) {
        const nombre = this.toInitCap(linea);
        productos.push({ nombre });
        console.log(`Producto detectado (patrón 3): "${nombre}"`);
      }
    }
    
    console.log('Productos extraídos:', productos);
    return productos;
  }

  // Función para verificar si es un encabezado de boleta
  esEncabezadoBoleta(texto: string): boolean {
    const textoUpper = texto.toUpperCase();
    
    const encabezados = [
      'CODIGO', 'CÓDIGO', 'DESCRIPCION', 'DESCRIPCIÓN', 'CANTIDAD', 'PRECIO',
      'VALOR', 'DESCUENTO', 'PROMOCION', 'OFERTA', 'CANTIDAD X PRECIO'
    ];
    
    return encabezados.some(encabezado => textoUpper.includes(encabezado));
  }

  // Función para verificar si es un duplicado
  esDuplicado(nombre: string, productos: { nombre: string }[]): boolean {
    const nombreUpper = nombre.toUpperCase();
    
    return productos.some(producto => {
      const productoUpper = producto.nombre.toUpperCase();
      
      // Verificar si uno contiene al otro
      return nombreUpper.includes(productoUpper) || productoUpper.includes(nombreUpper);
    });
  }

  // Función para verificar si una línea contiene palabras alimenticias
  contienePalabrasAlimenticias(texto: string): boolean {
    const textoUpper = texto.toUpperCase();
    
    const palabrasAlimenticias = [
      'CARNE', 'POLLO', 'PESCADO', 'LECHE', 'QUESO', 'YOGUR', 'PAN', 'ARROZ',
      'PASTA', 'FRUTA', 'VERDURA', 'HUEVO', 'JAMON', 'SALCHICHA', 'ACEITE',
      'MANTEQUILLA', 'AZUCAR', 'SAL', 'PIMIENTA', 'HARINA', 'CHOCOLATE', 
      'GALETA', 'BEBIDA', 'JUGO', 'AGUA', 'CAFE', 'TE', 'VINO', 'CERVEZA',
      'YOGURT', 'MANTECA', 'CREMA', 'ATUN', 'SARDINA', 'SALMON', 'RES', 
      'VACUNO', 'CERDO', 'PAVO', 'MANZANA', 'NARANJA', 'BANANA', 'TOMATE', 
      'CEBOLLA', 'PAPA', 'ZANAHORIA', 'LECHUGA', 'ESPINACA', 'BROCOLI', 
      'COLIFLOR', 'MOLIDA', 'DESC' // Agregamos DESC para casos como "DESC CARNE MOLIDA"
    ];
    
    return palabrasAlimenticias.some(palabra => textoUpper.includes(palabra));
  }

  // Función para verificar si un texto es información de la boleta, no un producto
  esInformacionBoleta(texto: string): boolean {
    const textoUpper = texto.toUpperCase();
    
    // Palabras que indican información de la boleta, no productos
    const palabrasBoleta = [
      'ATENDIDO', 'SCO', 'POS', 'VALOR', 'TRX', 'BT', 'DESCUENTO',
      'PROMOCION', 'PROMOCIÓN', 'OFERTA', 'DESCUENTOS', 'PUNTOS', 'GANADOS',
      'COMPRA', 'VENTA', 'DEBITO', 'CREDITO', 'EFECTIVO', 'TRANSFERENCIA',
      'CHEQUE', 'TARJETA', 'BANCO', 'CUENTA', 'OPERACION', 'AUTORIZACION',
      'NUMERO', 'UNICO', 'FECHA', 'HORA', 'LOCAL', 'SUCURSAL', 'CAJA',
      'CAJERO', 'EMPLEADO', 'CLIENTE', 'RUT', 'GIRO', 'BOLETA', 'FACTURA',
      'TICKET', 'COMPROBANTE', 'RECIBO', 'PAGO', 'MONTO', 'IMPORTE',
      'SUBTOTAL', 'NETO', 'IVA', 'TOTAL', 'CAMBIO', 'VUELTO',
      'TIMBRE', 'ELECTRONICO', 'SII', 'RESOLUCION', 'VERIFIQUE', 'DOCUMENTO',
      'ACEPTO', 'PAGAR', 'CONTRATO', 'EMISOR', 'CONTABLE', 'OPERACION',
      'AUTORIZACION', 'UNICO', 'FECHA', 'CONTABLE', 'MONTO', 'TOTAL',
      'NUMERO', 'OPERACION', 'CODIGO', 'AUTORIZACION', 'NUMERO', 'UNICO'
    ];
    
    // Palabras que indican productos alimenticios (para evitar filtrarlos)
    const palabrasAlimenticias = [
      'CARNE', 'POLLO', 'PESCADO', 'LECHE', 'QUESO', 'YOGUR', 'PAN', 'ARROZ',
      'PASTA', 'FRUTA', 'VERDURA', 'HUEVO', 'JAMON', 'SALCHICHA', 'ACEITE',
      'MANTEQUILLA', 'AZUCAR', 'SAL', 'PIMIENTA', 'HARINA', 'AZUCAR',
      'CHOCOLATE', 'GALETA', 'BEBIDA', 'JUGO', 'AGUA', 'CAFE', 'TE',
      'VINO', 'CERVEZA', 'LECHE', 'YOGURT', 'QUESO', 'MANTECA', 'CREMA',
      'ATUN', 'SARDINA', 'SALMON', 'RES', 'VACUNO', 'CERDO', 'PAVO',
      'MANZANA', 'NARANJA', 'BANANA', 'TOMATE', 'CEBOLLA', 'PAPA',
      'ZANAHORIA', 'LECHUGA', 'ESPINACA', 'BROCOLI', 'COLIFLOR'
    ];
    
    // Si el texto contiene palabras alimenticias, NO es información de boleta
    if (palabrasAlimenticias.some(palabra => textoUpper.includes(palabra))) {
      return false;
    }
    
    // Verificar si contiene palabras de información de boleta
    return palabrasBoleta.some(palabra => textoUpper.includes(palabra));
  }

  limpiarProductos() {
    this.products = [];
    this.productosSeleccionados = [];
    this.despensaSeleccionada = null;
    this.mostrarSelectorDespensa = false;
  }

  toggleSeleccionProducto(producto: any) {
    producto.seleccionado = !producto.seleccionado;
  }

  toggleSeleccionTodos() {
    const nuevoEstado = this.todosSeleccionados;
    this.products.forEach(p => p.seleccionado = nuevoEstado);
  }

  obtenerProductosSeleccionados() {
    return this.products.filter(producto => producto.seleccionado);
  }

  async continuarConProductosSeleccionados() {
    const productosSeleccionados = this.obtenerProductosSeleccionados();
    
    if (productosSeleccionados.length === 0) {
      const alert = await this.alertController.create({
        header: 'Sin productos seleccionados',
        message: 'Debes seleccionar al menos un producto para continuar.',
        buttons: ['Entendido']
      });
      await alert.present();
      return;
    }

    this.productosSeleccionados = productosSeleccionados;
    this.mostrarSelectorDespensa = true;
  }

  seleccionarDespensa(despensa: any) {
    this.despensaSeleccionada = despensa;
  }

  async agregarProductosADespensa() {
    if (!this.despensaSeleccionada) {
      const alert = await this.alertController.create({
        header: 'Despensa no seleccionada',
        message: 'Debes seleccionar una despensa para agregar los productos.',
        buttons: ['Entendido']
      });
      await alert.present();
      return;
    }

    this.agregandoProductos = true;

    try {
      const loading = await this.loadingController.create({
        message: 'Agregando productos...',
        spinner: 'crescent'
      });
      await loading.present();

      for (const producto of this.productosSeleccionados) {
        await this.supabaseService.agregarProductoADespensa(
          this.despensaSeleccionada.despensas.id,
          {
            nombre: producto.nombre,
            categoria: producto.categoria,
            stock: 1
          }
        );
      }

      await loading.dismiss();

      const alert = await this.alertController.create({
        header: 'Productos agregados',
        message: `Se agregaron ${this.productosSeleccionados.length} productos a "${this.despensaSeleccionada.despensas.nombre}" exitosamente.`,
        buttons: [
          {
            text: 'Ir a la despensa',
            handler: () => {
              const id = this.despensaSeleccionada?.despensas?.id;
              this.limpiarProductos();
              if (id) {
                this.router.navigate(['/despensa', id]);
              }
            }
          },
          {
            text: 'Escanear otra boleta',
            handler: () => {
              this.limpiarProductos();
            }
          }
        ],
        backdropDismiss: true,
        cssClass: 'alert-backdrop-dismiss'
      });
      
      // Manejar cuando se cierra el alert haciendo clic fuera
      alert.onDidDismiss().then(() => {
        this.limpiarProductos();
      });
      
      await alert.present();

    } catch (error: any) {
      await this.loadingController.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Error',
        message: `Error al agregar productos: ${error.message}`,
        buttons: ['Entendido']
      });
      await alert.present();
    } finally {
      this.agregandoProductos = false;
    }
  }

  cancelarSeleccionDespensa() {
    this.mostrarSelectorDespensa = false;
    this.despensaSeleccionada = null;
    this.productosSeleccionados = [];
  }

  getRoleColor(rol: string): string {
    switch (rol) {
      case 'propietario':
        return 'primary';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getRoleIcon(rol: string): string {
    switch (rol) {
      case 'propietario':
        return 'shield-outline';
      case 'editor':
        return 'person-outline';
      case 'viewer':
        return 'eye-outline';
      default:
        return 'person-outline';
    }
  }

  obtenerColorCategoria(categoria: string): string {
    return 'success';
  }

  ngDoCheck() {
    // Sincroniza el estado del checkbox con los productos seleccionados
    if (this.products.length > 0) {
      this.todosSeleccionados = this.products.every(p => p.seleccionado);
    } else {
      this.todosSeleccionados = false;
    }
  }
}
