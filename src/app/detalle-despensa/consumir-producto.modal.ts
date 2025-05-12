import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
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
  standalone: true,
  selector: 'app-consumir-producto-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Consumir Producto</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">✖</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="floating">Cantidad consumida</ion-label>
        <ion-input type="number" [(ngModel)]="cantidad"></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="confirmarConsumo()">Consumir</ion-button>
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
    IonButtons,
    IonButton,
    IonItem,
    IonLabel,
    IonInput
  ]
})
export class ConsumirProductoModal {
  @Input() producto: any;
  cantidad: number = 1;
  error: string | null = null;

  constructor(private modalCtrl: ModalController, private supabase: SupabaseService) {}

  async confirmarConsumo() {
    if (this.cantidad <= 0 || isNaN(this.cantidad)) {
      this.error = 'Cantidad no válida';
      return;
    }

    if (this.cantidad >= this.producto.stock) {
      await this.supabase.eliminarProductoDeDespensa(this.producto.id);
    } else {
      const nuevoStock = this.producto.stock - this.cantidad;
      const { error } = await this.supabase.client
        .from('producto_despensa')
        .update({ stock: nuevoStock })
        .eq('id', this.producto.id);

      if (error) {
        this.error = error.message;
        return;
      }
    }

    this.dismiss(true);
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
}
