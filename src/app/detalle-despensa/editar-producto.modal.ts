//UNUSED

import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SupabaseService } from 'src/app/core/supabase.service';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonButtons
} from '@ionic/angular/standalone';

@Component({
  standalone: true,
  selector: 'app-editar-producto-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Editar Producto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">✖</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="floating">Nombre</ion-label>
        <ion-input [(ngModel)]="producto.productos.nombre"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Categoría</ion-label>
        <ion-input [(ngModel)]="producto.productos.categoria"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Origen</ion-label>
        <ion-input [(ngModel)]="producto.productos.origen"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Fecha vencimiento</ion-label>
        <ion-input type="date" [(ngModel)]="producto.fecha_vencimiento"></ion-input>
      </ion-item>

      <ion-item>
        <ion-label position="floating">Stock</ion-label>
        <ion-input type="number" [(ngModel)]="producto.stock"></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="guardarCambios()">Guardar</ion-button>
      <p *ngIf="error" style="color: red;">{{ error }}</p>
    </ion-content>
  `,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonButtons
  ]
})
export class EditarProductoModal {
  @Input() producto!: any;
  error: string | null = null;

  constructor(private modalCtrl: ModalController, private supabase: SupabaseService) {}

  async guardarCambios() {
    try {
      // Actualiza tabla producto_despensa
      const { error: errorDespensa } = await this.supabase.client
        .from('producto_despensa')
        .update({
          fecha_vencimiento: this.producto.fecha_vencimiento,
          stock: this.producto.stock
        })
        .eq('id', this.producto.id);

      if (errorDespensa) throw errorDespensa;

      // Actualiza tabla productos
      const { error: errorProducto } = await this.supabase.client
        .from('productos')
        .update({
          nombre: this.producto.productos.nombre,
          categoria: this.producto.productos.categoria,
          origen: this.producto.productos.origen
        })
        .eq('id', this.producto.productos.id);

      if (errorProducto) throw errorProducto;

      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
}
