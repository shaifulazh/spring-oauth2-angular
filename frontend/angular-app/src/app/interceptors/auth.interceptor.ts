// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);

  // Only attach token to calls directed at our backend
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  // Skip the token endpoint itself
  if (req.url.includes('/oauth2/token')) {
    return next(req);
  }

  const attachTokenAndSend = () => {
    const token = authService.getAccessToken();
    if (!token) {
      return next(req);
    }
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  };

  // If token is expired try to refresh first
  if (authService.isTokenExpired() && authService.getAccessToken()) {
    return from(authService.refreshAccessToken()).pipe(
      switchMap(() => attachTokenAndSend()),
      catchError(err => {
        authService.logout();
        return throwError(() => err);
      })
    );
  }

  return attachTokenAndSend().pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
