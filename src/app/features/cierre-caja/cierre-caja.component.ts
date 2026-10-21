import { Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CierreCajaService } from '../../core/services/cierre-caja.service';
import { CierreCaja, CierreLinea } from '../../core/models/cierre-caja.model';
import { nombreMedioPago } from '../../core/models/remision.model';

const ICONOS: Record<string, string> = { Datafono: 'credit_card', Qr: 'qr_code_2', Efectivo: 'payments' };

// Resumen de caja de un día para conciliar: cobrado por medio, devoluciones (pagadas que se anularon ese día) y neto.
@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  templateUrl: './cierre-caja.component.html',
  styleUrl: './cierre-caja.component.scss'
})
export class CierreCajaComponent implements OnInit {
  private readonly servicio = inject(CierreCajaService);
  private readonly snackBar = inject(MatSnackBar);

  readonly cierre = signal<CierreCaja | null>(null);
  readonly cargando = signal(false);
  readonly nombreMedio = nombreMedioPago;
  readonly icono = (medio: string): string => ICONOS[medio] ?? 'payments';

  fecha = this.hoy();

  ngOnInit(): void {
    this.cargar();
  }

  // Día calendario local (en el navegador del cajero, Colombia): yyyy-MM-dd.
  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  cargar(): void {
    if (!this.fecha) return;
    this.cargando.set(true);
    this.servicio.obtener(this.fecha).subscribe({
      next: (cierre) => {
        this.cierre.set(cierre);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.snackBar.open('No se pudo cargar el cierre de caja.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  // CSV para Excel: separador ";" y BOM UTF-8 (para que las tildes se vean bien al abrirlo).
  descargarCsv(): void {
    const c = this.cierre();
    if (!c) return;
    const fila = (tipo: string, l: CierreLinea) =>
      [tipo, l.consecutivo, new Date(l.fecha).toLocaleString('es-CO'), l.cliente, nombreMedioPago(l.medio), l.recibo ?? '', l.total, l.usuario ?? '', l.anulada ? 'Anulada después' : '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';');
    const lineas = [
      ['Tipo', 'Remisión', 'Fecha y hora', 'Cliente', 'Medio de pago', 'Recibo Redeban', 'Total', 'Usuario', 'Nota'].map((v) => `"${v}"`).join(';'),
      ...c.cobros.map((l) => fila('Cobro', l)),
      ...c.devoluciones.map((l) => fila('Devolución', l))
    ];
    const blob = new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cierre-caja-${c.fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
