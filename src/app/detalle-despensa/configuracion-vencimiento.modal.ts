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
  IonInput,
  IonList,
  IonIcon,
  IonNote,
  IonChip
} from '@ionic/angular/standalone';
import { SupabaseService, ConfiguracionVencimiento } from 'src/app/core/supabase.service';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  closeOutline,
  saveOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-configuracion-vencimiento-modal',
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
    IonInput,
    IonList,
    IonIcon,
    IonNote,
    IonChip
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <ion-icon name="settings-outline"></ion-icon>
          Configuración de Vencimiento
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div style="margin-bottom: 16px; color: #666; display: flex; align-items: center;">
        <ion-icon name="information-circle-outline" style="margin-right: 8px;"></ion-icon>
        <span>
          Aquí puedes definir cuántos días de vencimiento se asignan automáticamente a cada categoría si no ingresas una fecha al agregar un producto.
        </span>
      </div>
      <ion-list>
        <ion-item *ngFor="let config of configuraciones; let i = index">
          <ion-label>{{ config.categoria }}</ion-label>
          <ion-input
            type="number"
            [(ngModel)]="config.dias_vencimiento"
            min="1"
            [ngClass]="{'input-error': config.dias_vencimiento < 1 || !config.dias_vencimiento}"
            placeholder="Días"
            style="max-width: 90px; margin-left: 12px;">
          </ion-input>
          <ion-note slot="end" color="danger" *ngIf="config.dias_vencimiento < 1 || !config.dias_vencimiento">
            Ingrese un valor válido
          </ion-note>
        </ion-item>
      </ion-list>

      <ion-button expand="block" (click)="guardar()" class="ion-margin-top" [disabled]="!formValido()">
        <ion-icon name="save-outline" slot="start"></ion-icon>
        Guardar Configuración
      </ion-button>

      <ion-chip *ngIf="mensaje" [color]="mensajeColor" style="margin-top: 12px;">
        <ion-icon [name]="mensajeIcono" slot="start"></ion-icon>
        {{ mensaje }}
      </ion-chip>
    </ion-content>
  `,
  styles: [`
    .input-error {
      border: 1px solid #eb445a;
      border-radius: 4px;
    }
  `]
})
export class ConfiguracionVencimientoModal {
  @Input() despensaId!: string;
  configuraciones: ConfiguracionVencimiento[] = [];
  mensaje: string = '';
  mensajeColor: string = 'success';
  mensajeIcono: string = 'checkmark-circle-outline';

  categoriasDisponibles: string[] = [
    'Bebestible', 'Infusión', 'Verdura', 'Fruta', 'Carne', 'Lácteo', 'Embutido',
    'Aceites y Grasas', 'Pastas y Arroces', 'Masas y Premezclas',
    'Snack', 'Enlatado', 'Congelado', 'Panadería', 'Condimento', 'Otro'
  ];

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService
  ) {
    addIcons({
      settingsOutline,
      closeOutline,
      saveOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      informationCircleOutline
    });
  }

  async ngOnInit() {
    const existentes = await this.supabase.obtenerConfiguracionVencimiento(this.despensaId);
    // Asegura que todas las categorías estén presentes
    this.configuraciones = this.categoriasDisponibles.map(cat => {
      const existente = existentes.find(e => e.categoria === cat);
      return {
        categoria: cat,
        dias_vencimiento: existente ? existente.dias_vencimiento : 30
      };
    });
  }

  formValido() {
    return this.configuraciones.every(c => c.dias_vencimiento && c.dias_vencimiento > 0);
  }

  async guardar() {
    if (!this.formValido()) {
      this.mensaje = 'Por favor, revisa los valores ingresados.';
      this.mensajeColor = 'danger';
      this.mensajeIcono = 'alert-circle-outline';
      return;
    }
    try {
      await this.supabase.guardarConfiguracionVencimiento(this.despensaId, this.configuraciones);
      this.mensaje = 'Configuración guardada correctamente';
      this.mensajeColor = 'success';
      this.mensajeIcono = 'checkmark-circle-outline';
      setTimeout(() => this.dismiss(true), 1000);
    } catch (error) {
      this.mensaje = 'Error al guardar configuración';
      this.mensajeColor = 'danger';
      this.mensajeIcono = 'alert-circle-outline';
    }
  }

  dismiss(success = false) {
    this.modalCtrl.dismiss(success);
  }
} 