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
        path: 'expedientes',
        loadComponent: () =>
          import('./features/expedientes/pages/expediente-list/expediente-list')
            .then((m) => m.ExpedienteList),
      },
      {
        path: '',
        redirectTo: 'expedientes',
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
        path: 'expedientes/:id',
        loadComponent: () =>
          import('./features/expedientes/pages/expediente-view/expediente-view')
            .then((m) => m.ExpedienteView),
      },
      {
        path: 'expedientes/:id/edit',
        loadComponent: () =>
          import('./features/expedientes/pages/expediente-edit/expediente-edit')
            .then((m) => m.ExpedienteEdit),
      },
    ],
  },

  // fallback
  {
    path: '**',
    redirectTo: 'expedientes',
  },
];
