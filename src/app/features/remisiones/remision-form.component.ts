import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CompradorService } from '../../core/services/comprador.service';
import { ProductoService } from '../../core/services/producto.service';
import { RemisionService } from '../../core/services/remision.service';
import { Comprador } from '../../core/models/comprador.model';
import { Producto } from '../../core/models/producto.model';
import { RemisionGuardar, TipoEntrega } from '../../core/models/remision.model';
import { calcularRemision } from '../../core/utils/calculos-remision';
import { CompradorFormDialogComponent } from '../compradores/comprador-form-dialog.component';

interface Linea {
  productoId: number;
  codigo: string;
  nombre: string;
  precioUnitario: number;
  iva: number;
  cantidad: number;
}

// Arma (o edita, mientras esté por cobrar) una remisión: comprador, productos, descuento y tipo
// de entrega. El pago se marca después, desde el detalle.
@Component({
  selector: 'app-remision-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CurrencyPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressBarModule
  ],
  templateUrl: './remision-form.component.html',
  styleUrl: './remision-form.component.scss'
})
export class RemisionFormComponent implements OnInit {
  private readonly compradorService = inject(CompradorService);
  private readonly productoService = inject(ProductoService);
  private readonly remisionService = inject(RemisionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly editandoId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly guardando = signal(false);

  readonly comprador = signal<Comprador | null>(null);
  readonly lineas = signal<Linea[]>([]);
  readonly descuento = signal(0);
  tipoEntrega: TipoEntrega = 'EnSitio';
  nota = '';

  readonly buscadorComprador = new FormControl<string | Comprador>('', { nonNullable: true });
  readonly buscadorProducto = new FormControl<string | Producto>('', { nonNullable: true });
  readonly compradoresEncontrados = signal<Comprador[]>([]);
  readonly productosEncontrados = signal<Producto[]>([]);

  readonly calculo = computed(() =>
    calcularRemision(
      this.lineas().map((l) => ({ precioUnitario: l.precioUnitario, cantidad: l.cantidad, iva: l.iva })),
      this.descuento()
    )
  );

  readonly descuentoInvalido = computed(
    () => this.descuento() < 0 || this.descuento() > this.calculo().subtotalItems
  );

  readonly puedeGuardar = computed(
    () => !!this.comprador() && this.lineas().length > 0 && !this.descuentoInvalido() && !this.guardando()
  );

  ngOnInit(): void {
    this.buscadorComprador.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((texto) => (texto.trim().length >= 2 ? this.compradorService.buscar(texto.trim(), 1, 8) : of(null)))
      )
      .subscribe((resultado) => this.compradoresEncontrados.set(resultado?.items.filter((c) => c.activo) ?? []));

    this.buscadorProducto.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((texto) =>
          texto.trim().length >= 1 ? this.productoService.buscar(texto.trim(), 1, 10, true) : of(null)
        )
      )
      .subscribe((resultado) => this.productosEncontrados.set(resultado?.items ?? []));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargarParaEditar(Number(id));
  }

  private cargarParaEditar(id: number): void {
    this.editandoId.set(id);
    this.cargando.set(true);
    this.remisionService.obtenerPorId(id).subscribe({
      next: (remision) => {
        if (remision.estadoPago !== 'Pendiente') {
          this.snackBar.open('Solo se puede editar una remisión por cobrar.', 'Cerrar', { duration: 4000 });
          this.router.navigate(['/remisiones', id]);
          return;
        }

        this.tipoEntrega = remision.tipoEntrega;
        this.nota = remision.nota ?? '';
        this.descuento.set(remision.descuento);
        this.lineas.set(
          remision.items.map((i) => ({
            productoId: i.productoId,
            codigo: i.productoCodigo,
            nombre: i.productoNombre,
            precioUnitario: i.precioUnitario,
            iva: i.iva,
            cantidad: i.cantidad
          }))
        );
        this.compradorService.obtenerPorId(remision.compradorId).subscribe((c) => this.comprador.set(c));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  // ---- Comprador ----

  mostrarComprador = (valor: string | Comprador | null): string =>
    valor && typeof valor !== 'string' ? `${valor.tipoDocumento} ${valor.numeroDocumento} — ${valor.nombreCompleto}` : (valor ?? '');

  elegirComprador(evento: MatAutocompleteSelectedEvent): void {
    this.comprador.set(evento.option.value as Comprador);
    this.buscadorComprador.setValue('', { emitEvent: false });
    this.compradoresEncontrados.set([]);
  }

  cambiarComprador(): void {
    this.comprador.set(null);
  }

  nuevoComprador(): void {
    const texto = this.buscadorComprador.value;
    const numeroInicial = typeof texto === 'string' && /^[\d.\-\s]+$/.test(texto) ? texto.trim() : undefined;
    this.abrirDialogoComprador(null, numeroInicial);
  }

  editarComprador(): void {
    const actual = this.comprador();
    if (actual) this.abrirDialogoComprador(actual);
  }

  private abrirDialogoComprador(comprador: Comprador | null, numeroDocumentoInicial?: string): void {
    const dialogRef = this.dialog.open(CompradorFormDialogComponent, {
      width: '36rem',
      autoFocus: 'dialog',
      data: { comprador, numeroDocumentoInicial }
    });

    dialogRef.afterClosed().subscribe((dto) => {
      if (!dto) return;

      const peticion = comprador
        ? this.compradorService.actualizar(comprador.id, dto)
        : this.compradorService.crear(dto);

      peticion.subscribe({
        next: (guardado) => {
          this.comprador.set(guardado);
          this.buscadorComprador.setValue('', { emitEvent: false });
          this.snackBar.open(`Comprador "${guardado.nombreCompleto}" ${comprador ? 'actualizado' : 'creado'}`, 'Cerrar', { duration: 3000 });
        },
        error: (error) => {
          this.snackBar.open(error?.error?.mensaje ?? 'No se pudo guardar el comprador.', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }

  // ---- Productos ----

  mostrarProducto = (): string => '';

  agregarProducto(evento: MatAutocompleteSelectedEvent): void {
    const producto = evento.option.value as Producto;
    this.lineas.update((lineas) => {
      const existente = lineas.find((l) => l.productoId === producto.id);
      if (existente) {
        return lineas.map((l) => (l === existente ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [
        ...lineas,
        {
          productoId: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          precioUnitario: producto.precioVenta,
          iva: producto.iva,
          cantidad: 1
        }
      ];
    });
    this.buscadorProducto.setValue('', { emitEvent: false });
    this.productosEncontrados.set([]);
  }

  cambiarCantidad(linea: Linea, valor: number | string): void {
    const cantidad = Math.max(1, Math.floor(Number(valor)) || 1);
    this.lineas.update((lineas) => lineas.map((l) => (l === linea ? { ...l, cantidad } : l)));
  }

  quitarLinea(linea: Linea): void {
    this.lineas.update((lineas) => lineas.filter((l) => l !== linea));
  }

  cambiarDescuento(valor: number | string): void {
    this.descuento.set(Math.max(0, Number(valor) || 0));
  }

  // ---- Guardar ----

  guardar(): void {
    const comprador = this.comprador();
    if (!comprador || !this.puedeGuardar()) return;

    const dto: RemisionGuardar = {
      compradorId: comprador.id,
      tipoEntrega: this.tipoEntrega,
      descuento: this.descuento(),
      nota: this.nota.trim() || null,
      items: this.lineas().map((l) => ({ productoId: l.productoId, cantidad: l.cantidad }))
    };

    this.guardando.set(true);
    const id = this.editandoId();
    const peticion = id ? this.remisionService.actualizar(id, dto) : this.remisionService.crear(dto);

    peticion.subscribe({
      next: (remision) => {
        this.snackBar.open(`Remisión ${remision.consecutivoFormateado} ${id ? 'actualizada' : 'creada'}`, 'Cerrar', { duration: 3000 });
        this.router.navigate(['/remisiones', remision.id]);
      },
      error: (error) => {
        this.guardando.set(false);
        this.snackBar.open(error?.error?.mensaje ?? 'No se pudo guardar la remisión.', 'Cerrar', { duration: 5000 });
      }
    });
  }
}
