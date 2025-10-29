import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { StorageService } from '@core/services/storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const token = storage.getAccessToken();

  // Skip auth header for public endpoints (auth and invitation-related)
  const publicEndpoints = [
    '/auth/login',
    '/auth/refresh',
    '/auth/register',
    '/invitations/validate'
  ];

  if (publicEndpoints.some(endpoint => req.url.includes(endpoint))) {
    return next(req);
  }

  // Clone request and add Authorization header
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
