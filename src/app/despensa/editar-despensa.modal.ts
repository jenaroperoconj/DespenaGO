import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { ModalController } from '@ionic/angular';
import { SupabaseService } from 'src/app/core/supabase.service';

@Component({
  selector: 'app-editar-despensa-modal',
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
        <ion-title>Editar Despensa</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">✖</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="floating">Nombre de la Despensa</ion-label>
        <ion-input [(ngModel)]="nombre"></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="guardarCambios()">Guardar Cambios</ion-button>
      <p *ngIf="error" style="color: red;">{{ error }}</p>
    </ion-content>
  `
})
export class EditarDespensaModal {
  @Input() despensaId!: string;
  @Input() nombre!: string;

  error: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService
  ) {}

  async guardarCambios() {
    try {
      await this.supabase.editarDespensa(this.despensaId, { nombre: this.nombre });
      this.dismiss(true);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
}
