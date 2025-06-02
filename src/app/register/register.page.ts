import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from 'src/app/core/supabase.service';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonChip,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { leafOutline, alertCircleOutline, checkmarkCircleOutline, mailOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonChip
  ]
})
export class RegisterPage {

  nombre = '';
  email = '';
  password = '';
  confirmPassword = '';
  error: string | null = null;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;  constructor(
    private supabaseService: SupabaseService, 
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ leafOutline, alertCircleOutline, checkmarkCircleOutline, mailOutline, eyeOutline, eyeOffOutline });
  }
  async registrarse() {
    if (!this.nombre.trim() || !this.email.trim() || !this.password.trim() || !this.confirmPassword.trim()) {
      await this.mostrarError('Todos los campos son obligatorios');
      return;
    }

    // Validar que las contraseñas coincidan
    if (this.password !== this.confirmPassword) {
      await this.mostrarError('Las contraseñas no coinciden');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      await this.mostrarError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    if (this.password.length < 6) {
      await this.mostrarError('La contraseña debe tener al menos 6 caracteres');
      return;
    }this.isLoading = true;
    this.error = null;    try {
      const result = await this.supabaseService.signUp(this.email, this.password, this.nombre);
      
      // Verificar si el usuario necesita confirmación
      if (result.user && !result.user.email_confirmed_at) {
        // Usuario creado pero necesita confirmación por email
        await this.mostrarToastExito();
        await this.mostrarMensajeVerificacionConOpciones();
      } else if (result.user && result.user.email_confirmed_at) {
        // Usuario ya confirmado (esto podría pasar en desarrollo)
        await this.mostrarToastExito();
        await this.mostrarMensajeUsuarioConfirmado();
      } else {
        // Caso fallback
        await this.mostrarToastExito();
        await this.mostrarMensajeVerificacion();
      }
      
      // Limpiar formulario
      this.nombre = '';
      this.email = '';
      this.password = '';
      this.confirmPassword = '';
      
    }catch (err: any) {
      console.error('Error en registro:', err);
      
      if (err.message?.includes('already registered') || err.message?.includes('already been registered')) {
        await this.mostrarError('Este correo electrónico ya está registrado. ¿Deseas iniciar sesión?');
      } else if (err.message?.includes('Invalid email')) {
        await this.mostrarError('El formato del correo electrónico no es válido');
      } else if (err.message?.includes('Password should be at least')) {
        await this.mostrarError('La contraseña debe tener al menos 6 caracteres');
      } else {
        await this.mostrarError('Error al crear la cuenta. Por favor, inténtalo de nuevo');
      }
    } finally {
      this.isLoading = false;
    }
  }  private async mostrarMensajeVerificacion() {
    const alert = await this.alertController.create({
      header: '¡Cuenta creada exitosamente!',
      message: `Te hemos enviado un correo de verificación a:

${this.email}

Por favor, revisa tu bandeja de entrada y haz clic en el enlace de verificación para activar tu cuenta.

Una vez verificado tu correo, podrás iniciar sesión.`,
      buttons: [
        {
          text: 'Entendido',
          role: 'confirm',
          handler: () => {
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }
  private async mostrarMensajeVerificacionConOpciones() {
    const alert = await this.alertController.create({
      header: '¡Cuenta creada exitosamente!',
      message: `Te hemos enviado un correo de verificación a:

${this.email}

IMPORTANTE: Revisa tu carpeta de SPAM/CORREO NO DESEADO si no encuentras el correo.

⏰ Los correos pueden tardar hasta 15 minutos en llegar.

¿Qué hacer si no llega el correo?`,
      buttons: [
        {
          text: 'Reenviar correo',
          handler: async () => {
            await this.reenviarCorreoVerificacion();
          }
        },
        {
          text: 'Ver soluciones',
          handler: () => this.mostrarSolucionesCorreo()
        },
        {
          text: 'Ir a login',
          role: 'confirm',
          handler: () => {
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }

  private async mostrarMensajeUsuarioConfirmado() {
    const alert = await this.alertController.create({
      header: '¡Cuenta creada y verificada!',
      message: `Tu cuenta ha sido creada exitosamente y ya está verificada.

Puedes iniciar sesión inmediatamente.`,
      buttons: [
        {
          text: 'Ir a login',
          role: 'confirm',
          handler: () => {
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }
  private async reenviarCorreoVerificacion() {
    try {
      await this.supabaseService.resendConfirmation(this.email);
      
      const toast = await this.toastController.create({
        message: '📧 Correo de verificación reenviado exitosamente',
        duration: 4000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
      
    } catch (err: any) {
      console.error('Error al reenviar correo:', err);
      
      let mensaje = 'Error al reenviar el correo. Inténtalo más tarde.';
      
      if (err.message?.includes('security purposes')) {
        mensaje = 'Por seguridad, debes esperar antes de solicitar otro correo de verificación.';
      } else if (err.message?.includes('Invalid email')) {
        mensaje = 'El correo electrónico no es válido.';
      }
      
      await this.mostrarError(mensaje);
    }
  }

  private async mostrarToastExito() {
    const toast = await this.toastController.create({
      message: '✅ Cuenta creada exitosamente',
      duration: 3000,
      position: 'top',
      color: 'success'
    });

    await toast.present();
  }

  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['OK']
    });

    await alert.present();
  }
  goToLogin() {
    this.router.navigate(['/login']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  private async mostrarSolucionesCorreo() {
    const alert = await this.alertController.create({
      header: '🔧 Soluciones para correos que no llegan',
      message: `Si no recibes el correo de verificación, prueba estas soluciones:

1. 📧 Revisa la carpeta de SPAM/CORREO NO DESEADO
2. ⏰ Espera hasta 15 minutos (los correos pueden tardar)
3. 🔄 Usa "Reenviar correo" (máximo cada 60 segundos)
4. 📨 Verifica que tu email esté bien escrito
5. 🌐 Revisa la conexión a internet
6. 📱 Prueba con otro proveedor de email (Gmail, Outlook)

¿El problema persiste? Contacta soporte técnico.`,
      buttons: [
        {
          text: 'Reenviar correo',
          handler: async () => {
            await this.reenviarCorreoVerificacion();
          }
        },
        {
          text: 'Cambiar email',
          handler: () => {
            // Permitir cambiar el email y registrarse de nuevo
            this.email = '';
          }
        },
        {
          text: 'Ir a login',
          role: 'confirm',
          handler: () => {
            this.router.navigate(['/login']);
          }
        }
      ]
    });

    await alert.present();
  }
}
