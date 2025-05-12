import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonList,
  IonListHeader,
  IonPopover,
  IonIcon
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { CrearDespensaModal } from './crear-despensa.modal';
import { EditarDespensaModal } from './editar-despensa.modal';
import { ModalController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-despensa',
  templateUrl: './despensa.page.html',
  styleUrls: ['./despensa.page.scss'],
  providers: [ModalController],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonItem,
    IonLabel,
    IonButton,
    IonList,
    IonListHeader,
    IonIcon,
    IonPopover 
  ]
})
export class DespensaPage implements OnInit {
  nombre: string = '';
  error: string | null = null;
  success: boolean = false;
  despensas: any[] = [];

  constructor(private supabaseService: SupabaseService, private router: Router, private modalCtrl: ModalController, private alertCtrl: AlertController) {}

  async abrirModalCrearDespensa() {
    const modal = await this.modalCtrl.create({
      component: CrearDespensaModal,
    });

    modal.onDidDismiss().then((result) => {
      if (result.data === true) {
        this.cargarDespensas();
      }
    });

    await modal.present();
  }
  async crearDespensa() {
    try {
      await this.supabaseService.crearDespensa(this.nombre);
      this.success = true;
      this.error = null;
      this.nombre = '';
    } catch (err: any) {
      this.error = err.message || 'Error al crear despensa';
    }
  }

  async cargarDespensas() {
    try {
      this.despensas = await this.supabaseService.obtenerDespensasUsuario();
    } catch (err: any) {
      this.error = err.message;
    }
  }
  ngOnInit() {
    this.cargarDespensas();
  }
  irADespensa(id: string) {
    this.router.navigate(['/despensa', id]);
  }

  async editarDespensa(item: any) {
    const modal = await this.modalCtrl.create({
      component: EditarDespensaModal,
      componentProps: {
        despensaId: item.despensas.id,
        nombre: item.despensas.nombre
      }
    });

    modal.onDidDismiss().then((res) => {
      if (res.data === true) this.cargarDespensas();
    });

    await modal.present();
  }

  async confirmarEliminar(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar despensa',
      message: `¿Estás seguro de eliminar la despensa "${item.despensas.nombre}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.supabaseService.eliminarDespensa(item.despensas.id);
              await this.cargarDespensas();
            } catch (err: any) {
              console.error('Error al eliminar despensa:', err.message);
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
