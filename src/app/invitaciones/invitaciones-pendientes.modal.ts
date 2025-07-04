import { Component, OnInit } from '@angular/core';
import { ModalController, AlertController, ToastController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonLabel,
  IonChip,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  IonNote
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  closeOutline, 
  checkmarkOutline, 
  closeCircleOutline,
  mailOutline,
  timeOutline,
  personOutline,
  homeOutline,
  refreshOutline,
  alertCircleOutline,
  createOutline,
  eyeOutline
} from 'ionicons/icons';
import { SupabaseService } from '../core/supabase.service';

@Component({
  selector: 'app-invitaciones-pendientes',
  templateUrl: './invitaciones-pendientes.modal.html',
  styleUrls: ['./invitaciones-pendientes.modal.scss'],
  standalone: true,  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonLabel,
    IonChip,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonSpinner,
    IonNote
  ]
})
export class InvitacionesPendientesModal implements OnInit {
  invitaciones: any[] = [];
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {    addIcons({
      closeOutline,
      checkmarkOutline,
      closeCircleOutline,
      mailOutline,
      timeOutline,
      personOutline,
      homeOutline,
      refreshOutline,
      alertCircleOutline,
      createOutline,
      eyeOutline
    });
  }

  async ngOnInit() {
    await this.cargarInvitaciones();
  }  async cargarInvitaciones() {
    try {
      this.loading = true;
      this.error = null;
      
      console.log('📥 Cargando invitaciones pendientes...');
      const invitacionesRaw = await this.supabase.obtenerInvitacionesPendientes();
      
      // Log detallado para diagnosticar el problema
      console.log('🔍 Datos crudos de invitaciones:', JSON.stringify(invitacionesRaw, null, 2));
      
      // Normalizamos la estructura para garantizar que todas las invitaciones tengan las propiedades necesarias
      this.invitaciones = invitacionesRaw.map(inv => {
        // Crear una copia para no mutar el original
        const invNormalizada = { ...inv };
        
        // Mostrar la estructura de cada invitación para diagnóstico
        console.log('⚙️ Estructura de invitación individual:', Object.keys(invNormalizada).join(', '));
        
        // Para invitaciones de RPC, necesitamos mapear los campos diferentes
        if (!invNormalizada.id) {
          if (invNormalizada.invitacion_id) {
            invNormalizada.id = invNormalizada.invitacion_id;
          } else if (invNormalizada.despensa_id) {
            // En este caso puede que sea un objeto de RPC sin el campo id explícito
            // Usaremos la combinación de campos única como último recurso
            console.log('⚠️ La invitación no tiene un ID claro, se genera identificador desde campos disponibles');
          }
        }
        
        // Normalizar nombres de despensa
        if (!invNormalizada.despensa_nombre && invNormalizada.despensas?.nombre) {
          invNormalizada.despensa_nombre = invNormalizada.despensas.nombre;
        }
          // Asegurarse de que el propietario tenga nombre
        if (!invNormalizada.propietario_nombre) {
          if (invNormalizada.nombre_propietario) {
            invNormalizada.propietario_nombre = invNormalizada.nombre_propietario;
            console.log('✅ Asignando nombre_propietario desde RPC:', invNormalizada.propietario_nombre);
          } else if (invNormalizada.usuarios?.nombre) {
            invNormalizada.propietario_nombre = invNormalizada.usuarios.nombre;
            console.log('✅ Asignando nombre desde relación usuarios:', invNormalizada.propietario_nombre);
          } else if (invNormalizada.propietario_email) {
            // Si solo tenemos el email como fallback
            invNormalizada.propietario_nombre = invNormalizada.propietario_email.split('@')[0]; 
            console.log('✅ Generando nombre de propietario desde email:', invNormalizada.propietario_nombre);
          } else {
            invNormalizada.propietario_nombre = 'Usuario no disponible';
            console.log('❌ No se encontró nombre de propietario, usando valor por defecto');
          }
        }
        
        // Asegurarse de que el propietario tenga email
        if (!invNormalizada.propietario_email) {
          if (invNormalizada.usuarios?.email) {
            invNormalizada.propietario_email = invNormalizada.usuarios.email;
            console.log('✅ Asignando email desde relación usuarios:', invNormalizada.propietario_email);
          } else {
            invNormalizada.propietario_email = 'Email no disponible';
            console.log('❌ No se encontró email de propietario, usando valor por defecto');
          }
        }
        
        return invNormalizada;
      });
      
      console.log('✅ Invitaciones cargadas y normalizadas:', JSON.stringify(this.invitaciones, null, 2));
      } catch (err: any) {
      console.error('❌ Error cargando invitaciones:', err);
      this.error = `Error al cargar invitaciones: ${err.message || 'Error desconocido'}`;
    } finally {
      this.loading = false;
    }
  }

