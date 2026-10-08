import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompradorService } from '../../core/services/comprador.service';
import { Comprador } from '../../core/models/comprador.model';
import { CompradorFormDialogComponent } from './comprador-form-dialog.component';

@Component({
  selector: 'app-compradores-list',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatProgressBarModule,
    MatPaginatorModule
  ],
  templateUrl: './compradores-list.component.html',
  styleUrl: './compradores-list.component.scss'
})
export class CompradoresListComponent implements OnInit {
  private readonly compradorService = inject(CompradorService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columnas = ['documento', 'nombre', 'email', 'telefono', 'estado'];
  readonly compradores = signal<Comprador[]>([]);
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
    this.compradorService.buscar(this.texto || undefined, this.pageIndex() + 1, this.pageSize()).subscribe({
      next: (resultado) => {
        this.compradores.set(resultado.items);
        this.total.set(resultado.total);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  abrirDialogo(comprador: Comprador | null): void {
    const dialogRef = this.dialog.open(CompradorFormDialogComponent, {
      width: '36rem',
      autoFocus: 'dialog',
      data: { comprador }
    });

    dialogRef.afterClosed().subscribe((dto) => {
      if (!dto) return;

      const peticion = comprador
        ? this.compradorService.actualizar(comprador.id, dto)
        : this.compradorService.crear(dto);

      peticion.subscribe({
        next: (guardado) => {
          this.snackBar.open(`Comprador "${guardado.nombreCompleto}" ${comprador ? 'actualizado' : 'creado'}`, 'Cerrar', { duration: 3000 });
          this.cargarPagina();
        },
        error: (error) => {
          const mensaje = error?.error?.mensaje ?? 'No se pudo guardar el comprador.';
          this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
        }
      });
    });
  }
}
