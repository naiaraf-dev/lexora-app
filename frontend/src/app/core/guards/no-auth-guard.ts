import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const noAuthGuard: CanActivateFn = () => {
  const auth   = inject(Auth);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return router.createUrlTree(['/gestion-expedientes']);
  }

  return true;
};