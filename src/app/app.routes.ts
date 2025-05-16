import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'folder/inbox',
    pathMatch: 'full',
  },
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
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
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.page').then( m => m.NotificationsPage)
  },
  {
    path: 'shopping-cart',
    loadComponent: () => import('./shopping-cart/shopping-cart.page').then( m => m.ShoppingCartPage)
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipes.page').then( m => m.RecipesPage)
  },
  {
    path: 'escaneo-boleta',
    loadComponent: () => import('./escaneo-boleta/escaneo-boleta.page').then( m => m.EscaneoBoletaPage)
  },

];
