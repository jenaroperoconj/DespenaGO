import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { CompartirDespensaModal } from '../despensa/compartir-despensa.modal';
import { ConsumirProductoModal } from './consumir-producto.modal';
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
  saveOutline,   shareOutline,
  star,
  eyeOutline,
  helpOutline,
  listOutline
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

  productoOpciones: any = null;

  // Variables para manejar permisos
  rolUsuario: string | null = null;
  puedeEditar: boolean = false;
  esPropietario: boolean = false;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService, 
    private modalCtrl: ModalController, 
    private popoverCtrl: PopoverController,
    private carritoService: CarritoService,
    private alertController: AlertController
  ) {    addIcons({
      shareOutline,
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
      saveOutline,
      star,
      eyeOutline,
      helpOutline,
      listOutline
    });
  }

  ngOnInit() {
    this.despensaId = this.route.snapshot.paramMap.get('id')!;
    this.cargarProductos();
    this.cargarNombreDespensa();
    this.cargarPermisos();
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
    // Verificar permisos antes de permitir acciones
    if ((accion === 'editar' || accion === 'eliminar') && !this.puedeEditar) {
      await this.mostrarError('No tienes permisos para realizar esta acción');
      return;
    }

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
      // Si el stock ya está en 0, ofrecer agregar a lista de compras directamente
      await this.carritoService.verificarStockAgotado(
        producto.id,
        0,
        this.despensaId,
        producto.productos.id,
        producto.productos.nombre
      );
      return;
    }

    // Usar el nuevo modal de consumir producto
    const modal = await this.modalCtrl.create({
      component: ConsumirProductoModal,
      componentProps: {
        producto: producto,
        despensaId: this.despensaId
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // Si se consumió el producto, recargar la lista
      await this.cargarProductos();
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
    if (!this.puedeEditar) {
      this.mostrarError('No tienes permisos para agregar productos');
      return;
    }
    
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

  async cargarPermisos() {
    try {
      // Obtener el rol del usuario en esta despensa
      this.rolUsuario = await this.supabase.obtenerRolEnDespensa(this.despensaId);
      this.esPropietario = await this.supabase.esPropietarioDespensa(this.despensaId);
      
      // Determinar permisos según el rol
      this.puedeEditar = this.rolUsuario === 'propietario' || this.rolUsuario === 'editor';
      
      console.log('Permisos cargados:', {
        rol: this.rolUsuario,
        puedeEditar: this.puedeEditar,
        esPropietario: this.esPropietario
      });
    } catch (err: any) {
      console.error('Error al cargar permisos:', err.message);
      // Por defecto, asumir que no puede editar si hay error
      this.puedeEditar = false;
      this.esPropietario = false;
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
  
  // Métodos auxiliares para indicadores visuales de roles
  getRoleColor(): string {
    switch (this.rolUsuario) {
      case 'propietario':
        return 'success';
      case 'editor':
        return 'primary';
      case 'viewer':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getRoleLabel(): string {
    switch (this.rolUsuario) {
      case 'propietario':
        return 'Propietario';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Visor';
      default:
        return 'Sin permisos';
    }
  }

  getRoleIcon(): string {
    switch (this.rolUsuario) {
      case 'propietario':
        return 'star';
      case 'editor':
        return 'create-outline';
      case 'viewer':
        return 'eye-outline';
      default:
        return 'help-outline';
    }
  }
  
  // Método para manejar el clic en el overlay
  onOverlayClick(event: Event) {
    this.mostrarFormularioAgregar = false;
    this.mostrarFormularioEditar = false;
  }

  async abrirModalCompartir() {
    const modal = await this.modalCtrl.create({
      component: CompartirDespensaModal,
      componentProps: {
        despensaId: this.despensaId,
        nombreDespensa: this.nombreDespensa
      }
    });

    await modal.present();
  }

  // Métodos para controlar cantidad en formulario de agregar producto
  incrementarStock() {
    this.nuevoProducto.stock++;
  }

  decrementarStock() {
    if (this.nuevoProducto.stock > 1) {
      this.nuevoProducto.stock--;
    }
  }

  // Métodos para controlar cantidad en formulario de editar producto
  incrementarStockEdit() {
    this.productoEditar.stock++;
  }
  decrementarStockEdit() {
    if (this.productoEditar.stock > 1) {
      this.productoEditar.stock--;
    }
  }

  // Navegar a la lista de compras
  irAListaCompras() {
    this.router.navigate(['/lista-compras', this.despensaId]);
  }
}
