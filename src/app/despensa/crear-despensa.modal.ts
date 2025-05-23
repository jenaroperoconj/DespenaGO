// UNUSED FILE

import { Component, Input } from '@angular/core';
import { ModalController} from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from 'src/app/core/supabase.service';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonInput, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonButtons
} from '@ionic/angular/standalone';

@Component({
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule, 
    FormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonInput, 
    IonItem, 
    IonLabel, 
    IonButton, 
    IonButtons,
],
  selector: 'app-crear-despensa-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Crear Despensa</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">✖</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-item>
        <ion-label position="floating">Nombre</ion-label>
        <ion-input [(ngModel)]="nombre" required></ion-input>
      </ion-item>

      <ion-button expand="block" (click)="crear()">Crear</ion-button>

      <p *ngIf="success" style="color:green;">Creada correctamente ✅</p>
      <p *ngIf="error" style="color:red;">{{ error }}</p>
    </ion-content>
  `
})
export class CrearDespensaModal {
  nombre: string = '';
  success = false;
  error: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private modalCtrl: ModalController
  ) {}

  async crear() {
    try {
      await this.supabaseService.crearDespensa(this.nombre);
      this.success = true;
      this.error = null;
      setTimeout(() => this.dismiss(true), 800);
    } catch (err: any) {
      this.error = err.message;
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
}
