import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoActualizar, ProductoCrear } from '../models/producto.model';
import { PaginaResultado } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly baseUrl = `${environment.apiUrl}/productos`;

  constructor(private readonly http: HttpClient) {}

  buscar(
    texto: string | undefined,
    pagina: number,
    tamanoPagina: number,
    soloActivos = false
  ): Observable<PaginaResultado<Producto>> {
    const params: Record<string, string> = {
      pagina: String(pagina),
      tamanoPagina: String(tamanoPagina),
      soloActivos: String(soloActivos)
    };
    if (texto) params['buscar'] = texto;
    return this.http.get<PaginaResultado<Producto>>(this.baseUrl, { params });
  }

  crear(dto: ProductoCrear): Observable<Producto> {
    return this.http.post<Producto>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: ProductoActualizar): Observable<Producto> {
    return this.http.put<Producto>(`${this.baseUrl}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
