import { Component, Input } from '@angular/core';
import { ModalController, AlertController, ToastController, LoadingController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonIcon, 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonInput, 
  IonSelect, 
  IonSelectOption,
  IonChip,
  IonCard,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  closeOutline, 
  personAddOutline, 
  shareOutline, 
  trashOutline, 
  createOutline, 
  personOutline,
  shieldOutline,
  eyeOutline,
  checkmarkCircleOutline, alertCircleOutline, peopleOutline, searchOutline, helpCircleOutline } from 'ionicons/icons';
import { SupabaseService } from '../core/supabase.service';

@Component({
  selector: 'app-compartir-despensa',
  templateUrl: './compartir-despensa.modal.html',
  standalone: true,
  imports: [    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonChip,
    IonCard,
    IonCardContent
  ]
})
export class CompartirDespensaModal {
  @Input() despensaId!: string;
  @Input() nombreDespensa!: string;
  emailInvitacion: string = '';
  rolSeleccionado: string = 'editor';
  colaboradores: any[] = [];
  loading: boolean = false;
  error: string | null = null;
  esPropietario: boolean = false;
  cambiosRealizados: boolean = false;

  constructor(
    private modalCtrl: ModalController,
    private supabase: SupabaseService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {
    addIcons({closeOutline,personAddOutline,searchOutline,shareOutline,helpCircleOutline,alertCircleOutline,peopleOutline,personOutline,createOutline,trashOutline,shieldOutline,eyeOutline,checkmarkCircleOutline});
  }

  async ngOnInit() {
    await this.cargarColaboradores();
    this.esPropietario = await this.supabase.esPropietarioDespensa(this.despensaId);
  }
  async cargarColaboradores() {
    try {
      this.loading = true;
      this.error = null;
      
      console.log('🔍 Cargando colaboradores para despensa:', this.despensaId);
      this.colaboradores = await this.supabase.obtenerColaboradoresDespensa(this.despensaId);
      
      console.log('✅ Colaboradores cargados:', this.colaboradores);
      
    } catch (err: any) {
      console.error('❌ Error cargando colaboradores:', err);
      this.error = `Error al cargar colaboradores: ${err.message || 'Error desconocido'}`;
      this.colaboradores = []; // Asegurar que la lista esté vacía en caso de error
    } finally {
      this.loading = false;
    }
  }  async invitarColaborador() {
    if (!this.emailInvitacion.trim()) {
      this.error = 'Ingresa un correo electrónico';
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.emailInvitacion)) {
      this.error = 'Ingresa un correo electrónico válido';
      return;
    }

    try {
      this.loading = true;
      this.error = null;

      console.log('📨 Creando invitación para:', {
        email: this.emailInvitacion.trim(),
        rol: this.rolSeleccionado,
        despensaId: this.despensaId
      });

      // Crear invitación en la app (sin envío de email)
      await this.supabase.crearInvitacionColaborador(
        this.despensaId,
        this.emailInvitacion.trim(),
        this.rolSeleccionado,
        `Te han invitado a colaborar en "${this.nombreDespensa}" como ${this.rolSeleccionado}`
      );

      // Mostrar mensaje de éxito
      const toast = await this.toastCtrl.create({
        message: '✅ Invitación enviada exitosamente. El usuario la verá cuando se loguee en la app.',
        duration: 4000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

      // Marcar que se realizaron cambios
      this.cambiosRealizados = true;

      // Limpiar formulario y recargar colaboradores
      this.emailInvitacion = '';
      this.rolSeleccionado = 'editor';
      await this.cargarColaboradores();

    } catch (err: any) {
      console.error('Error creando invitación:', err);
      
      // Manejar diferentes tipos de errores
      if (err.message.includes('Ya existe una invitación pendiente')) {
        this.error = '⚠️ Ya existe una invitación pendiente para este usuario';
      } else if (err.message.includes('Solo el propietario')) {
        this.error = '❌ Solo el propietario puede enviar invitaciones';
      } else if (err.message.includes('no autenticado')) {
        this.error = '❌ Debes estar autenticado para enviar invitaciones';
      } else {
        this.error = `❌ Error enviando invitación: ${err.message}`;
      }

      // Mostrar toast de error
      const toast = await this.toastCtrl.create({
        message: this.error,
        duration: 4000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();

    } finally {
      this.loading = false;
    }
  }
  async verificarUsuario() {
    if (!this.emailInvitacion.trim()) {
      this.error = 'Ingresa un correo electrónico para verificar';
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.emailInvitacion)) {
      this.error = 'Ingresa un correo electrónico válido';
      return;
    }

    try {
      this.loading = true;
      this.error = null;

      console.log('🔍 Verificando usuario:', this.emailInvitacion.trim());

      // Usar el método de verificación completa
      const usuario = await this.supabase.buscarUsuarioConVerificacion(this.emailInvitacion.trim());

      // Manejar caso especial de RLS
      if (usuario.rls_blocked) {
        const alert = await this.alertCtrl.create({
          header: '🔒 Políticas de Seguridad Activas',
          message: `
            <strong>No se puede verificar directamente el usuario debido a las políticas de seguridad de la base de datos.</strong>
            <br><br>
            <strong>Esto significa:</strong><br>
            • Las políticas RLS están activas (esto es normal)<br>
            • El usuario debe estar registrado en DespensaGO<br>
            • La invitación se enviará al correo especificado<br>
            <br>
            <strong>Email a invitar:</strong> ${this.emailInvitacion.trim()}
          `,
          buttons: [
            {
              text: 'Entender',
              handler: () => {
                // Mostrar mensaje informativo adicional
                this.error = null;
              }
            },
            {
              text: 'Continuar invitando',
              handler: () => {
                this.invitarColaborador();
              }
            }
          ]
        });
        await alert.present();
        return;
      }

      // Si llegamos aquí, el usuario existe y fue encontrado
      const toast = await this.toastCtrl.create({
        message: `✅ Usuario encontrado: ${usuario.nombre} (${usuario.email})`,
        duration: 4000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

      console.log('✅ Usuario verificado exitosamente:', usuario);

    } catch (err: any) {
      console.error('❌ Error en verificación:', err);
      
      // Manejar diferentes tipos de errores
      if (err.message.includes('políticas de seguridad') || err.message.includes('RLS')) {
        this.error = '🔒 Las políticas de seguridad impiden la verificación directa. El usuario debe estar registrado en la app.';
      } else if (err.message.includes('no está registrado')) {
        this.error = `❌ El usuario ${this.emailInvitacion.trim()} no está registrado en DespensaGO.`;
      } else {
        this.error = err.message;
      }
      
      // Mostrar toast de error también
      const toast = await this.toastCtrl.create({
        message: `❌ ${this.error}`,
        duration: 5000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading = false;
    }
  }

  async confirmarEliminarColaborador(colaborador: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar colaborador',
      message: `¿Estás seguro de eliminar a ${colaborador.usuarios.nombre} de la despensa?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.eliminarColaborador(colaborador.usuarios.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async eliminarColaborador(usuarioId: string) {
    try {
      this.loading = true;
      await this.supabase.eliminarColaboradorDespensa(this.despensaId, usuarioId);
      
      const toast = await this.toastCtrl.create({
        message: 'Colaborador eliminado exitosamente',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

      await this.cargarColaboradores();
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async cambiarRolColaborador(colaborador: any) {
    const alert = await this.alertCtrl.create({
      header: 'Cambiar rol',
      message: `Cambiar el rol de ${colaborador.usuarios.nombre}`,
      inputs: [
        {
          name: 'rol',
          type: 'radio',
          label: 'Editor (puede agregar, editar y eliminar productos)',
          value: 'editor',
          checked: colaborador.rol === 'editor'
        },
        {
          name: 'rol',
          type: 'radio',
          label: 'Visor (solo puede ver productos)',
          value: 'viewer',
          checked: colaborador.rol === 'viewer'
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data !== colaborador.rol) {
              await this.actualizarRol(colaborador.usuarios.id, data);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async actualizarRol(usuarioId: string, nuevoRol: string) {
    try {
      this.loading = true;
      await this.supabase.actualizarRolColaborador(this.despensaId, usuarioId, nuevoRol);
      
      const toast = await this.toastCtrl.create({
        message: 'Rol actualizado exitosamente',
        duration: 2000,
        position: 'top',
        color: 'success'
      });
      await toast.present();

      await this.cargarColaboradores();
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async ejecutarDiagnostico() {
    console.log('🔧 Ejecutando diagnóstico de problemas...');
    
    const loading = await this.loadingCtrl.create({
      message: 'Ejecutando diagnóstico...',
      duration: 10000
    });
    await loading.present();

    try {
      const resultados = await this.supabase.diagnosticarConectividadRLS();
      
      let mensaje = '<strong>📊 Resultados del diagnóstico:</strong><br><br>';
      
      if (resultados.auth) {
        mensaje += '✅ Autenticación: OK<br>';
      } else {
        mensaje += '❌ Autenticación: Error<br>';
      }
      
      if (resultados.tablaUsuarios) {
        mensaje += '✅ Tabla usuarios: Accesible<br>';
      } else {
        mensaje += '❌ Tabla usuarios: Bloqueada por RLS<br>';
      }
      
      if (resultados.tablaAccesos) {
        mensaje += '✅ Tabla accesos: Accesible<br>';
      } else {
        mensaje += '❌ Tabla accesos: Bloqueada por RLS<br>';
      }
      
      if (resultados.funcionesRPC) {
        mensaje += '✅ Funciones RPC: Disponibles<br>';
      } else {
        mensaje += '❌ Funciones RPC: No desplegadas<br>';
      }
      
      if (resultados.rlsActivo) {
        mensaje += '<br><strong>🔒 Las políticas RLS están activas</strong><br>';
        mensaje += '💡 Esto es normal para seguridad<br>';
      }
        if (resultados.errores.length > 0) {
        mensaje += '<br><strong>⚠️ Errores detectados:</strong><br>';
        resultados.errores.forEach((error: string) => {
          mensaje += `• ${error}<br>`;
        });
      }
      
      mensaje += '<br><strong>🔧 Soluciones recomendadas:</strong><br>';
      
      if (!resultados.funcionesRPC) {
        mensaje += '• Desplegar funciones SQL en Supabase<br>';
      }
      
      if (resultados.rlsActivo) {
        mensaje += '• Las políticas RLS requieren funciones especiales<br>';
        mensaje += '• Verificar que el usuario esté registrado<br>';
      }

      await loading.dismiss();

      const alert = await this.alertCtrl.create({
        header: '🔧 Diagnóstico del Sistema',
        message: mensaje,
        buttons: [
          {
            text: 'Entendido',
            role: 'cancel'
          },
          {
            text: 'Copiar al portapapeles',
            handler: () => {
              // Intentar copiar al portapapeles
              const textoLimpio = mensaje.replace(/<[^>]*>/g, '').replace(/&[^;]*;/g, '');
              navigator.clipboard?.writeText(textoLimpio).then(() => {
                this.mostrarToast('📋 Diagnóstico copiado al portapapeles');
              });
            }
          }
        ]
      });
      
      await alert.present();
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('Error en diagnóstico:', error);
      
      const alert = await this.alertCtrl.create({
        header: '❌ Error en Diagnóstico',
        message: `No se pudo ejecutar el diagnóstico: ${error.message}`,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  private async mostrarToast(mensaje: string, color: string = 'success') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  getRoleColor(rol: string): string {
    switch (rol) {
      case 'propietario':
        return 'primary';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'medium';
      default:
        return 'medium';
    }
  }

  getRoleIcon(rol: string): string {
    switch (rol) {
      case 'propietario':
        return 'shield-outline';
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
      case 'propietario':
        return 'Propietario';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Visor';
      default:
        return 'Usuario';
    }
  }
  dismiss() {
    this.modalCtrl.dismiss({ changed: this.cambiosRealizados });
  }
}
