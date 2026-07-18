import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/home/home.page').then((m) => m.HomePage),
    title: 'DNMS Recife',
  },
  {
    path: 'agenda',
    loadComponent: () => import('./features/public/agenda/agenda.page').then((m) => m.AgendaPage),
    title: 'Agenda | DNMS',
  },
  {
    path: 'eventos',
    loadComponent: () => import('./features/public/eventos/eventos.page').then((m) => m.EventosPage),
    title: 'Eventos | DNMS',
  },
  {
    path: 'gcs',
    loadComponent: () => import('./features/public/gcs/gcs.page').then((m) => m.GcsPage),
    title: 'GCs | DNMS',
  },
  {
    path: 'oracao',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'primeira-visita',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
    title: 'Entrar | DNMS',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/admin-dashboard.page').then((m) => m.AdminDashboardPage),
        title: 'Dashboard | DNMS',
      },
      {
        path: ':module',
        loadComponent: () => import('./features/admin/admin-module.page').then((m) => m.AdminModulePage),
        title: 'Administração | DNMS',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
