import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonItem, 
  IonLabel, 
  IonAvatar, 
  IonList, 
  IonIcon, 
  IonButton, 
  IonCard, 
  IonCardContent, 
  IonCardHeader, 
  IonCardTitle, 
  IonInput, 
  IonSelect, 
  IonSelectOption, 
  IonToast,
  IonButtons,
  IonBackButton,
  ModalController,
  AlertController,
  IonSpinner
} from '@ionic/angular/standalone';
import { 
  personCircleOutline, 
  mailOutline, 
  callOutline, 
  locationOutline, 
  logOutOutline, 
  calendarOutline, 
  storefrontOutline, 
  cubeOutline, 
  timeOutline, 
  saveOutline,
  createOutline,
  cameraOutline,
  statsChartOutline,
  alertCircleOutline,
  shieldCheckmarkOutline,
  keyOutline,
  chevronForwardOutline, personOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { SupabaseService } from '../core/supabase.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonItem, 
    IonLabel, 
    IonAvatar, 
    IonList,
    IonIcon,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToast,
    IonButtons,
    IonBackButton,
    CommonModule, 
    FormsModule,
    IonSpinner
  ]
})
export class ProfilePage implements OnInit {
  userProfile = {
    name: '',
    email: '',
    telefono: '',
    pais: '',
    avatar: 'https://ionicframework.com/docs/img/demos/avatar.svg',
    created_at: '',
    stats: {
      totalDespensas: 0,
      totalProductos: 0,
      productosVencidos: 0,
      productosProximosVencer: 0
    }
  };
  loading = true;
  editando = false;
  paises = [
    'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 
    'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras', 
    'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Puerto Rico', 
    'República Dominicana', 'Uruguay', 'Venezuela'
  ];
  showToast = false;
  toastMessage = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private location: Location,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {
    addIcons({cameraOutline,calendarOutline,personOutline,mailOutline,callOutline,locationOutline,createOutline,saveOutline,shieldCheckmarkOutline,keyOutline,chevronForwardOutline,statsChartOutline,storefrontOutline,cubeOutline,timeOutline,alertCircleOutline,logOutOutline,personCircleOutline});
  }

  async ngOnInit() {
    await this.cargarDatosUsuario();
  }

  async cargarDatosUsuario() {
    try {
      const { data: { user } } = await this.supabaseService.getUser();
      if (user) {
        // Obtener estadísticas del usuario
        const stats = await this.supabaseService.obtenerEstadisticasUsuario();
        // Obtener perfil completo del usuario
        const perfil = await this.supabaseService.obtenerPerfilUsuario();
        // Obtener imagen de perfil
        const avatarUrl = await this.supabaseService.obtenerImagenPerfil();
        
        this.userProfile = {
          name: user.user_metadata?.['nombre'] || 'Usuario',
          email: user.email || '',
          telefono: perfil?.telefono || '',
          pais: perfil?.pais || '',
          avatar: avatarUrl || 'https://ionicframework.com/docs/img/demos/avatar.svg',
          created_at: user.created_at || '',
          stats: stats
        };
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    } finally {
      this.loading = false;
    }
  }

  async subirImagenPerfil(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastMessage = 'Por favor, selecciona una imagen válida';
      this.showToast = true;
      return;
    }

    try {
      this.loading = true;
      const avatarUrl = await this.supabaseService.subirImagenPerfil(file);
      this.userProfile.avatar = avatarUrl;
      this.toastMessage = 'Imagen de perfil actualizada correctamente';
      this.showToast = true;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      this.toastMessage = 'Error al subir la imagen';
      this.showToast = true;
    } finally {
      this.loading = false;
    }
  }

  async mostrarModalCambioContrasena() {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar Contraseña',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Contraseña actual'
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirmar nueva contraseña'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.newPassword !== data.confirmPassword) {
              this.toastMessage = 'Las contraseñas no coinciden';
              this.showToast = true;
              return;
            }

            try {
              await this.supabaseService.updatePassword(data.currentPassword, data.newPassword);
              this.toastMessage = 'Contraseña actualizada correctamente';
              this.showToast = true;
            } catch (error: any) {
              this.toastMessage = error.message || 'Error al actualizar la contraseña';
              this.showToast = true;
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async guardarCambios() {
    try {
      this.loading = true;
      // Actualizar perfil en Supabase
      await this.supabaseService.actualizarPerfilUsuario({
        telefono: this.userProfile.telefono,
        pais: this.userProfile.pais,
        nombre: this.userProfile.name
      });

      // Actualizar metadatos del usuario
      await this.supabaseService.updateUserMetadata({
        nombre: this.userProfile.name
      });

      await this.cargarDatosUsuario(); // Refresca los datos desde la base
      this.editando = false;
      this.toastMessage = 'Perfil actualizado correctamente';
      this.showToast = true;
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      this.toastMessage = 'Error al actualizar el perfil';
      this.showToast = true;
    } finally {
      this.loading = false;
    }
  }

  async cerrarSesion() {
    try {
      await this.supabaseService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  goBack() {
    this.location.back();
  }

  cancelarEdicion() {
    this.loading = true;
    this.cargarDatosUsuario().then(() => {
      this.editando = false;
      this.loading = false;
    });
  }
}
