import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { InventarioService } from '../../core/services/inventario.service';
import { ETIQUETA_MOVIMIENTO, Movimiento } from '../../core/models/inventario.model';
import { Producto } from '../../core/models/producto.model';

export interface KardexDialogData {
  producto: Producto;
}

// Historial (kardex) de un producto: cada entrada, venta, reintegro y ajuste, con el saldo que dejó.
@Component({
  selector: 'app-kardex-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatProgressBarModule, MatPaginatorModule],
  template: `
    <h2 mat-dialog-title>Historial de {{ data.producto.codigo }}</h2>

    <mat-dialog-content>
      <p class="kardex__producto">{{ data.producto.nombre }}</p>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <div class="kardex__contenedor">
        <table class="kardex__tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th class="num">Cant.</th>
              <th class="num">Saldo</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            @for (m of movimientos(); track m.id) {
              <tr>
                <td>{{ m.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ etiqueta[m.tipo] }}</td>
                <td class="num" [class.kardex__sale]="m.cantidad < 0">{{ m.cantidad > 0 ? '+' : '' }}{{ m.cantidad }}</td>
                <td class="num">{{ m.saldoResultante }}</td>
                <td>
                  @if (m.remisionConsecutivo) {
                    {{ m.remisionConsecutivo }}
                  }
                  @if (m.motivo && !m.remisionConsecutivo) {
                    {{ m.motivo }}
                  }
                  @if (m.usuario) {
                    <span class="kardex__usuario">· {{ m.usuario }}</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="kardex__vacio">Sin movimientos todavía.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <mat-paginator
        [length]="total()"
        [pageIndex]="pagina()"
        [pageSize]="10"
        [hidePageSize]="true"
        (page)="alCambiarPagina($event)"
      />
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .kardex__producto {
        margin: 0 0 0.5rem;
        color: var(--mat-sys-on-surface-variant);
        font-size: 0.9rem;
      }
      .kardex__contenedor {
        overflow-x: auto;
      }
      .kardex__tabla {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;

        th,
        td {
          padding: 0.4rem 0.5rem;
          text-align: left;
          border-bottom: 1px solid var(--mat-sys-outline-variant);
        }
        .num {
          text-align: right;
          white-space: nowrap;
        }
      }
      .kardex__sale {
        color: var(--mat-sys-error);
      }
      .kardex__usuario {
        color: var(--mat-sys-on-surface-variant);
      }
      .kardex__vacio {
        text-align: center;
        color: var(--mat-sys-on-surface-variant);
        padding: 1rem;
      }
    `
  ]
})
export class KardexDialogComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  readonly data = inject<KardexDialogData>(MAT_DIALOG_DATA);

  readonly etiqueta = ETIQUETA_MOVIMIENTO;
  readonly movimientos = signal<Movimiento[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly cargando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pagina.set(evento.pageIndex);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.inventarioService.movimientos(this.data.producto.id, this.pagina() + 1, 10).subscribe({
      next: (r) => {
        this.movimientos.set(r.items);
        this.total.set(r.total);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }
}
