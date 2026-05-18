import { Routes } from '@angular/router';
import { MainLayout } from './shared/layout/main-layout/main-layout';
import { PageLayout } from './shared/layout/page-layout/page-layout';

export const routes: Routes = [
  // Layout con sidebar
  {
    path: '',
    component: MainLayout,
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
    ],
  },

  // Layout sin sidebar (detalle / edición)
  {
    path: '',
    component: PageLayout,
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

  // fallback
  {
    path: '**',
    redirectTo: 'gestion-expedientes',
  },
];
