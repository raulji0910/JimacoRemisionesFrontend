import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

// Tarifas fijas de las retenciones y valor mínimo (antes de IVA) para aplicarlas; las define el servidor.
export interface ReglasRetenciones {
  reteFuentePorcentaje: number;
  reteIcaPorMil: number;
  reteIvaPorcentaje: number;
  uvt: number;
  baseMinima: number;
}

// Mismos valores por defecto del servidor (2,5 % / 6,9 por mil / 15 %; 10 UVT de 2026 = $523.740) mientras llega la respuesta.
export const REGLAS_POR_DEFECTO: ReglasRetenciones = {
  reteFuentePorcentaje: 2.5,
  reteIcaPorMil: 6.9,
  reteIvaPorcentaje: 15,
  uvt: 52374,
  baseMinima: 523740
};

@Injectable({ providedIn: 'root' })
export class RetencionesService {
  private readonly http = inject(HttpClient);
  private readonly reglas$ = this.http.get<ReglasRetenciones>(`${environment.apiUrl}/configuracion/retenciones`).pipe(shareReplay(1));

  reglas(): Observable<ReglasRetenciones> {
    return this.reglas$;
  }
}
