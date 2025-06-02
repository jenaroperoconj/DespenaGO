import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupabaseService } from '../core/supabase.service';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  addOutline,
  searchOutline,
  cartOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-agregar-producto-lista-modal',
  templateUrl: './agregar-producto-lista.modal.html',
  styleUrls: ['./agregar-producto-lista.modal.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class AgregarProductoListaModal {
  @Input() despensaId!: string;

  // Tabs
  selectedTab = 'buscar'; // 'buscar' o 'nuevo'

  // Búsqueda de productos existentes
  busqueda = '';
  productosEncontrados: any[] = [];
  buscando = false;

  // Nuevo producto
  nuevoProducto = {
    nombre: '',
    categoria: '',
    origen: ''
  };

  // Datos comunes
  cantidad = 1;
  notas = '';
  error: string | null = null;
  guardando = false;

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      closeOutline,
      addOutline,
      searchOutline,
      cartOutline,
      checkmarkCircleOutline
    });
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }

  segmentChanged(event: any) {
    this.selectedTab = event.detail.value;
    this.limpiarFormulario();
  }

  async buscarProductos() {
    if (!this.busqueda.trim()) {
      this.productosEncontrados = [];
      return;
    }

    try {
      this.buscando = true;
      this.productosEncontrados = await this.supabase.buscarProductosParaLista(this.busqueda.trim());
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.buscando = false;
    }
  }

  async agregarProductoExistente(producto: any) {
    try {
      this.guardando = true;
      await this.supabase.agregarAListaCompras(
        this.despensaId,
        producto.id,
        this.cantidad,
        this.notas || undefined
      );
      
      this.mostrarToast(`${producto.nombre} agregado a la lista`);
      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.guardando = false;
    }
  }

  async crearYAgregarProducto() {
    if (!this.nuevoProducto.nombre.trim()) {
      this.error = 'El nombre del producto es requerido';
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
      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message;
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

  limpiarFormulario() {
    this.busqueda = '';
    this.productosEncontrados = [];
    this.nuevoProducto = {
      nombre: '',
      categoria: '',
      origen: ''
    };
    this.cantidad = 1;
    this.notas = '';
    this.error = null;
  }

  async mostrarToast(mensaje: string) {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }
}
