import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Storage } from '../services/storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(Storage);
  const token   = storage.getToken();

  if (token) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  return next(req);
};
