// 🔹 Definimos el tipo fuera de la clase
type AppPage = {
  title: string;
  url: string;
  icon: string;
  action?: () => void | Promise<void>;
};

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './core/supabase.service';
import { InvitacionesPendientesModal } from './invitaciones/invitaciones-pendientes.modal';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline, mailSharp,
  paperPlaneOutline, paperPlaneSharp,
  heartOutline, heartSharp,
  archiveOutline, archiveSharp,
  trashOutline, trashSharp,
  warningOutline, warningSharp,
  bookmarkOutline, bookmarkSharp,
  logOutOutline, logOutSharp,
  logInOutline, logInSharp,
  homeOutline, homeSharp,
  gridOutline,
  restaurantOutline, restaurantSharp,
  bagHandleOutline, bagHandleSharp,  personOutline, personSharp,
  notificationsOutline, notificationsSharp,
  scanOutline, scanSharp,
  storefrontOutline, storefrontSharp,
  leafOutline,
  chevronDownCircleOutline,
  bagOutline,
  addOutline,
  closeOutline,
  cartOutline, cartSharp,
  checkmarkCircleOutline,
  alertCircleOutline,
  saveOutline,
  basketOutline,
  pricetagOutline,
  calendarOutline,
  cubeOutline,
  ellipsisVertical,
  createOutline,
  removeOutline,
  timeOutline,
  flashOutline,
  refreshOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  providers: [ModalController],
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonRouterLink,
    IonRouterOutlet
  ],
})
export class AppComponent implements OnInit {
  public loggedIn: boolean = false;
  public appPages: AppPage[] = [];
  public nombreUsuario: string = '';
  public correoUsuario: string = '';  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private modalCtrl: ModalController  ) {addIcons({
      mailOutline, mailSharp,
      paperPlaneOutline, paperPlaneSharp,
      heartOutline, heartSharp,
      archiveOutline, archiveSharp,
      trashOutline, trashSharp,
      warningOutline, warningSharp,
      bookmarkOutline, bookmarkSharp,
      cartOutline, cartSharp,
      logOutOutline, logOutSharp,
      logInOutline, logInSharp,
      homeOutline, homeSharp,
      gridOutline,
      restaurantOutline, restaurantSharp,
      bagHandleOutline, bagHandleSharp,
      personOutline, personSharp,
      notificationsOutline, notificationsSharp,
      scanOutline, scanSharp,
      storefrontOutline, storefrontSharp,
      leafOutline,
      chevronDownCircleOutline,
      bagOutline,
      addOutline,
      closeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      saveOutline,
      basketOutline,
      pricetagOutline,
      calendarOutline,
      cubeOutline,
      ellipsisVertical,
      createOutline,
      removeOutline,
      timeOutline,
      flashOutline,
      refreshOutline
    });
  }

  async ngOnInit() {
    const url = new URL(window.location.href);
    const type = url.searchParams.get('type');
    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');

    if (type === 'signup' && access_token && refresh_token) {
      const { error } = await this.supabaseService.client.auth.setSession({
        access_token,
        refresh_token
      });

      if (!error) {
        this.loggedIn = true;
        await this.obtenerDatosUsuario();
        this.setMenu();
        this.router.navigate(['/home']);
        window.history.replaceState({}, document.title, '/home');
      }
    } else {
      this.loggedIn = await this.supabaseService.isLoggedIn();
      if (this.loggedIn) {
        await this.obtenerDatosUsuario();
      }
      this.setMenu();
    }    this.supabaseService.client.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session);
      this.loggedIn = !!session;
      
      if (this.loggedIn && session) {
        // Usuario se ha autenticado
        await this.obtenerDatosUsuario();
      } else {
        // Usuario se ha desautenticado
        this.limpiarDatosUsuario();
      }
      
      this.setMenu();
    });
  }
  async obtenerDatosUsuario() {
    try {
      const { data: user } = await this.supabaseService.getUser();
      const id = user?.user?.id;

      if (id) {
        const { data, error } = await this.supabaseService.client
          .from('usuarios')
          .select('nombre, email')
          .eq('id', id)
          .single();

        if (!error && data) {
          this.nombreUsuario = data.nombre;
          this.correoUsuario = data.email;
          console.log('Datos de usuario obtenidos:', { nombre: this.nombreUsuario, correo: this.correoUsuario });
        } else {
          console.error('Error al obtener datos del usuario:', error);
          this.limpiarDatosUsuario();
        }
      } else {
        console.log('No hay ID de usuario');
        this.limpiarDatosUsuario();
      }
    } catch (error) {
      console.error('Error en obtenerDatosUsuario:', error);
      this.limpiarDatosUsuario();
    }
  }

  limpiarDatosUsuario() {
    this.nombreUsuario = '';
    this.correoUsuario = '';
    console.log('Datos de usuario limpiados');
  }

  async refreshMenu() {
    this.loggedIn = await this.supabaseService.isLoggedIn();
    this.setMenu();
  }  setMenu() {
    this.appPages = this.loggedIn
      ? [
      { title: 'Inicio', url: '/home', icon: 'home-outline' },
      { title: 'Mis Despensas', url: '/despensa', icon: 'storefront-outline' },
      { 
        title: 'Invitaciones',
        url: '',
        icon: 'mail-outline',
        action: async () => {
          await this.abrirInvitacionesPendientes();
          const menu = document.querySelector('ion-menu');
          menu?.close();
        }
      },
      { title: 'Lista de Compras', url: '/lista-compras', icon: 'cart-outline' },
      { title: 'Recetas', url: '/recipes', icon: 'restaurant-outline' },
      { title: 'Perfil', url: '/profile', icon: 'person-outline' },
      { title: 'Notificaciones', url: '/notifications', icon: 'notifications-outline' },
      { title: 'Escaneo Boletas', url: '/escaneo-boleta', icon: 'scan-outline' },
      { 
        title: 'Cerrar sesión',
        url: '/login',
        icon: 'log-out-outline',
        action: async () => {
          await this.logout();
          const menu = document.querySelector('ion-menu');
          menu?.close();
        }
      }
    ]
  : [
      { title: 'Iniciar sesión', url: '/login', icon: 'log-in-outline' }
    ];
  }async logout() {
    try {
      console.log('Iniciando proceso de logout...');
      await this.supabaseService.logout();
      this.loggedIn = false;
      this.limpiarDatosUsuario();
      this.setMenu();
      
      // Navegar al login con un parámetro para indicar que se cerró sesión
      this.router.navigate(['/login'], { queryParams: { logout: 'true' } });
      console.log('Logout completado exitosamente');
    } catch (error) {      console.error('Error al cerrar sesión:', error);
    }
  }

  // Método para abrir modal de invitaciones pendientes
  async abrirInvitacionesPendientes() {
    try {
      console.log('📧 Abriendo modal de invitaciones desde menú');
      
      const modal = await this.modalCtrl.create({
        component: InvitacionesPendientesModal,
        cssClass: 'modal-centrado'
      });

      await modal.present();
      
    } catch (error: any) {
      console.error('❌ Error abriendo modal de invitaciones:', error);
    }
  }
}
