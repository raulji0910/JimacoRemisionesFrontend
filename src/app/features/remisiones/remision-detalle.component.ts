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
import { RemisionDetalle, nombreMedioPago } from '../../core/models/remision.model';
import { TextoDialogComponent } from '../../core/dialogs/texto-dialog.component';
import { PagoDialogComponent, PagoDialogResultado } from './pago-dialog.component';
import { environment } from '../../../environments/environment';
import { enlaceWhatsApp, normalizarCelular } from '../../core/utils/whatsapp';

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
        this.prepararEnlace(remision);
      },
      error: () => {
        this.cargando.set(false);
        this.router.navigate(['/remisiones']);
      }
    });
  }

  // Token del enlace público del PDF, pedido por adelantado para poder abrir WhatsApp en el mismo clic
  // (sin abrir antes una pestaña en blanco que luego se queda ahí al volver desde la app).
  private readonly tokenPdf = signal<string | null>(null);
  readonly enviandoCorreo = signal(false);
  readonly nombreMedio = nombreMedioPago;

  private prepararEnlace(r: RemisionDetalle): void {
    if (r.estadoPago !== 'Pagada' || this.tokenPdf()) return;
    this.remisionService.obtenerEnlacePublico(r.id).subscribe({
      next: ({ token }) => this.tokenPdf.set(token),
      error: () => this.tokenPdf.set(null)
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

    this.dialog
      .open(PagoDialogComponent, { width: '30rem', maxWidth: '95vw', data: { total: r.totalGeneral, email: r.compradorEmail } })
      .afterClosed()
      .subscribe((pago: PagoDialogResultado | null) => {
        if (!pago) return;

        this.ocupado.set(true);
        this.remisionService.pagar(r.id, pago.medioPago, pago.reciboRedeban).subscribe({
          next: (resultado) => {
            this.remision.set(resultado.remision);
            this.ocupado.set(false);
            this.prepararEnlace(resultado.remision);
            if (resultado.correoEnCola) {
              this.snackBar.open('Pago registrado. La remisión se está enviando por correo; puede tardar un poco.', 'Cerrar', { duration: 5000 });
              this.seguirEnvioCorreo(resultado.remision.id);
            } else {
              this.avisarCorreo(resultado.correoEnviado, resultado.errorCorreo, resultado.remision.compradorEmail, 'Pago registrado');
            }
          },
          error: (error) => this.manejarError(error, 'No se pudo registrar el pago.')
        });
      });
  }

  private mensajeWhatsApp(r: RemisionDetalle, enlace: string | null): string {
    const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(r.totalGeneral);
    const base = `Hola ${r.compradorNombre}, gracias por su compra en Jimaco. Su remisión ${r.consecutivoFormateado} por ${total} ${r.medioPago === 'Efectivo' ? '(pago en efectivo)' : `(recibo Redeban ${r.reciboRedeban})`}.`;
    return enlace ? `${base} Puede verla aquí: ${enlace}` : base;
  }

  // Abre el chat del cliente con el mensaje y el enlace al PDF ya escritos. En celular abre la app de WhatsApp
  // directamente (esquema whatsapp://), sin crear pestañas: al volver sigues en esta pantalla. Si WhatsApp no
  // está instalado (la página sigue visible tras un momento) se usa wa.me como respaldo. En computador, WhatsApp Web.
  enviarWhatsApp(): void {
    const r = this.remision();
    if (!r) return;
    const celular = normalizarCelular(r.compradorTelefono);
    if (!celular) {
      this.snackBar.open('El cliente no tiene un celular válido. Edítalo en Compradores.', 'Cerrar', { duration: 5000 });
      return;
    }
    const token = this.tokenPdf();
    if (!token) {
      this.prepararEnlace(r);
      this.snackBar.open('Preparando el enlace, intenta de nuevo en un instante.', 'Cerrar', { duration: 3000 });
      return;
    }

    const enlace = new URL(`${environment.apiUrl}/publico/remisiones/${r.id}/pdf?t=${token}`, window.location.origin).href;
    const mensaje = this.mensajeWhatsApp(r, enlace);
    const web = enlaceWhatsApp(celular, mensaje);

    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.open(web, '_blank', 'noopener');
      return;
    }

    const respaldo = window.setTimeout(() => window.open(web, '_blank', 'noopener'), 1500);
    // Si la app se abrió, la página pasa a segundo plano: se cancela el respaldo (si no, al volver se abriría una pestaña de más).
    document.addEventListener('visibilitychange', () => window.clearTimeout(respaldo), { once: true });
    window.location.href = `whatsapp://send?phone=57${celular}&text=${encodeURIComponent(mensaje)}`;
  }

  // Abre el menú de compartir del celular con el PDF adjunto; el operador elige WhatsApp y el chat.
  compartirPdf(): void {
    const r = this.remision();
    if (!r) return;
    this.remisionService.obtenerPdf(r.id).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], `${r.consecutivoFormateado}.pdf`, { type: 'application/pdf' });
        if (!navigator.canShare?.({ files: [archivo] })) {
          this.snackBar.open('Este navegador no permite compartir archivos. Usa el botón WhatsApp o abre esto desde el celular.', 'Cerrar', { duration: 6000 });
          return;
        }
        try {
          await navigator.share({ files: [archivo], text: this.mensajeWhatsApp(r, null) });
        } catch (error) {
          // AbortError = el usuario cerró el menú de compartir; no es un fallo.
          if ((error as DOMException).name !== 'AbortError')
            this.snackBar.open('No se pudo compartir el PDF.', 'Cerrar', { duration: 4000 });
        }
      },
      error: () => this.snackBar.open('No se pudo generar el PDF.', 'Cerrar', { duration: 4000 })
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

  // El correo sale en segundo plano: se consulta la remisión unos segundos hasta que quede marcada como enviada.
  private seguirEnvioCorreo(id: number, intento = 1): void {
    this.enviandoCorreo.set(true);
    setTimeout(() => {
      this.remisionService.obtenerPorId(id).subscribe({
        next: (actual) => {
          if (this.remision()?.id !== id) return;
          if (actual.correoEnviadoEn) {
            this.remision.set(actual);
            this.enviandoCorreo.set(false);
            this.snackBar.open(`Remisión enviada a ${actual.compradorEmail}`, 'Cerrar', { duration: 4000 });
          } else if (intento < 30) {
            this.seguirEnvioCorreo(id, intento + 1);
          } else {
            this.enviandoCorreo.set(false);
            this.snackBar.open('El correo aún no confirma el envío. Si el cliente no lo recibe, usa "Enviar correo" para reintentar.', 'Cerrar', { duration: 8000 });
          }
        },
        error: () => this.enviandoCorreo.set(false)
      });
    }, 3000);
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
