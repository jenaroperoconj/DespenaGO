import { Component, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SupabaseService } from '../core/supabase.service';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  saveOutline,
  addOutline,
  removeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-editar-item-lista-modal',
  templateUrl: './editar-item-lista.modal.html',
  styleUrls: ['./editar-item-lista.modal.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class EditarItemListaModal {
  @Input() item!: any;

  cantidad: number = 1;
  notas: string = '';
  error: string | null = null;
  guardando = false;

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({
      closeOutline,
      saveOutline,
      addOutline,
      removeOutline
    });
  }

  ngOnInit() {
    if (this.item) {
      this.cantidad = this.item.cantidad || 1;
      this.notas = this.item.notas || '';
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }

  incrementarCantidad() {
    this.cantidad++;
  }

  decrementarCantidad() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  async guardarCambios() {
    try {
      this.guardando = true;
      this.error = null;

      // Actualizar cantidad
      await this.supabase.actualizarCantidadListaCompras(this.item.id, this.cantidad);
      
      // Actualizar notas
      await this.supabase.actualizarNotasListaCompras(this.item.id, this.notas);

      this.mostrarToast('Item actualizado');
      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.guardando = false;
    }
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
