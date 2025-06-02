import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonIcon,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonButton,
  IonList,
  IonButtons,
  IonBackButton,
  IonCardContent,
  IonCard,
  IonInput,
  IonPopover,
  IonGrid,
  IonRow,
  IonCol,
  IonChip,
  IonFab,
  IonFabButton,
  PopoverController,
  AlertController
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { CarritoService } from 'src/app/core/carrito.service';
import { PopoverOpcionesComponent } from '../popover-opciones/popover-opciones.component';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  basketOutline,
  bagOutline,
  pricetagOutline,
  calendarOutline,
  cubeOutline,
  ellipsisVertical,
  createOutline,
  removeOutline,
  trashOutline,
  addOutline,
  closeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  saveOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-detalle-despensa',
  templateUrl: './detalle-despensa.page.html',
  styleUrls: ['./detalle-despensa.page.scss'],
  standalone: true,
  providers: [ModalController],  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonButton,
    IonList,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonCardContent,
    IonCard,
    IonInput,
    IonPopover,
    IonGrid,
    IonRow,
    IonCol,
    IonChip,
    IonFab,
    IonFabButton
  ]
})
export class DetalleDespensaPage implements OnInit {
  despensaId!: string;
  nombreProducto: string = '';
  error: string | null = null;
  nombreDespensa: string = '';

  mostrarFormularioAgregar: boolean = false;
  mostrarFormularioEditar: boolean = false;

  productoEditar: any = null;

  nuevoProducto = {
    nombre: '',
    categoria: '',
    origen: '',
    fecha_vencimiento: '',
    stock: 1
  };

