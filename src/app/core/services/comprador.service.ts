import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comprador, CompradorGuardar } from '../models/comprador.model';
import { PaginaResultado } from '../models/pagina.model';

@Injectable({ providedIn: 'root' })
export class CompradorService {
  private readonly baseUrl = `${environment.apiUrl}/compradores`;

  constructor(private readonly http: HttpClient) {}

  buscar(texto: string | undefined, pagina: number, tamanoPagina: number): Observable<PaginaResultado<Comprador>> {
    const params: Record<string, string> = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    if (texto) params['buscar'] = texto;
    return this.http.get<PaginaResultado<Comprador>>(this.baseUrl, { params });
  }

  // 404 si no existe: el que llama lo interpreta como "comprador nuevo".
  obtenerPorDocumento(numeroDocumento: string): Observable<Comprador> {
    return this.http.get<Comprador>(`${this.baseUrl}/por-documento/${encodeURIComponent(numeroDocumento)}`);
  }

  obtenerPorId(id: number): Observable<Comprador> {
    return this.http.get<Comprador>(`${this.baseUrl}/${id}`);
  }

  crear(dto: CompradorGuardar): Observable<Comprador> {
    return this.http.post<Comprador>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: CompradorGuardar): Observable<Comprador> {
    return this.http.put<Comprador>(`${this.baseUrl}/${id}`, dto);
  }
}
