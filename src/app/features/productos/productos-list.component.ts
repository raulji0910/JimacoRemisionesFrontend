import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductoService } from '../../core/services/producto.service';
import { InventarioService } from '../../core/services/inventario.service';
import { AuthService } from '../../core/services/auth.service';
import { Producto } from '../../core/models/producto.model';
import { ProductoFormDialogComponent } from './producto-form-dialog.component';
import { AjusteStockDialogComponent } from './ajuste-stock-dialog.component';
import { KardexDialogComponent } from './kardex-dialog.component';

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [
    FormsModule,
    CurrencyPipe,
    DecimalPipe,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './productos-list.component.html',
  styleUrl: './productos-list.component.scss'
})
export class ProductosListComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly inventarioService = inject(InventarioService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly esAdmin = inject(AuthService).esAdmin;

  readonly columnas = ['codigo', 'nombre', 'precioVenta', 'iva', 'stock', 'estado', 'acciones'];
  readonly productos = signal<Producto[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly cargando = signal(false);
  texto = '';

  ngOnInit(): void {
    this.cargarPagina();
  }

  buscar(): void {
    this.pageIndex.set(0);
    this.cargarPagina();
  }

  limpiarBusqueda(): void {
    this.texto = '';
    this.buscar();
  }

  alCambiarPagina(evento: PageEvent): void {
    this.pageIndex.set(evento.pageIndex);
    this.pageSize.set(evento.pageSize);
    this.cargarPagina();
  }

  private cargarPagina(): void {
    this.cargando.set(true);
    this.productoService.buscar(this.texto || undefined, this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (resultado) => {
        this.productos.set(resultado.items);
        this.total.set(resultado.total);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  abrirDialogo(producto: Producto | null): void {
    const dialogRef = this.dialog.open(ProductoFormDialogComponent, {
      width: '30rem',
      autoFocus: 'dialog',
      data: { producto }
    });

    dialogRef.afterClosed().subscribe((dto) => {
      if (!dto) return;

      const peticion = producto
        ? this.productoService.actualizar(producto.id, dto)
        : this.productoService.crear(dto);

      peticion.subscribe({
        next: (guardado) => {
          this.snackBar.open(`Producto "${guardado.nombre}" ${producto ? 'actualizado' : 'creado'}`, 'Cerrar', { duration: 3000 });
          this.cargarPagina();
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo guardar el producto.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  verHistorial(producto: Producto, evento: Event): void {
    evento.stopPropagation();
    this.dialog.open(KardexDialogComponent, { width: '44rem', maxWidth: '95vw', data: { producto } });
  }

  ajustarStock(producto: Producto, evento: Event): void {
    evento.stopPropagation();
    this.dialog
      .open(AjusteStockDialogComponent, { width: '28rem', autoFocus: 'dialog', data: { producto } })
      .afterClosed()
      .subscribe((dto) => {
        if (!dto) return;

        this.inventarioService.registrarMovimiento(producto.id, dto).subscribe({
          next: (actualizado) => {
            this.snackBar.open(`${actualizado.codigo}: stock en ${actualizado.stock}`, 'Cerrar', { duration: 3000 });
            this.cargarPagina();
          },
          error: (error) => {
            this.snackBar.open(error?.error?.mensaje ?? 'No se pudo registrar el movimiento.', 'Cerrar', { duration: 5000 });
          }
        });
      });
  }
}
