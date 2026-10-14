import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'remisiones', pathMatch: 'full' },
      {
        path: 'remisiones',
        loadComponent: () => import('./features/remisiones/remisiones-list.component').then((m) => m.RemisionesListComponent)
      },
      {
        path: 'remisiones/nueva',
        loadComponent: () => import('./features/remisiones/remision-form.component').then((m) => m.RemisionFormComponent)
      },
      {
        path: 'remisiones/:id/editar',
        loadComponent: () => import('./features/remisiones/remision-form.component').then((m) => m.RemisionFormComponent)
      },
      {
        path: 'remisiones/:id',
        loadComponent: () => import('./features/remisiones/remision-detalle.component').then((m) => m.RemisionDetalleComponent)
      },
      {
        path: 'productos',
        loadComponent: () => import('./features/productos/productos-list.component').then((m) => m.ProductosListComponent)
      },
      {
        path: 'productos/importar',
        loadComponent: () => import('./features/productos/importar-inventario.component').then((m) => m.ImportarInventarioComponent),
        canActivate: [adminGuard]
      },
      {
        path: 'compradores',
        loadComponent: () => import('./features/compradores/compradores-list.component').then((m) => m.CompradoresListComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/usuarios-list.component').then((m) => m.UsuariosListComponent),
        canActivate: [adminGuard]
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
