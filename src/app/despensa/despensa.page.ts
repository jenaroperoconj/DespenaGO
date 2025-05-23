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
  IonIcon,
  IonCardContent,
  IonCardTitle,
  IonCardHeader,
  IonCard,
  IonInput,
  IonContent,
  IonTitle,
  IonToolbar,
  IonHeader,
  PopoverController
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
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
    IonPopover,
    IonCardContent,
    IonCardTitle,
    IonCardHeader,
    IonCard,
    IonInput,
    IonContent,
    IonTitle,
    IonToolbar,
    IonHeader
  ]
})
export class DespensaPage implements OnInit {
  nombre: string = '';
  error: string | null = null;
  success: boolean = false;
  despensas: any[] = [];
  mostrarFormularioCrear: boolean = false;
  mostrarFormularioEditar: boolean = false;
  nombreEditar: string = '';
  despensaIdEditar: string = '';

  constructor(
    private supabaseService: SupabaseService, 
    private router: Router, 
    private modalCtrl: ModalController, 
    private alertCtrl: AlertController, 
    private popoverCtrl: PopoverController
  ) {}

  async crearDespensa() {
    try {
      await this.supabaseService.crearDespensa(this.nombre);
      this.success = true;
      this.error = null;
      this.nombre = '';
      this.mostrarFormularioCrear = false;
      await this.cargarDespensas();
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

  async onPopoverAccion(accion: 'editar' | 'eliminar', item: any) {
    await this.popoverCtrl.dismiss();

    // Espera un frame más del DOM para asegurar estabilidad
    requestAnimationFrame(() => {
      if (accion === 'editar') {
        this.editarDespensa(item);
      } else if (accion === 'eliminar') {
        this.confirmarEliminar(item);
      }
    });
  }
  
  ngOnInit() {
    this.cargarDespensas();
  }

  irADespensa(id: string) {
    this.router.navigate(['/despensa', id]);
  }

  editarDespensa(item: any) {
    this.mostrarFormularioEditar = true;
    this.nombreEditar = item.despensas.nombre;
    this.despensaIdEditar = item.despensas.id;
  }

  async guardarCambiosEditar() {
    try {
      await this.supabaseService.editarDespensa(this.despensaIdEditar, {
        nombre: this.nombreEditar
      });
      this.mostrarFormularioEditar = false;
      this.nombreEditar = '';
      this.despensaIdEditar = '';
      await this.cargarDespensas();
    } catch (err: any) {
      this.error = err.message || 'Error al editar despensa';
    }
  }

  async confirmarEliminar(item: any) {
    // Asegura cierre del popover
    try {
      await this.popoverCtrl.dismiss();
    } catch (e) {
      // Ignorar si ya estaba cerrado
    }

    // Delay breve para asegurar cierre completo del popover
    setTimeout(async () => {
      const alert = await this.alertCtrl.create({
        header: 'Eliminar despensa',
        message: `¿Estás seguro de eliminar la despensa "${item.despensas.nombre}"? Esta acción no se puede deshacer.`,
        buttons: [
          { text: 'Cancelar', role: 'cancel' },
          {
            text: 'Eliminar',
            role: 'destructive',
            handler: async () => {
              try {
                await this.supabaseService.eliminarDespensa(item.despensas.id);
                await this.cargarDespensas();
              } catch (err: any) {
                console.error('Error al eliminar despensa:', err.message);
                this.error = 'No se pudo eliminar la despensa. Verifica que no tenga productos asociados.';
              }
            }
          }
        ]
      });

      await alert.present();
    }, 300);
    
  }
}