  productoOpciones: any = null;  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService, 
    private modalCtrl: ModalController, 
    private popoverCtrl: PopoverController,
    private carritoService: CarritoService,
    private alertController: AlertController
  ) {
    addIcons({
      basketOutline,
      bagOutline,
      pricetagOutline,
      calendarOutline,
      cubeOutline,
      ellipsisVertical,
      createOutline,
      removeOutline,
      trashOutline,
      addOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      saveOutline
    });
  }

  ngOnInit() {
    this.despensaId = this.route.snapshot.paramMap.get('id')!;
    this.cargarProductos();
    this.cargarNombreDespensa();
  }

  producto = {
    nombre: '',
    categoria: '',
    origen: '',
    fecha_vencimiento: '',
    stock: 1
  };

  productos: any[] = [];
  async cargarProductos() {
    try {
      this.productos = await this.supabase.obtenerProductosDeDespensa(this.despensaId);
      console.log('Productos cargados:', this.productos);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  async onPopoverAccion(accion: 'editar' | 'consumir' | 'eliminar', producto: any) {
    // Cierra el popover si está abierto
    await this.popoverCtrl.dismiss();

    switch (accion) {
      case 'editar':
        this.abrirFormularioEditarProducto(producto);
        break;

      case 'consumir':
        this.abrirFormularioConsumirProducto(producto);
        break;

      case 'eliminar':
        this.confirmarEliminarProducto(producto);
        break;
    }
  }
  async abrirFormularioConsumirProducto(producto: any) {
    if (producto.stock <= 0) {
      // Si el stock ya está en 0, ofrecer agregar a lista de deseos directamente
      await this.carritoService.verificarStockAgotado(
        producto.id,
        0,
        this.despensaId,
        producto.productos.id,
        producto.productos.nombre
      );
      return;
    }

    // Mostrar alerta para consumir producto
    const alert = await this.alertController.create({
      header: 'Consumir Producto',
      message: `¿Cuántas unidades de "${producto.productos.nombre}" deseas consumir?`,
      inputs: [
        {
          name: 'cantidad',
          type: 'number',
          placeholder: 'Cantidad',
          min: 1,
          max: producto.stock,
          value: 1
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Consumir',
          handler: async (data) => {
            const cantidad = parseInt(data.cantidad);
            if (isNaN(cantidad) || cantidad <= 0 || cantidad > producto.stock) {
              await this.mostrarError('Cantidad no válida');
              return false;
            }
            
            await this.consumirProducto(producto, cantidad);
            return true;
          }
        },
        {
          text: 'Marcar como usado completamente',
          cssClass: 'secondary',
          handler: async () => {
            await this.consumirProducto(producto, producto.stock);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Consume una cantidad específica del producto y verifica si se agotó
   */
  private async consumirProducto(producto: any, cantidad: number): Promise<void> {
    try {
      const nuevoStock = producto.stock - cantidad;
      
      if (nuevoStock <= 0) {
        // Si el stock llega a 0 o menos, eliminar el producto de la despensa
        await this.supabase.eliminarProductoDeDespensa(producto.id);
        
        // Verificar stock agotado y ofrecer agregar a lista de deseos
        await this.carritoService.verificarStockAgotado(
          producto.id,
          0,
          this.despensaId,
          producto.productos.id,
          producto.productos.nombre
        );
      } else {
        // Si queda stock, actualizar la cantidad
        await this.supabase.client
          .from('producto_despensa')
          .update({ stock: nuevoStock })
          .eq('id', producto.id);
      }

      this.productoOpciones = null;
      await this.cargarProductos();
    } catch (err: any) {
      console.error('Error al consumir producto:', err.message);
      await this.mostrarError('Error al consumir producto: ' + err.message);
    }
  }

  /**
   * Muestra un mensaje de error
   */
  private async mostrarError(mensaje: string): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['Entendido'],
      cssClass: 'alert-error'
    });

    await alert.present();
  }

  async confirmarEliminarProducto(producto: any) {
    if (confirm(`¿Eliminar el producto "${producto.productos.nombre}"?`)) {
      try {
        await this.supabase.eliminarProductoDeDespensa(producto.id);
        this.productoOpciones = null;
        await this.cargarProductos();
      } catch (err: any) {
        console.error('Error al eliminar producto:', err.message);
      }
    }
  }
  
  abrirFormularioAgregarProducto() {
    this.mostrarFormularioAgregar = true;
    this.nuevoProducto = {
      nombre: '',
      categoria: '',
      origen: '',
      fecha_vencimiento: '',
      stock: 1
    };
  }

  async agregarProducto() {
    try {
      await this.supabase.agregarProductoADespensa(this.despensaId, this.nuevoProducto);
      this.mostrarFormularioAgregar = false;
      await this.cargarProductos();
    } catch (err: any) {
      this.error = err.message;
    }
  }

  abrirFormularioEditarProducto(producto: any) {
    this.mostrarFormularioEditar = true;
    this.productoEditar = JSON.parse(JSON.stringify(producto));
  }

  async guardarCambiosEditarProducto() {
    try {
      // 1. Actualiza producto_despensa
      const { error: errorDespensa } = await this.supabase.client
        .from('producto_despensa')
        .update({
          fecha_vencimiento: this.productoEditar.fecha_vencimiento,
          stock: this.productoEditar.stock
        })
        .eq('id', this.productoEditar.id);

      if (errorDespensa) throw errorDespensa;

      // 2. Actualiza productos
      const { error: errorProducto } = await this.supabase.client
        .from('productos')
        .update({
          nombre: this.productoEditar.productos.nombre,
          categoria: this.productoEditar.productos.categoria,
          origen: this.productoEditar.productos.origen
        })
        .eq('id', this.productoEditar.productos.id);

      if (errorProducto) throw errorProducto;

      // 3. Cierra el formulario y recarga
      this.mostrarFormularioEditar = false;
      this.productoEditar = null;
      await this.cargarProductos();
    } catch (err: any) {
      console.error('Error al editar producto:', err);
      this.error = 'Error al editar producto: ' + err.message;
    }
  }

  async abrirPopover(ev: Event, producto: any) {
    const popover = await this.popoverCtrl.create({
      component: PopoverOpcionesComponent,
      event: ev,
      translucent: true,
      componentProps: { producto }
    });

    popover.onDidDismiss().then(() => {
      this.cargarProductos();
    });

    await popover.present();
  }
  async cargarNombreDespensa() {
    try {
      const { data, error } = await this.supabase.client
        .from('despensas')
        .select('nombre')
        .eq('id', this.despensaId)
        .single();

      if (error) throw error;
      this.nombreDespensa = data.nombre;
    } catch (err: any) {
      console.error('Error al obtener nombre de despensa:', err.message);
    }
  }

  esVencido(fecha: string): boolean {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  esProntoAVencer(fecha: string, dias: number = 5): boolean {
    if (!fecha) return false;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const limite = new Date(hoy);
    limite.setDate(hoy.getDate() + dias);
    return vencimiento >= hoy && vencimiento <= limite;
  }

  // Variables de estado para los formularios
  success = false;

  // Método para manejar el clic en el overlay
  onOverlayClick(event: Event) {
    this.mostrarFormularioAgregar = false;
    this.mostrarFormularioEditar = false;
  }

}
