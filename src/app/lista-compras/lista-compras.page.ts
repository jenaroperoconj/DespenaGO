import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupabaseService } from '../core/supabase.service';
import { AgregarProductoListaModal } from './agregar-producto-lista.modal';
import { EditarItemListaModal } from './editar-item-lista.modal';
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
  addOutline
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
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
      addOutline
    });  }
  ngOnInit() {
    this.despensaId = this.route.snapshot.paramMap.get('id')!;
    this.cargarListaCompras();
    this.cargarNombreDespensa();
    this.verificarPermisos();
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

  async verificarPermisos() {
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

  async abrirModalAgregarProducto() {
    const modal = await this.modalCtrl.create({
      component: AgregarProductoListaModal,
      componentProps: {
        despensaId: this.despensaId
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      await this.cargarListaCompras();
      this.mostrarToast('Producto agregado a la lista');
    }
  }

  async editarItem(item: any) {
    const modal = await this.modalCtrl.create({
      component: EditarItemListaModal,
      componentProps: {
        item: item
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      await this.cargarListaCompras();
      this.mostrarToast('Item actualizado');
    }
  }

  async incrementarCantidad(item: any) {
    try {
      await this.supabase.actualizarCantidadListaCompras(item.id, item.cantidad + 1);
      await this.cargarListaCompras();
    } catch (err: any) {
      this.mostrarError(err.message);
    }
  }

  async decrementarCantidad(item: any) {
    if (item.cantidad <= 1) {
      await this.confirmarEliminarItem(item);
      return;
    }

    try {
      await this.supabase.actualizarCantidadListaCompras(item.id, item.cantidad - 1);
      await this.cargarListaCompras();
    } catch (err: any) {
      this.mostrarError(err.message);
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
      header: 'Comprar producto',
      message: `¿Quieres agregar "${item.productos?.nombre}" a la despensa?`,
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
              this.mostrarToast('Producto agregado a la despensa');
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
    this.router.navigate(['/detalle-despensa', this.despensaId]);
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
}