  async aceptarInvitacion(invitacion: any) {
    const alert = await this.alertCtrl.create({
      header: '✅ Aceptar Invitación',
      message: `
        ¿Aceptar la invitación para colaborar en "${invitacion.despensa_nombre || invitacion.despensas?.nombre}"?
        <br><br>
        ROL: ${this.getRoleLabel(invitacion.rol)}<br>
        DE: ${invitacion.propietario_nombre || invitacion.usuarios?.nombre}
      `,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: async () => {
            await this.procesarAceptacion(invitacion);
          }
        }
      ]
    });

    await alert.present();
  }  async procesarAceptacion(invitacion: any) {
    try {
      this.loading = true;
      
      // Mostrar la estructura completa de la invitación para diagnóstico
      console.log('🔍 Invitación a procesar:', JSON.stringify(invitacion, null, 2));
      
      // Verificar todos los campos disponibles para encontrar el ID
      console.log('🔑 Campos disponibles:', Object.keys(invitacion).join(', '));
      
      // Identificar el ID según los campos disponibles en el objeto
      let invitacionId;
      
      // Estrategia 1: Buscar directamente el ID
      if (invitacion.id && typeof invitacion.id === 'string') {
        invitacionId = invitacion.id;
        console.log('✅ Se encontró campo id directamente:', invitacionId);
      } 
      // Estrategia 2: Buscar por nombre alternativo invitacion_id
      else if (invitacion.invitacion_id && typeof invitacion.invitacion_id === 'string') {
        invitacionId = invitacion.invitacion_id;
        console.log('✅ Se encontró invitacion_id:', invitacionId);
      }
      // Estrategia 3: Buscar cualquier propiedad que contenga "id" y no sea despensa_id o propietario_id
      else if (typeof invitacion === 'object') {
        for (const key of Object.keys(invitacion)) {
          if (key.toLowerCase().includes('id') && 
              !['despensa_id', 'propietario_id', 'usuario_invitado_id'].includes(key) &&
              typeof invitacion[key] === 'string') {
            invitacionId = invitacion[key];
            console.log(`✅ Se encontró ID en campo alternativo (${key}):`, invitacionId);
            break;
          }
        }
      }
      
      // Si aún no tenemos el ID, verificar si es un UUID válido usando regexp
      if (invitacionId) {
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(invitacionId)) {
          console.warn('⚠️ El ID encontrado no parece ser un UUID válido:', invitacionId);
          invitacionId = null; // Resetear para buscar otra estrategia
        }
      }
      
      if (!invitacionId) {
        console.error('❌ No se encontró un ID válido en el objeto de invitación');
        throw new Error('No se pudo determinar el ID de la invitación');
      }
      
      console.log('✅ Aceptando invitación con ID:', invitacionId);
      
      const resultado = await this.supabase.aceptarInvitacion(invitacionId);
      
      if (resultado && resultado.success) {
        const toast = await this.toastCtrl.create({
          message: '🎉 ¡Invitación aceptada! Ya puedes acceder a la despensa.',
          duration: 4000,
          position: 'top',
          color: 'success'
        });
        await toast.present();

        // Recargar invitaciones para actualizar la lista
        await this.cargarInvitaciones();
        
      } else {
        throw new Error(resultado?.error || 'Error aceptando invitación');
      }
      
    } catch (err: any) {
      console.error('❌ Error aceptando invitación:', err);
      
      const toast = await this.toastCtrl.create({
        message: `❌ Error: ${err.message}`,
        duration: 4000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  async rechazarInvitacion(invitacion: any) {
    const alert = await this.alertCtrl.create({
      header: '❌ Rechazar Invitación',
      message: `
        ¿Rechazar la invitación para colaborar en "${invitacion.despensa_nombre || invitacion.despensas?.nombre}"?
        <br><br>
        Esta acción no se puede deshacer.
      `,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Rechazar',
          role: 'destructive',
          handler: async () => {
            await this.procesarRechazo(invitacion);
          }
        }
      ]
    });

    await alert.present();
  }
  async procesarRechazo(invitacion: any) {
    try {
      this.loading = true;
      
      // Aplicar la misma lógica de obtención de ID que en procesarAceptacion
      let invitacionId;
      
      // Estrategia 1: Buscar directamente el ID
      if (invitacion.id && typeof invitacion.id === 'string') {
        invitacionId = invitacion.id;
        console.log('✅ Se encontró campo id directamente:', invitacionId);
      } 
      // Estrategia 2: Buscar por nombre alternativo invitacion_id
      else if (invitacion.invitacion_id && typeof invitacion.invitacion_id === 'string') {
        invitacionId = invitacion.invitacion_id;
        console.log('✅ Se encontró invitacion_id:', invitacionId);
      }
      // Estrategia 3: Buscar cualquier propiedad que contenga "id" y no sea despensa_id o propietario_id
      else if (typeof invitacion === 'object') {
        for (const key of Object.keys(invitacion)) {
          if (key.toLowerCase().includes('id') && 
              !['despensa_id', 'propietario_id', 'usuario_invitado_id'].includes(key) &&
              typeof invitacion[key] === 'string') {
            invitacionId = invitacion[key];
            console.log(`✅ Se encontró ID en campo alternativo (${key}):`, invitacionId);
            break;
          }
        }
      }
      
      if (!invitacionId) {
        throw new Error('No se pudo determinar el ID de la invitación');
      }
      
      console.log('❌ Rechazando invitación con ID:', invitacionId);
      
      const resultado = await this.supabase.rechazarInvitacion(invitacionId);
      
      if (resultado && resultado.success) {
        const toast = await this.toastCtrl.create({
          message: 'Invitación rechazada',
          duration: 3000,
          position: 'top',
          color: 'medium'
        });
        await toast.present();

        // Recargar invitaciones para actualizar la lista
        await this.cargarInvitaciones();
        
      } else {
        throw new Error(resultado?.error || 'Error rechazando invitación');
      }
      
    } catch (err: any) {
      console.error('❌ Error rechazando invitación:', err);
      
      const toast = await this.toastCtrl.create({
        message: `❌ Error: ${err.message}`,
        duration: 4000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  getRoleColor(rol: string): string {
    switch (rol) {
      case 'editor':
        return 'primary';
      case 'viewer':
        return 'secondary';
      default:
        return 'medium';
    }
  }

  getRoleIcon(rol: string): string {
    switch (rol) {
      case 'editor':
        return 'create-outline';
      case 'viewer':
        return 'eye-outline';
      default:
        return 'person-outline';
    }
  }

  getRoleLabel(rol: string): string {
    switch (rol) {
      case 'editor':
        return 'Editor (puede agregar y editar productos)';
      case 'viewer':
        return 'Visor (solo puede ver productos)';
      default:
        return 'Usuario';
    }
  }

  formatearFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha no válida';
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
