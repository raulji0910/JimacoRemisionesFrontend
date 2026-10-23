import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CierreCaja } from '../models/cierre-caja.model';

@Injectable({ providedIn: 'root' })
export class CierreCajaService {
  private readonly http = inject(HttpClient);

  // desde / hasta: días (yyyy-MM-dd), ambos incluidos.
  obtener(desde: string, hasta: string): Observable<CierreCaja> {
    return this.http.get<CierreCaja>(`${environment.apiUrl}/cierre-caja`, { params: { desde, hasta } });
  }
}
