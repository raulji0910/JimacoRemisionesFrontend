import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { RemisionService } from '../../core/services/remision.service';
import { AuthService } from '../../core/services/auth.service';
import { RemisionDetalle } from '../../core/models/remision.model';
import { TextoDialogComponent } from '../../core/dialogs/texto-dialog.component';

@Component({
  selector: 'app-remision-detalle',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule
  ],
  templateUrl: './remision-detalle.component.html',
  styleUrl: './remision-detalle.component.scss'
})
export class RemisionDetalleComponent implements OnInit {
  private readonly remisionService = inject(RemisionService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly remision = signal<RemisionDetalle | null>(null);
  readonly cargando = signal(true);
  readonly ocupado = signal(false);

  readonly esPendiente = computed(() => this.remision()?.estadoPago === 'Pendiente');
  readonly esPagada = computed(() => this.remision()?.estadoPago === 'Pagada');
  readonly esAnulada = computed(() => this.remision()?.estadoPago === 'Anulada');
  readonly entregaPendiente = computed(() => this.esPagada() && this.remision()?.estadoEntrega === 'Pendiente');
  // Pagada: solo admin anula (regla del backend). Pendiente: cualquiera.
  readonly puedeAnular = computed(() => this.esPendiente() || (this.esPagada() && this.authService.esAdmin));
  readonly hayMargen = computed(() => this.remision()?.items.some((i) => i.margenPorcentaje !== null) ?? false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.remisionService.obtenerPorId(id).subscribe({
      next: (remision) => {
        this.remision.set(remision);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.router.navigate(['/remisiones']);
      }
    });
  }

  verPdf(): void {
    const r = this.remision();
    if (!r) return;
    this.remisionService.obtenerPdf(r.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.snackBar.open('No se pudo generar el PDF.', 'Cerrar', { duration: 4000 })
    });
  }

  marcarPagada(): void {
    const r = this.remision();
    if (!r) return;

    const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.totalGeneral);
    this.dialog
      .open(TextoDialogComponent, {
        width: '28rem',
        data: {
          titulo: 'Confirmar pago',
          mensaje: `Confirma que el datáfono aprobó el cobro de ${total}. Al confirmar se enviará la remisión a ${r.compradorEmail}.`,
          etiqueta: 'Número de aprobación / voucher (opcional)',
          obligatorio: false,
          textoConfirmar: 'Marcar como pagada'
        }
      })
      .afterClosed()
      .subscribe((referencia: string | null) => {
        if (referencia === null || referencia === undefined) return;

        this.ocupado.set(true);
        this.remisionService.pagar(r.id, referencia || null).subscribe({
          next: (resultado) => {
            this.remision.set(resultado.remision);
            this.ocupado.set(false);
            this.avisarCorreo(resultado.correoEnviado, resultado.errorCorreo, resultado.remision.compradorEmail, 'Pago registrado');
          },
          error: (error) => this.manejarError(error, 'No se pudo registrar el pago.')
        });
      });
  }

  enviarCorreo(): void {
    const r = this.remision();
    if (!r) return;

    this.ocupado.set(true);
    this.remisionService.enviarCorreo(r.id).subscribe({
      next: (resultado) => {
        this.remision.set(resultado.remision);
        this.ocupado.set(false);
        this.avisarCorreo(resultado.correoEnviado, resultado.errorCorreo, resultado.remision.compradorEmail, null);
      },
      error: (error) => this.manejarError(error, 'No se pudo enviar el correo.')
    });
  }

  private avisarCorreo(enviado: boolean, error: string | null, email: string, prefijo: string | null): void {
    if (enviado) {
      this.snackBar.open(`${prefijo ? prefijo + '. ' : ''}Remisión enviada a ${email}`, 'Cerrar', { duration: 4000 });
    } else {
      this.snackBar.open(
        `${prefijo ? prefijo + ', pero ' : ''}no se pudo enviar el correo: ${error ?? 'error desconocido'}`,
        'Cerrar',
        { duration: 8000 }
      );
    }
  }

  marcarEntregada(): void {
    this.ejecutar(this.remisionService.entregar(this.remision()!.id), 'Remisión marcada como entregada', 'No se pudo marcar como entregada.');
  }

  cambiarEntrega(): void {
    const r = this.remision();
    if (!r) return;
    const nuevo = r.tipoEntrega === 'EnSitio' ? 'Envio' : 'EnSitio';
    this.ejecutar(this.remisionService.cambiarTipoEntrega(r.id, nuevo), 'Tipo de entrega actualizado', 'No se pudo cambiar el tipo de entrega.');
  }

  anular(): void {
    const r = this.remision();
    if (!r) return;

    this.dialog
      .open(TextoDialogComponent, {
        width: '28rem',
        data: {
          titulo: `Anular ${r.consecutivoFormateado}`,
          mensaje: r.estadoPago === 'Pagada' ? 'Esta remisión ya está pagada: recuerda devolver el dinero al cliente por el datáfono.' : undefined,
          etiqueta: 'Motivo de la anulación',
          obligatorio: true,
          textoConfirmar: 'Anular remisión',
          colorConfirmar: 'warn'
        }
      })
      .afterClosed()
      .subscribe((motivo: string | null) => {
        if (!motivo) return;
        this.ejecutar(this.remisionService.anular(r.id, motivo), 'Remisión anulada', 'No se pudo anular la remisión.');
      });
  }

  private ejecutar(peticion: Observable<RemisionDetalle>, exito: string, fallo: string): void {
    this.ocupado.set(true);
    peticion.subscribe({
      next: (actualizada) => {
        this.remision.set(actualizada);
        this.ocupado.set(false);
        this.snackBar.open(exito, 'Cerrar', { duration: 3000 });
      },
      error: (error) => this.manejarError(error, fallo)
    });
  }

  private manejarError(error: { error?: { mensaje?: string } }, porDefecto: string): void {
    this.ocupado.set(false);
    this.snackBar.open(error?.error?.mensaje ?? porDefecto, 'Cerrar', { duration: 6000 });
  }
}
