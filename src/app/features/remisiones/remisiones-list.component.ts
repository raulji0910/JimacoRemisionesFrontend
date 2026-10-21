import { nombreMedioPago } from '../../core/models/remision.model';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RemisionService } from '../../core/services/remision.service';
import { EstadoPago, RemisionResumen } from '../../core/models/remision.model';

type Filtro = 'todas' | 'pendientes' | 'pagadas' | 'envios' | 'anuladas';

@Component({
  selector: 'app-remisiones-list',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './remisiones-list.component.html',
  styleUrl: './remisiones-list.component.scss'
})
export class RemisionesListComponent implements OnInit {
  readonly nombreMedio = nombreMedioPago;

  private readonly remisionService = inject(RemisionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly columnas = ['consecutivo', 'fecha', 'comprador', 'total', 'pago', 'entrega', 'correo'];
  readonly remisiones = signal<RemisionResumen[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly cargando = signal(false);
  texto = '';
  filtro: Filtro = 'todas';

  ngOnInit(): void {
    // El estado de la búsqueda vive en la URL para que "volver" desde el detalle lo conserve.
    const params = this.route.snapshot.queryParamMap;
    this.texto = params.get('texto') ?? '';
    this.filtro = (params.get('filtro') as Filtro) ?? 'todas';
    const pagina = params.get('pagina');
    const tamano = params.get('tamanoPagina');
    if (pagina) this.pageIndex.set(Math.max(0, Number(pagina) - 1));
    if (tamano) this.pageSize.set(Number(tamano));
    this.cargarPagina();
  }

  buscar(): void {
    this.pageIndex.set(0);
    this.actualizarUrl();
    this.cargarPagina();
  }

  limpiarBusqueda(): void {
    this.texto = '';
    this.buscar();
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pageIndex.set(evento.pageIndex);
    this.pageSize.set(evento.pageSize);
    this.actualizarUrl();
    this.cargarPagina();
  }

  private actualizarUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        texto: this.texto || null,
        filtro: this.filtro === 'todas' ? null : this.filtro,
        pagina: this.pageIndex() + 1,
        tamanoPagina: this.pageSize()
      }
    });
  }

  private cargarPagina(): void {
    this.cargando.set(true);
    const estadoPago: EstadoPago | undefined =
      this.filtro === 'pendientes' ? 'Pendiente' : this.filtro === 'pagadas' ? 'Pagada' : this.filtro === 'anuladas' ? 'Anulada' : undefined;

    this.remisionService
      .buscar(
        { estadoPago, soloEnviosPendientes: this.filtro === 'envios', texto: this.texto || undefined },
        this.pageIndex() + 1,
        this.pageSize()
      )
      .subscribe({
        next: (resultado) => {
          this.remisiones.set(resultado.items);
          this.total.set(resultado.total);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
  }

  verDetalle(remision: RemisionResumen): void {
    this.router.navigate(['/remisiones', remision.id]);
  }
}
