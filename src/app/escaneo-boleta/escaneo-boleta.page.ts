import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonChip, IonIcon } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { cameraOutline, refreshOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { getApiUrl, API_ENDPOINTS } from '../core/api.config';

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
    IonButton, 
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonIcon,
    HttpClientModule
  ]
})
export class EscaneoBoletaPage implements OnInit {

  products: { nombre: string, categoria: string }[] = [];
  escaneando = false;
  mensaje = '';

  constructor(private http: HttpClient) {
    addIcons({
      cameraOutline,
      refreshOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit() {
  }

  async escanearBoleta() {
    this.escaneando = true;
    this.mensaje = 'Escaneando boleta...';
    
    try {
      // Tomar foto
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (!image || !image.dataUrl) {
        this.mensaje = 'No se obtuvo imagen';
        this.escaneando = false;
        return;
      }

      this.mensaje = 'Procesando imagen...';

      // Enviar al backend para OCR
      const response: any = await this.http.post(getApiUrl(API_ENDPOINTS.OCR), { 
        imageBase64: image.dataUrl 
      }).toPromise();
      
      const texto = response.text || '';
      const labels = response.labels || [];
      
      console.log('Texto detectado:', texto);
      console.log('Labels detectados:', labels);
      
      // Extraer productos del texto
      const productos = this.extraerProductos(texto);
      
      if (productos.length === 0) {
        this.mensaje = 'No se detectaron productos en la boleta';
        this.escaneando = false;
        return;
      }

      this.mensaje = 'Detectando categorías...';

      // Detectar categorías usando la nueva API
      const categoriaResponse: any = await this.http.post(getApiUrl(API_ENDPOINTS.DETECTAR_CATEGORIA), {
        productos: productos,
        labels: labels
      }).toPromise();

      this.products = categoriaResponse.productos;
      this.mensaje = `Se detectaron ${this.products.length} productos`;
      
      console.log('Productos con categorías:', this.products);
      
    } catch (error) {
      console.error('Error escaneando boleta:', error);
      this.mensaje = 'Error al procesar la boleta';
    } finally {
      this.escaneando = false;
    }
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
        const nombre = match[1].trim();
        
        // Filtrar nombres muy cortos o que parezcan códigos
        if (nombre.length > 2 && !/^\d+$/.test(nombre)) {
          // Verificar que no sea información de la boleta
          if (!this.esInformacionBoleta(nombre)) {
            // Verificar que no sea un duplicado
            if (!this.esDuplicado(nombre, productos)) {
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
        const nombre = nombreMatch[1].trim();
        if (nombre.length > 3 && 
            !this.esInformacionBoleta(nombre) &&
            !this.esDuplicado(nombre, productos)) {
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
        productos.push({ nombre: linea });
        console.log(`Producto detectado (patrón 3): "${linea}"`);
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
    this.mensaje = '';
  }

  obtenerColorCategoria(categoria: string): string {
    const colores: { [key: string]: string } = {
      'Bebestible': 'primary',
      'Infusión': 'secondary',
      'Verdura': 'success',
      'Fruta': 'warning',
      'Carne': 'danger',
      'Lácteo': 'tertiary',
      'Embutido': 'medium',
      'Aceites y Grasas': 'dark',
      'Pastas y Arroces': 'primary',
      'Masas y Premezclas': 'secondary',
      'Snack': 'warning',
      'Enlatado': 'medium',
      'Congelado': 'tertiary',
      'Panadería': 'success',
      'Condimento': 'dark',
      'Otro': 'medium'
    };
    
    return colores[categoria] || 'medium';
  }
}
