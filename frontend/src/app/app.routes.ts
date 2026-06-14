import { Routes } from '@angular/router';
import { MainLayout } from './shared/layout/main-layout/main-layout';
import { PageLayout } from './shared/layout/page-layout/page-layout';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // Layout con sidebar — protegido por authGuard
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'gestion-expedientes',
        loadComponent: () =>
          import('./features/gestion-expedientes/pages/expediente-list/expediente-list')
            .then((m) => m.ExpedienteList),
      },
      {
        path: '',
        redirectTo: 'gestion-expedientes',
        pathMatch: 'full',
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/pages/clientes-list/clientes-list')
            .then((m) => m.ClientesList),
      },
      {
        path: 'agenda',
        loadComponent: () =>
          import('./features/agenda/pages/agenda-calendar/agenda-calendar')
            .then((m) => m.AgendaCalendar),
      },
      {
        path: 'seguridad/log-view',
        loadComponent: () =>
          import('./features/log/pages/log-view/log-view')
            .then((m) => m.LogView),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/configuracion/pages/configuracion/configuracion')
            .then((m) => m.ConfiguracionView),
      },
    ],
  },

  // Layout sin sidebar (detalle / edición) — protegido por authGuard
  {
    path: '',
    component: PageLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'gestion-expedientes/:id',
        loadComponent: () =>
          import('./features/gestion-expedientes/pages/expediente-view/expediente-view')
            .then((m) => m.ExpedienteView),
      },
      {
        path: 'gestion-expedientes/:id/edit',
        loadComponent: () =>
          import('./features/gestion-expedientes/pages/expediente-edit/expediente-edit')
            .then((m) => m.ExpedienteEdit),
        children: [
          { path: '', redirectTo: 'datos-generales', pathMatch: 'full' },
          {
            path: 'datos-generales',
            loadComponent: () =>
              import('./features/gestion-expedientes/components/datos-generales/datos-generales')
                .then((m) => m.DatosGenerales),
          },
          {
            path: 'documentos',
            loadComponent: () =>
              import('./features/gestion-expedientes/components/documentos/documentos')
                .then((m) => m.Documentos),
          },
          {
            path: 'novedades',
            loadComponent: () =>
              import('./features/gestion-expedientes/components/novedades/novedades')
                .then((m) => m.Novedades),
          },
        ],
      },
    ],
  },

  // Auth (sin layout)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/create-account/create-account').then((m) => m.CreateAccount),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-pass/forgot-pass').then((m) => m.ForgotPass),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password').then((m) => m.ResetPassword),
  },

  // fallback
  {
    path: '**',
    redirectTo: 'login',
  },
];
