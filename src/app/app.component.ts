// 🔹 Definimos el tipo fuera de la clase
type AppPage = {
  title: string;
  url: string;
  icon: string;
  action?: () => void | Promise<void>;
};

import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SupabaseService } from './core/supabase.service';
import { InvitacionesPendientesModal } from './invitaciones/invitaciones-pendientes.modal';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, IonAvatar } from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  personOutline, 
  cartOutline, 
  listOutline, 
  settingsOutline, 
  logOutOutline,
  addOutline,
  searchOutline,
  closeOutline,
  chevronBackOutline,
  chevronForwardOutline,
  trashOutline,
  createOutline,
  checkmarkOutline,
  alertCircleOutline,
  informationCircleOutline,
  warningOutline,
  helpCircleOutline,
  timeOutline,
  calendarOutline,
  locationOutline,
  mailOutline,
  callOutline,
  globeOutline,
  storefrontOutline,
  logoFacebook,
  logoTwitter,
  logoInstagram,
  logoLinkedin,
  logoGithub,
  logoYoutube,
  logoWhatsapp,
  logoDiscord,
  logoSlack,
  logoReddit,
  logoTumblr,
  logoPinterest,
  logoVimeo,
  logoSnapchat,
  logoFlickr,
  logoDribbble,
  logoBehance,
  logoMedium,
  logoWordpress,
  logoStencil,
  logoBuffer,
  logoVk,
  logoSkype,
  logoSteam,
  logoTwitch,
  logoYahoo,
  logoDropbox,
  logoFoursquare
} from 'ionicons/icons';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
import { App } from '@capacitor/app';

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
    IonRouterOutlet,
    IonAvatar
  ],
})
export class AppComponent implements OnInit {
  public loggedIn: boolean = false;
  public appPages: AppPage[] = [];
  public nombreUsuario: string = '';
  public correoUsuario: string = '';
  public avatarUsuario: string = 'https://ionicframework.com/docs/img/demos/avatar.svg';
  constructor(
    private platform: Platform,
    private supabaseService: SupabaseService,
    private router: Router,
    private modalCtrl: ModalController
  ) {
    this.initializeApp();
    addIcons({
      homeOutline,
      personOutline,
      cartOutline,
      listOutline,
      settingsOutline,
      logOutOutline,
      addOutline,
      searchOutline,
      closeOutline,
      chevronBackOutline,
      chevronForwardOutline,
      trashOutline,
      createOutline,
      checkmarkOutline,
      alertCircleOutline,
      informationCircleOutline,
      warningOutline,
      helpCircleOutline,
      timeOutline,
      calendarOutline,
      locationOutline,
      mailOutline,
      callOutline,
      globeOutline,
      storefrontOutline,
      logoFacebook,
      logoTwitter,
      logoInstagram,
      logoLinkedin,
      logoGithub,
      logoYoutube,
      logoWhatsapp,
      logoDiscord,
      logoSlack,
      logoReddit,
      logoTumblr,
      logoPinterest,
      logoVimeo,
      logoSnapchat,
      logoFlickr,
      logoDribbble,
      logoBehance,
      logoMedium,
      logoWordpress,
      logoStencil,
      logoBuffer,
      logoVk,
      logoSkype,
      logoSteam,
      logoTwitch,
      logoYahoo,
      logoDropbox,
      logoFoursquare
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
    this.configurarStatusBar();
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        this.refrescarDatosGlobales();
      }
    });
  }

  async obtenerDatosUsuario() {
    try {
      const { data: user } = await this.supabaseService.getUser();
      const id = user?.user?.id;

      if (id) {
        const { data, error } = await this.supabaseService.client
          .from('usuarios')
          .select('nombre, email, avatar_url')
          .eq('id', id)
          .single();

        if (!error && data) {
          this.nombreUsuario = data.nombre;
          this.correoUsuario = data.email;
          this.avatarUsuario = data.avatar_url || 'https://ionicframework.com/docs/img/demos/avatar.svg';
          console.log('Datos de usuario obtenidos:', { nombre: this.nombreUsuario, correo: this.correoUsuario, avatar: this.avatarUsuario });
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
    this.avatarUsuario = 'https://ionicframework.com/docs/img/demos/avatar.svg';
    console.log('Datos de usuario limpiados');
  }

  async refreshMenu() {
    this.loggedIn = await this.supabaseService.isLoggedIn();
    this.setMenu();
  }  setMenu() {
    this.appPages = this.loggedIn
      ? [
          { 
            title: 'Inicio', 
            url: '/home', 
            icon: 'home-outline',
            action: () => {
              this.router.navigate(['/home'], { replaceUrl: false });
              const menu = document.querySelector('ion-menu');
              menu?.close();
            }
          },
          { title: 'Perfil', url: '/profile', icon: 'person-outline' },
          { title: 'Lista de Compras', url: '/lista-compras', icon: 'list-outline' },
          { title: 'Mis Despensas', url: '/despensa', icon: 'storefront-outline' },
          { title: 'Recetas', url: '/recipes', icon: 'restaurant-outline' },
          { title: 'Escaneo Boletas', url: '/escaneo-boleta', icon: 'scan-outline' },
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

  async configurarStatusBar() {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) {
      console.warn('StatusBar plugin no disponible o no soportado en web.');
    }
  }

  async initializeApp() {
    await this.platform.ready();
    await StatusBar.setStyle({ style: Style.Dark });
  }

  async refrescarDatosGlobales() {
    if (await this.supabaseService.isLoggedIn()) {
      await this.obtenerDatosUsuario();
      this.setMenu();
      // Aquí puedes agregar más lógica para refrescar otros datos globales si es necesario
    }
  }
}
