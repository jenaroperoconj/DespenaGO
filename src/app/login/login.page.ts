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
  IonInput,
  IonButton,
  IonIcon,
  IonChip,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { leafOutline, alertCircleOutline, warningOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';
  error: string | null = null;
  isLoading = false;
  showPassword = false;  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ leafOutline, alertCircleOutline, warningOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }  async ngOnInit() {
    // Verificar parámetros de URL
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('verified') === 'true') {
      await this.mostrarToastExito('✅ Email verificado exitosamente. Ahora puedes iniciar sesión.');
    }
    
    if (urlParams.get('logout') === 'true') {
      // Usuario llegó desde logout, limpiar formulario y mostrar mensaje
      this.limpiarFormulario();
      await this.mostrarToastExito('✅ Sesión cerrada correctamente');
      // Limpiar el parámetro de la URL
      window.history.replaceState({}, document.title, '/login');
    }

    // Limpiar campos si no hay sesión activa (usuario cerró sesión)
    await this.verificarEstadoSesion();

    // Escuchar cambios en el estado de autenticación
    this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Usuario cerró sesión, limpiar formulario
        this.limpiarFormulario();
      }
    });
  }async login() {
    if (!this.email.trim() || !this.password.trim()) {
      await this.mostrarError('Por favor, ingresa tu correo electrónico y contraseña');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      await this.mostrarError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const { data, error } = await this.supabaseService.login(this.email, this.password);
      
      if (error) {
        console.error('Error de login:', error);
          if (error.message?.includes('Invalid login credentials')) {
          await this.mostrarToastError('❌ Credenciales incorrectas');
          await this.mostrarErrorCredenciales();
        } else if (error.message?.includes('Email not confirmed')) {
          await this.mostrarToastError('⚠️ Email no verificado');
          await this.mostrarErrorEmailNoConfirmado();
        } else if (error.message?.includes('Invalid email')) {
          await this.mostrarError('El formato del correo electrónico no es válido');
        } else {
          await this.mostrarError('Error al iniciar sesión. Por favor, inténtalo de nuevo');
        }      } else {
        // Login exitoso - limpiar formulario y navegar
        this.limpiarFormulario();
        this.router.navigate(['/home']);
      }
    } catch (err: any) {
      console.error('Error inesperado:', err);
      await this.mostrarError('Error de conexión. Por favor, verifica tu conexión a internet');
    } finally {
      this.isLoading = false;
    }
  }
  private async mostrarErrorCredenciales() {
    const alert = await this.alertController.create({
      header: 'Credenciales incorrectas',
      message: `El correo electrónico o la contraseña son incorrectos.

Por favor, verifica tus datos e inténtalo de nuevo.`,
      buttons: [
        {
          text: 'Intentar de nuevo',
          role: 'confirm'
        }
      ]
    });

    await alert.present();
  }  private async mostrarErrorEmailNoConfirmado() {
    const alert = await this.alertController.create({
      header: 'Correo no verificado',
      message: `Tu correo electrónico aún no ha sido verificado.

Por favor, revisa tu bandeja de entrada (incluye spam/promociones) y haz clic en el enlace de verificación.

¿No recibiste el correo?`,
      buttons: [
        {
          text: 'Reenviar correo',
          handler: async () => {
            await this.reenviarCorreoVerificacion();
          }
        },
        {
          text: 'Entendido',
          role: 'confirm'
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
      
      let mensaje = 'Error al reenviar el correo. Verifica que el email sea correcto.';
      
      if (err.message?.includes('security purposes')) {
        mensaje = 'Por seguridad, debes esperar antes de solicitar otro correo de verificación.';
      } else if (err.message?.includes('Invalid email')) {
        mensaje = 'El correo electrónico no es válido.';
      }
      
      await this.mostrarError(mensaje);
    }
  }
  private async mostrarError(mensaje: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: mensaje,
      buttons: ['OK']
    });

    await alert.present();
  }

  private async mostrarToastError(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      position: 'top',
      color: 'danger'
    });

    await toast.present();
  }  goToRegister() {
    this.router.navigate(['/register']);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private async mostrarToastExito(mensaje: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 4000,
      position: 'top',
      color: 'success'
    });

    await toast.present();
  }

  private async verificarEstadoSesion() {
    try {
      const isLoggedIn = await this.supabaseService.isLoggedIn();
      if (!isLoggedIn) {
        // No hay sesión activa, limpiar formulario
        this.limpiarFormulario();
      }
    } catch (error) {
      console.log('Verificando estado de sesión...');
      // En caso de error, asumir que no hay sesión y limpiar
      this.limpiarFormulario();
    }
  }

  private limpiarFormulario() {
    this.email = '';
    this.password = '';
    this.error = null;
    this.isLoading = false;
    this.showPassword = false;
    console.log('Formulario de login limpiado');
  }
}
