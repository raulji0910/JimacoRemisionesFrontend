import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginaResultado } from '../models/pagina.model';
import {
  EnviarCorreoResultado,
  EstadoPago,
  PagarResultado,
  RemisionDetalle,
  RemisionGuardar,
  RemisionResumen,
  TipoEntrega
} from '../models/remision.model';

@Injectable({ providedIn: 'root' })
export class RemisionService {
  private readonly baseUrl = `${environment.apiUrl}/remisiones`;

  constructor(private readonly http: HttpClient) {}

  buscar(
    filtros: { estadoPago?: EstadoPago; soloEnviosPendientes?: boolean; texto?: string },
    pagina: number,
    tamanoPagina: number
  ): Observable<PaginaResultado<RemisionResumen>> {
    const params: Record<string, string> = { pagina: String(pagina), tamanoPagina: String(tamanoPagina) };
    if (filtros.estadoPago) params['estadoPago'] = filtros.estadoPago;
    if (filtros.soloEnviosPendientes) params['soloEnviosPendientes'] = 'true';
    if (filtros.texto) params['buscar'] = filtros.texto;
    return this.http.get<PaginaResultado<RemisionResumen>>(this.baseUrl, { params });
  }

  obtenerPorId(id: number): Observable<RemisionDetalle> {
    return this.http.get<RemisionDetalle>(`${this.baseUrl}/${id}`);
  }

  crear(dto: RemisionGuardar): Observable<RemisionDetalle> {
    return this.http.post<RemisionDetalle>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: RemisionGuardar): Observable<RemisionDetalle> {
    return this.http.put<RemisionDetalle>(`${this.baseUrl}/${id}`, dto);
  }

  pagar(id: number, reciboRedeban: string): Observable<PagarResultado> {
    return this.http.post<PagarResultado>(`${this.baseUrl}/${id}/pagar`, { reciboRedeban });
  }

  enviarCorreo(id: number): Observable<EnviarCorreoResultado> {
    return this.http.post<EnviarCorreoResultado>(`${this.baseUrl}/${id}/enviar-correo`, {});
  }

  cambiarTipoEntrega(id: number, tipoEntrega: TipoEntrega): Observable<RemisionDetalle> {
    return this.http.put<RemisionDetalle>(`${this.baseUrl}/${id}/entrega`, { tipoEntrega });
  }

  entregar(id: number): Observable<RemisionDetalle> {
    return this.http.post<RemisionDetalle>(`${this.baseUrl}/${id}/entregar`, {});
  }

  anular(id: number, motivo: string): Observable<RemisionDetalle> {
    return this.http.post<RemisionDetalle>(`${this.baseUrl}/${id}/anular`, { motivo });
  }

  // El PDF necesita el token: se baja como blob autenticado y se abre desde una URL local.
  obtenerPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
