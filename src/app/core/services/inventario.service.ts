import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Movimiento, MovimientoManual } from '../models/inventario.model';
import { PaginaResultado } from '../models/pagina.model';
import { Producto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  constructor(private readonly http: HttpClient) {}

  movimientos(productoId: number, pagina: number, tamanoPagina: number): Observable<PaginaResultado<Movimiento>> {
    return this.http.get<PaginaResultado<Movimiento>>(`${this.baseUrl}/${productoId}/movimientos`, {
      params: { pagina: String(pagina), tamanoPagina: String(tamanoPagina) }
    });
  }

  registrarMovimiento(productoId: number, dto: MovimientoManual): Observable<Producto> {
    return this.http.post<Producto>(`${this.baseUrl}/${productoId}/movimientos`, dto);
  }
}
