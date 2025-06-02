import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then( m => m.HomePage)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'despensa',
    loadComponent: () => import('./despensa/despensa.page').then( m => m.DespensaPage)
  },
  {
    path: 'despensa/:id',
    loadComponent: () => import('./detalle-despensa/detalle-despensa.page').then( m => m.DetalleDespensaPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then( m => m.ProfilePage)
  },  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.page').then( m => m.NotificationsPage)
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipes.page').then( m => m.RecipesPage)
  },  {
    path: 'escaneo-boleta',
    loadComponent: () => import('./escaneo-boleta/escaneo-boleta.page').then( m => m.EscaneoBoletaPage)
  },  {
    path: 'lista-compras',
    loadComponent: () => import('./lista-deseos/lista-deseos.page').then( m => m.ListaDeseosPage)
  },  {
    path: 'lista-compras/:id',
    loadComponent: () => import('./lista-compras/lista-compras.page').then( m => m.ListaComprasPage)
  },

];
