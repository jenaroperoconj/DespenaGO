import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then( m => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'despensa',
    loadComponent: () => import('./despensa/despensa.page').then( m => m.DespensaPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'despensa/:id',
    loadComponent: () => import('./detalle-despensa/detalle-despensa.page').then( m => m.DetalleDespensaPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile.page').then( m => m.ProfilePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipes.page').then( m => m.RecipesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'escaneo-boleta',
    loadComponent: () => import('./escaneo-boleta/escaneo-boleta.page').then( m => m.EscaneoBoletaPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'lista-compras',
    loadComponent: () => import('./lista-deseos/lista-deseos.page').then( m => m.ListaDeseosPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'lista-compras/:id',
    loadComponent: () => import('./lista-compras/lista-compras.page').then( m => m.ListaComprasPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'ocr-boleta',
    loadComponent: () => import('./ocr-boleta/ocr-boleta.component').then(m => m.OcrBoletaComponent),
    canActivate: [AuthGuard]
  }
];
