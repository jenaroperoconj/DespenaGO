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
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonListHeader,
  IonNote,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';
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
  homeOutline, homeSharp
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    RouterLink,
    RouterLinkActive,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonListHeader,
    IonNote,
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
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];
  public nombreUsuario: string = '';
  public correoUsuario: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    addIcons({
      mailOutline, mailSharp,
      paperPlaneOutline, paperPlaneSharp,
      heartOutline, heartSharp,
      archiveOutline, archiveSharp,
      trashOutline, trashSharp,
      warningOutline, warningSharp,
      bookmarkOutline, bookmarkSharp,
      logOutOutline, logOutSharp,
      logInOutline, logInSharp,
      homeOutline, homeSharp
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
    }

    this.supabaseService.client.auth.onAuthStateChange(async (_event, session) => {
      this.loggedIn = !!session;
      if (this.loggedIn) await this.obtenerDatosUsuario();
      this.setMenu();
    });
  }

  async obtenerDatosUsuario() {
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
      }
    }
  }

  async refreshMenu() {
    this.loggedIn = await this.supabaseService.isLoggedIn();
    this.setMenu();
  }

  setMenu() {
    this.appPages = this.loggedIn
      ? [
      { title: 'Inicio', url: '/home', icon: 'home' },
      { title: 'Despensas', url: '/despensa', icon: 'home' },
      { title: 'Recetas', url: '/recipes', icon: 'home' },
      { title: 'Mi Carrito', url: '/shopping-cart', icon: 'home' },
      { title: 'Perfil', url: '/profile', icon: 'home' },
      { title: 'Notificaiones', url: '/notifications', icon: 'home' },
      { 
        title: 'Cerrar sesión',
        url: '/login',
        icon: 'log-out',
        action: async () => {
          await this.logout();
          const menu = document.querySelector('ion-menu');
          menu?.close();
        }
      }
    ]
  : [
      { title: 'Iniciar sesión', url: '/login', icon: 'log-in' }
    ];
  }

  async logout() {
    await this.supabaseService.logout();
    this.loggedIn = false;
    this.setMenu();
    this.router.navigate(['/login']);
  }
}
