import { descuentoDeLinea } from '../../core/utils/calculos-remision';
import { CONCEPTOS_RETEFUENTE, RETEIVA_GENERAL, TOPE_RETEFUENTE, TOPE_RETEICA_POR_MIL, TOPE_RETEIVA } from '../../core/utils/retenciones';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
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
  // Descuento de esta línea: % (0-50) sobre su valor antes de IVA.
  descuentoPct: number;
  // Stock del producto al agregarlo (null al editar una remisión: ahí lo valida el servidor).
  existencia: number | null;
}

// Arma (o edita, mientras esté por cobrar) una remisión: comprador, productos (con descuento por ítem) y tipo
// de entrega. El pago se marca después, desde el detalle.
@Component({
  selector: 'app-remision-form',
  standalone: true,
  imports: [
    MatCheckboxModule,
    MatSelectModule,
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
  // Retenciones: el vendedor activa solo las que apliquen a ese cliente (las practica el comprador).
  readonly conceptosReteFuente = CONCEPTOS_RETEFUENTE;
  readonly usarReteFuente = signal(false);
  readonly conceptoReteFuente = signal('compras-declarante');
  readonly reteFuentePct = signal(0);
  readonly usarReteIca = signal(false);
  readonly reteIcaPorMil = signal(0);
  readonly usarReteIva = signal(false);
  readonly reteIvaPct = signal(0);
  tipoEntrega: TipoEntrega = 'EnSitio';
  nota = '';

  readonly buscadorComprador = new FormControl<string | Comprador>('', { nonNullable: true });
  readonly buscadorProducto = new FormControl<string | Producto>('', { nonNullable: true });
  readonly compradoresEncontrados = signal<Comprador[]>([]);
  readonly productosEncontrados = signal<Producto[]>([]);

  readonly calculo = computed(() =>
    calcularRemision(
      this.lineas().map((l) => ({ precioUnitario: l.precioUnitario, cantidad: l.cantidad, iva: l.iva, descuentoPorcentaje: l.descuentoPct })),
      this.usarReteFuente() ? this.reteFuentePct() : 0,
      this.usarReteIca() ? this.reteIcaPorMil() : 0,
      this.usarReteIva() ? this.reteIvaPct() : 0
    )
  );

  // Descuento por ítem: 0 a 50 %. Cada retención activada debe tener un valor mayor a 0 y dentro de su tope.
  readonly descuentoInvalido = computed(() => this.lineas().some((l) => l.descuentoPct < 0 || l.descuentoPct > 50));
  readonly reteFuenteInvalida = computed(() => this.usarReteFuente() && (this.reteFuentePct() <= 0 || this.reteFuentePct() > TOPE_RETEFUENTE));
  readonly reteIcaInvalida = computed(() => this.usarReteIca() && (this.reteIcaPorMil() <= 0 || this.reteIcaPorMil() > TOPE_RETEICA_POR_MIL));
  readonly reteIvaInvalida = computed(() => this.usarReteIva() && (this.reteIvaPct() <= 0 || this.reteIvaPct() > TOPE_RETEIVA));
  readonly retencionesInvalidas = computed(() => this.reteFuenteInvalida() || this.reteIcaInvalida() || this.reteIvaInvalida());
  readonly hayRetenciones = computed(() => this.calculo().reteFuente > 0 || this.calculo().reteIca > 0 || this.calculo().reteIva > 0);

  readonly puedeGuardar = computed(
    () =>
      !!this.comprador()?.email &&
      this.lineas().length > 0 &&
      !this.descuentoInvalido() &&
      !this.retencionesInvalidas() &&
      !this.guardando() &&
      !this.lineas().some((l) => l.existencia !== null && l.cantidad > l.existencia)
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
        this.usarReteFuente.set(remision.reteFuentePorcentaje > 0);
        this.reteFuentePct.set(remision.reteFuentePorcentaje);
        // Sin ReteFuente guardada se deja el concepto por defecto (al activarla se rellena su tarifa); con una guardada, el concepto que coincida o "Otro".
        this.conceptoReteFuente.set(
          remision.reteFuentePorcentaje > 0
            ? (CONCEPTOS_RETEFUENTE.find((c) => c.porcentaje === remision.reteFuentePorcentaje)?.clave ?? 'otro')
            : 'compras-declarante'
        );
        this.usarReteIca.set(remision.reteIcaPorMil > 0);
        this.reteIcaPorMil.set(remision.reteIcaPorMil);
        this.usarReteIva.set(remision.reteIvaPorcentaje > 0);
        this.reteIvaPct.set(remision.reteIvaPorcentaje);
        this.lineas.set(
          remision.items.map((i) => ({
            productoId: i.productoId,
            codigo: i.productoCodigo,
            nombre: i.productoNombre,
            precioUnitario: i.precioUnitario,
            iva: i.iva,
            cantidad: i.cantidad,
            descuentoPct: i.descuentoPorcentaje,
            existencia: null
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
          cantidad: 1,
          descuentoPct: 0,
          existencia: producto.stock
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

  // Descuento de una línea: % entre 0 y 50 sobre su valor antes de IVA.
  cambiarDescuentoLinea(linea: Linea, valor: number | string): void {
    const descuentoPct = Math.min(50, Math.max(0, Number(valor) || 0));
    this.lineas.update((lineas) => lineas.map((l) => (l === linea ? { ...l, descuentoPct } : l)));
  }

  // Valor de la línea ya descontado (lo que se muestra como subtotal).
  netoDeLinea(l: Linea): number {
    const calculo = { precioUnitario: l.precioUnitario, cantidad: l.cantidad, iva: l.iva, descuentoPorcentaje: l.descuentoPct };
    return l.precioUnitario * l.cantidad - descuentoDeLinea(calculo);
  }

  alternarReteFuente(activa: boolean): void {
    this.usarReteFuente.set(activa);
    if (!activa) {
      this.reteFuentePct.set(0);
    } else {
      this.elegirConceptoReteFuente(this.conceptoReteFuente());
    }
  }

  // Al elegir un concepto se rellena su tarifa; "Otro" deja el porcentaje para digitarlo.
  elegirConceptoReteFuente(clave: string): void {
    this.conceptoReteFuente.set(clave);
    const concepto = CONCEPTOS_RETEFUENTE.find((c) => c.clave === clave);
    if (concepto?.porcentaje != null) this.reteFuentePct.set(concepto.porcentaje);
  }

  cambiarReteFuente(valor: number | string): void {
    this.reteFuentePct.set(Math.max(0, Number(valor) || 0));
    // Si el porcentaje digitado ya no corresponde al concepto elegido, queda como "Otro".
    const actual = CONCEPTOS_RETEFUENTE.find((c) => c.clave === this.conceptoReteFuente());
    if (actual?.porcentaje != null && actual.porcentaje !== this.reteFuentePct()) this.conceptoReteFuente.set('otro');
  }

  alternarReteIca(activa: boolean): void {
    this.usarReteIca.set(activa);
    if (!activa) this.reteIcaPorMil.set(0);
  }

  cambiarReteIca(valor: number | string): void {
    this.reteIcaPorMil.set(Math.max(0, Number(valor) || 0));
  }

  alternarReteIva(activa: boolean): void {
    this.usarReteIva.set(activa);
    this.reteIvaPct.set(activa ? RETEIVA_GENERAL : 0);
  }

  cambiarReteIva(valor: number | string): void {
    this.reteIvaPct.set(Math.max(0, Number(valor) || 0));
  }

  // ---- Guardar ----

  guardar(): void {
    const comprador = this.comprador();
    if (!comprador || !this.puedeGuardar()) return;

    const dto: RemisionGuardar = {
      compradorId: comprador.id,
      tipoEntrega: this.tipoEntrega,
      reteFuentePorcentaje: this.usarReteFuente() ? this.reteFuentePct() : 0,
      reteIcaPorMil: this.usarReteIca() ? this.reteIcaPorMil() : 0,
      reteIvaPorcentaje: this.usarReteIva() ? this.reteIvaPct() : 0,
      nota: this.nota.trim() || null,
      items: this.lineas().map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, descuentoPorcentaje: l.descuentoPct }))
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
