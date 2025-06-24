//UNUSED

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController} from '@ionic/angular';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonItem,
  IonLabel,
  IonInput
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';

@Component({
  selector: 'app-agregar-producto-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonItem,
    IonLabel,
    IonInput
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Agregar Producto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">✖</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="floating">Nombre</ion-label>
        <ion-input [(ngModel)]="producto.nombre" required></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="floating">Categoría</ion-label>
        <ion-input [(ngModel)]="producto.categoria"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="floating">Marca</ion-label>
        <ion-input [(ngModel)]="producto.origen"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="floating">Fecha de Vencimiento</ion-label>
        <ion-input [(ngModel)]="producto.fecha_vencimiento" type="date"></ion-input>
      </ion-item>
      <ion-item>
        <ion-label position="floating">Stock</ion-label>
        <ion-input [(ngModel)]="producto.stock" type="number" min="1"></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="agregar()">Agregar Producto</ion-button>

      <p *ngIf="success" style="color:green;">✅ Producto agregado</p>
      <p *ngIf="error" style="color:red;">{{ error }}</p>
    </ion-content>
  `
})
export class AgregarProductoModal {
  @Input() despensaId!: string;

  producto = {
    nombre: '',
    categoria: '',
    origen: '',
    fecha_vencimiento: '',
    stock: 1
  };

  success = false;
  error: string | null = null;

  constructor(private supabase: SupabaseService, private modalCtrl: ModalController) {}

  async agregar() {
    try {
      await this.supabase.agregarProductoADespensa(this.despensaId, this.producto);
      this.success = true;
      setTimeout(() => this.dismiss(true), 800);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
}
