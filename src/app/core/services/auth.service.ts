import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.model';

const CLAVE_STORAGE = 'jimaco.remisiones.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly sesion = signal<LoginResponse | null>(this.leerSesionValida());
  private temporizadorExpiracion: ReturnType<typeof setTimeout> | null = null;

  readonly usuario = this.sesion.asReadonly();

  constructor(private readonly http: HttpClient) {
    const sesionInicial = this.sesion();
    if (sesionInicial) {
      this.programarExpiracion(sesionInicial.token);
    }
  }

  login(dto: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, dto).pipe(
      tap((respuesta) => {
        localStorage.setItem(CLAVE_STORAGE, JSON.stringify(respuesta));
        this.sesion.set(respuesta);
        this.programarExpiracion(respuesta.token);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(CLAVE_STORAGE);
    this.sesion.set(null);
    if (this.temporizadorExpiracion) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }
  }

  get token(): string | null {
    return this.sesion()?.token ?? null;
  }

  get estaAutenticado(): boolean {
    return this.sesion() !== null;
  }

  get esAdmin(): boolean {
    return this.sesion()?.rol === 'Admin';
  }

  private leerSesionValida(): LoginResponse | null {
    const crudo = localStorage.getItem(CLAVE_STORAGE);
    if (!crudo) return null;

    try {
      const sesion = JSON.parse(crudo) as LoginResponse;
      const expiracion = this.obtenerExpiracion(sesion.token);
      if (expiracion !== null && expiracion <= Date.now()) {
        localStorage.removeItem(CLAVE_STORAGE);
        return null;
      }
      return sesion;
    } catch {
      return null;
    }
  }

  private programarExpiracion(token: string): void {
    if (this.temporizadorExpiracion) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }

    const expiracion = this.obtenerExpiracion(token);
    if (expiracion === null) return;

    const msRestantes = expiracion - Date.now();
    if (msRestantes <= 0) {
      this.expirarSesion();
      return;
    }

    this.temporizadorExpiracion = setTimeout(() => this.expirarSesion(), msRestantes);
  }

  private expirarSesion(): void {
    this.logout();
    this.snackBar.open('Tu sesión expiró. Por favor ingresa de nuevo.', 'Cerrar', { duration: 6000 });
    this.router.navigate(['/login']);
  }

  // Decodifica el payload del JWT solo para leer "exp" y programar el cierre de sesión local
  // (no valida la firma — la validación real de expiración siempre ocurre en el backend).
  private obtenerExpiracion(token: string): number | null {
    try {
      const payload = token.split('.')[1];
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '=';
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      const datos = JSON.parse(json) as { exp?: number };
      return datos.exp ? datos.exp * 1000 : null;
    } catch {
      return null;
    }
  }
}
