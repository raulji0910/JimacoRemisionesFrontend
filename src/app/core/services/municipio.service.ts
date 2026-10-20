import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Municipio } from '../models/municipio.model';
import { normalizarTexto } from '../utils/municipios';

interface MunicipioApi {
  codigo: string;
  nombre: string;
  departamento: string;
  etiqueta: string;
}

@Injectable({ providedIn: 'root' })
export class MunicipioService {
  private readonly http = inject(HttpClient);

  // Se pide una sola vez por sesión (son 1.122 municipios, ~70 KB) y se reutiliza.
  private readonly municipios$ = this.http.get<MunicipioApi[]>(`${environment.apiUrl}/municipios`).pipe(
    map((lista) => lista.map((m) => ({ ...m, busqueda: normalizarTexto(`${m.nombre} ${m.departamento}`) }))),
    shareReplay(1)
  );

  listar(): Observable<Municipio[]> {
    return this.municipios$;
  }
}
