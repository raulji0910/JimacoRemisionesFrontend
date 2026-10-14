import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EstadoInventario,
  ImportarInventarioRequest,
  ImportarInventarioResultado
} from '../models/inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly baseUrl = `${environment.apiUrl}/inventario`;

  constructor(private readonly http: HttpClient) {}

  estado(): Observable<EstadoInventario> {
    return this.http.get<EstadoInventario>(`${this.baseUrl}/estado`);
  }

  importar(dto: ImportarInventarioRequest): Observable<ImportarInventarioResultado> {
    return this.http.post<ImportarInventarioResultado>(`${this.baseUrl}/importar`, dto);
  }
}
