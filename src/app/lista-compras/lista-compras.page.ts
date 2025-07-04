import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, AlertController, ToastController, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupabaseService } from '../core/supabase.service';
import { PopoverOpcionesListaComprasComponent } from './popover-opciones-lista-compras.component';
import { addIcons } from 'ionicons';
import {
  add,
  cart,
  checkmarkCircle,
  createOutline,
  trashOutline,
  refreshOutline,
  bagCheckOutline,
  listOutline,
  personAddOutline,
  shareOutline,
  closeOutline,
  searchOutline,
  removeOutline,
  addOutline,
  pricetagOutline,
  cubeOutline,
  checkmarkDoneOutline,
  checkmarkCircleOutline,
  saveOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-lista-compras',
  templateUrl: './lista-compras.page.html',
  styleUrls: ['./lista-compras.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ListaComprasPage implements OnInit {
  despensaId!: string;
  nombreDespensa = '';
  listaCompras: any[] = [];
  loading = false;
  error: string | null = null;
  puedeEditar = false;

  // --- NUEVO: Variables para el formulario overlay ---
  mostrarFormularioAgregar = false;
  nuevoProducto = {
    nombre: '',
    categoria: '',
    origen: ''
  };
  cantidad = 1;
  notas = '';
  errorAgregar: string | null = null;
  guardando = false;

  // --- NUEVO: Variables para el overlay de edición ---
  mostrarFormularioEditar = false;
  itemEditar: any = null;
  cantidadEditar = 1;
  notasEditar = '';
  nombreEditar = '';
  categoriaEditar = '';
  origenEditar = '';
  errorEditar: string | null = null;
  guardandoEditar = false;

  categoriasPredefinidas = [
    'Bebestible',
    'Infusión',
    'Verdura',
    'Fruta',
    'Carne',
    'Lácteo',
    'Embutido',
    'Aceites y Grasas',
    'Pastas y Arroces',
    'Masas y Premezclas',
    'Snack',
    'Enlatado',
    'Congelado',
    'Panadería',
    'Condimento',
    'Otro'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private popoverCtrl: PopoverController
  ) {
    addIcons({
      add,
      cart,
      checkmarkCircle,
      createOutline,
      trashOutline,
      refreshOutline,
      bagCheckOutline,
      listOutline,
      personAddOutline,
      shareOutline,
      closeOutline,
      searchOutline,
      removeOutline,
      addOutline,
      pricetagOutline,
      cubeOutline,
      checkmarkDoneOutline,
      checkmarkCircleOutline,
      saveOutline
    });  }
  ngOnInit() {
    this.despensaId = this.route.snapshot.paramMap.get('id')!;
    this.cargarListaCompras();
    this.cargarNombreDespensa();
    this.cargarPermisos();

    // Suscribirse a los cambios de queryParams
    this.route.queryParams.subscribe(params => {
      if (params['recargar']) {
        this.cargarListaCompras();
      }
    });
  }
  async cargarListaCompras() {
    try {
      this.loading = true;
      this.listaCompras = await this.supabase.obtenerListaCompras(this.despensaId);
    } catch (err: any) {
      this.error = err.message;
      console.error('Error al cargar lista de compras:', err);
    } finally {
      this.loading = false;
    }
  }

  async cargarNombreDespensa() {
    try {
      const { data, error } = await this.supabase.client
        .from('despensas')
        .select('nombre')
        .eq('id', this.despensaId)
        .single();

      if (error) throw error;
      this.nombreDespensa = data?.nombre || 'Lista de Compras';
    } catch (err) {
      console.error('Error al cargar nombre de despensa:', err);
      this.nombreDespensa = 'Lista de Compras';
    }  }

  async cargarPermisos() {
    try {      const { data: { user } } = await this.supabase.client.auth.getUser();
      if (!user) {
        return;
      }

      const { data, error } = await this.supabase.client
        .from('accesos_despensa')
        .select('rol')
        .eq('usuario_id', user.id)
        .eq('despensa_id', this.despensaId)
        .single();      if (error) {
        console.error('Error verificando permisos:', error);
        return;
      }this.puedeEditar = data?.rol === 'propietario' || data?.rol === 'editor';
    } catch (err) {
      console.error('Error en verificarPermisos:', err);
      this.puedeEditar = false;
    }
  }

  abrirModalAgregarProducto() {
    this.mostrarFormularioAgregar = true;
    this.nuevoProducto = { nombre: '', categoria: '', origen: '' };
    this.cantidad = 1;
    this.notas = '';
    this.errorAgregar = null;
  }

  cerrarFormularioAgregar() {
    this.mostrarFormularioAgregar = false;
  }

  async crearYAgregarProducto() {
    if (!this.nuevoProducto.nombre.trim()) {
      this.errorAgregar = 'El nombre del producto es requerido';
      return;
    }
    try {
      this.guardando = true;
      await this.supabase.crearProductoYAgregarALista(
        this.despensaId,
        {
          nombre: this.nuevoProducto.nombre.trim(),
          categoria: this.nuevoProducto.categoria.trim() || undefined,
          origen: this.nuevoProducto.origen.trim() || undefined
        },
        this.cantidad,
        this.notas || undefined
      );
      this.mostrarToast(`${this.nuevoProducto.nombre} agregado a la lista`);
      this.cerrarFormularioAgregar();
      await this.cargarListaCompras();
    } catch (err: any) {
      this.errorAgregar = err.message;
    } finally {
      this.guardando = false;
    }
  }

  incrementarCantidad() {
    this.cantidad++;
  }

  decrementarCantidad() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.cerrarFormularioAgregar();
    }
  }

  editarItem(item: any) {
    this.mostrarFormularioEditar = true;
    this.itemEditar = item;
    this.cantidadEditar = item.cantidad || 1;
    this.notasEditar = item.notas || '';
    this.nombreEditar = item.productos?.nombre || '';
    this.categoriaEditar = item.productos?.categoria || '';
    this.origenEditar = item.productos?.origen || '';
    this.errorEditar = null;
    this.guardandoEditar = false;
  }

  cerrarFormularioEditar() {
    this.mostrarFormularioEditar = false;
    this.itemEditar = null;
  }

  incrementarCantidadEditar() {
    this.cantidadEditar++;
  }

  decrementarCantidadEditar() {
    if (this.cantidadEditar > 1) {
      this.cantidadEditar--;
    }
  }

  async guardarCambiosEditar() {
    if (!this.nombreEditar.trim()) {
      this.errorEditar = 'El nombre del producto es requerido';
      return;
    }
    try {
      this.guardandoEditar = true;
      this.errorEditar = null;
      // Actualizar producto (nombre, categoría, origen)
      await this.supabase.client
        .from('productos')
        .update({
          nombre: this.nombreEditar.trim(),
          categoria: this.categoriaEditar.trim() || null,
          origen: this.origenEditar.trim() || null
        })
        .eq('id', this.itemEditar.productos.id);
      // Actualizar cantidad
      await this.supabase.actualizarCantidadListaCompras(this.itemEditar.id, this.cantidadEditar);
      // Actualizar notas
      await this.supabase.actualizarNotasListaCompras(this.itemEditar.id, this.notasEditar);
      this.mostrarToast('Item actualizado');
      this.cerrarFormularioEditar();
      await this.cargarListaCompras();
    } catch (err: any) {
      this.errorEditar = err.message;
    } finally {
      this.guardandoEditar = false;
    }
  }

  async confirmarEliminarItem(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar producto',
      message: `¿Estás seguro de que quieres eliminar "${item.productos?.nombre}" de la lista?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.eliminarItem(item.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async eliminarItem(carritoId: string) {
    try {
      await this.supabase.eliminarDeListaCompras(carritoId);
      await this.cargarListaCompras();
      this.mostrarToast('Producto eliminado de la lista');
    } catch (err: any) {
      this.mostrarError(err.message);
    }
  }

  async comprarProducto(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Agregar producto a la despensa',
      message: `¿Quieres agregar "${item.productos?.nombre}" a la despensa? Ingresa la fecha de vencimiento del producto para mantener un mejor control de tu inventario.`,
      inputs: [
        {
          name: 'fechaVencimiento',
          type: 'date',
          placeholder: 'Fecha de vencimiento (opcional)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Agregar a Despensa',
          handler: async (data) => {
            try {
              await this.supabase.comprarProducto(item.id, data.fechaVencimiento);
              await this.cargarListaCompras();
              
              // Mensaje más detallado
              let mensaje = `✅ "${item.productos?.nombre}" agregado a la despensa`;
              if (data.fechaVencimiento) {
                mensaje += ` con fecha de vencimiento ${new Date(data.fechaVencimiento).toLocaleDateString()}`;
              } else if (item.productos?.categoria) {
                mensaje += ` con fecha de vencimiento automática según la categoría ${item.productos.categoria}`;
              }
              this.mostrarToast(mensaje);
            } catch (err: any) {
              this.mostrarError(err.message);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async confirmarLimpiarLista() {
    const alert = await this.alertCtrl.create({
      header: 'Limpiar lista',
      message: '¿Estás seguro de que quieres eliminar todos los productos de la lista de compras?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Limpiar',
          role: 'destructive',
          handler: async () => {
            await this.limpiarLista();
          }
        }
      ]
    });

    await alert.present();
  }

  async limpiarLista() {
    try {
      await this.supabase.limpiarListaCompras(this.despensaId);
      await this.cargarListaCompras();
      this.mostrarToast('Lista de compras limpiada');
    } catch (err: any) {
      this.mostrarError(err.message);
    }
  }

  async doRefresh(event: any) {
    await this.cargarListaCompras();
    event.target.complete();
  }

  navegarADespensa() {
    this.router.navigate(['/despensa', this.despensaId], {
      queryParams: { recargar: true }
    });
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  mostrarError(mensaje: string) {
    this.error = mensaje;
    setTimeout(() => {
      this.error = null;
    }, 5000);
  }

  getUsuarioQueAgrego(item: any): string {
    if (item.usuarios?.nombre) {
      return `Agregado por ${item.usuarios.nombre}`;
    }
    return 'Agregado por usuario';
  }

  getFechaFormateada(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getTotalCantidad(): number {
    return this.listaCompras.reduce((total, item) => total + item.cantidad, 0);
  }

  trackByFn(index: number, item: any): any {
    return item.id;
  }

  async abrirPopoverOpciones(ev: Event, item: any) {
    const popover = await this.popoverCtrl.create({
      component: PopoverOpcionesListaComprasComponent,
      event: ev,
      translucent: true,
      componentProps: { item }
    });
    popover.onDidDismiss().then(async (res) => {
      if (res.data === 'editar') {
        await this.editarItem(item);
      } else if (res.data === 'eliminar') {
        await this.confirmarEliminarItem(item);
      }
    });
    await popover.present();
  }

  async moverTodoADespensa() {
    if (!this.listaCompras.length) return;
    try {
      this.loading = true;
      // Fallback: mover uno por uno
      for (const item of this.listaCompras) {
        await this.supabase.comprarProducto(item.id);
      }
      await this.cargarListaCompras();
      
      // Mensaje más detallado
      const cantidad = this.listaCompras.length;
      this.mostrarToast(`✅ ${cantidad} producto${cantidad > 1 ? 's' : ''} agregado${cantidad > 1 ? 's' : ''} a la despensa con fechas de vencimiento automáticas según sus categorías`);
    } catch (err: any) {
      this.mostrarError('Error al mover todos los productos: ' + err.message);
    } finally {
      this.loading = false;
    }
  }

  // Funciones para los botones de la lista (con parámetro item)
  async incrementarCantidadItem(item: any) {
    try {
      item.cantidad++;
      await this.supabase.actualizarCantidadListaCompras(item.id, item.cantidad);
    } catch (err: any) {
      this.mostrarError(err.message);
    }
  }

  async decrementarCantidadItem(item: any) {
    if (item.cantidad <= 1) {
      await this.confirmarEliminarItem(item);
      return;
    }
    try {
      item.cantidad--;
      await this.supabase.actualizarCantidadListaCompras(item.id, item.cantidad);
    } catch (err: any) {
      this.mostrarError(err.message);
    }
  }
}
