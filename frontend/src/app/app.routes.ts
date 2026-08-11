import { Routes } from '@angular/router';

import { adminGuard } from './core/auth/admin.guard';
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
    path: 'setup-password',
    loadComponent: () => import('./features/auth/setup-password.page').then((m) => m.SetupPasswordPage),
    title: 'Criar senha | DNMS',
  },
  {
    path: 'cursos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/classroom/classroom.page').then((m) => m.ClassroomPage),
    title: 'Cursos | DNMS',
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
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
