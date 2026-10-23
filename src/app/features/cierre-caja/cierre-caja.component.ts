import { Component, OnInit, computed, inject, signal } from '@angular/core';
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

type Atajo = 'hoy' | 'ayer' | 'semana' | 'mes' | 'mesPasado';

// Resumen de caja de un rango de fechas para conciliar: cobrado por medio, devoluciones (pagadas que se anularon en el rango),
// neto, detalle por día y por usuario (quién tramitó cada cobro).
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
  readonly atajos: { clave: Atajo; etiqueta: string }[] = [
    { clave: 'hoy', etiqueta: 'Hoy' },
    { clave: 'ayer', etiqueta: 'Ayer' },
    { clave: 'semana', etiqueta: 'Esta semana' },
    { clave: 'mes', etiqueta: 'Este mes' },
    { clave: 'mesPasado', etiqueta: 'Mes pasado' }
  ];

  desde = this.formatear(new Date());
  hasta = this.desde;
  atajoActivo: Atajo | null = 'hoy';

  // Solo los días con movimiento (los demás se resumen en un contador para que el rango largo no sea una lista interminable).
  readonly diasConMovimiento = computed(() => this.cierre()?.porDia.filter((d) => d.cobros > 0 || d.devoluciones > 0) ?? []);
  readonly diasSinMovimiento = computed(() => (this.cierre()?.porDia.length ?? 0) - this.diasConMovimiento().length);

  ngOnInit(): void {
    this.cargar();
  }

  // Día calendario local (en el navegador del cajero, Colombia): yyyy-MM-dd.
  private formatear(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  aplicarAtajo(clave: Atajo): void {
    const hoy = new Date();
    const dia = (y: number, m: number, d: number) => new Date(y, m, d);
    let a = hoy;
    let b = hoy;
    switch (clave) {
      case 'ayer':
        a = b = dia(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
        break;
      case 'semana': {
        // La semana empieza el lunes.
        const retroceso = (hoy.getDay() + 6) % 7;
        a = dia(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - retroceso);
        break;
      }
      case 'mes':
        a = dia(hoy.getFullYear(), hoy.getMonth(), 1);
        break;
      case 'mesPasado':
        a = dia(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        b = dia(hoy.getFullYear(), hoy.getMonth(), 0);
        break;
    }
    this.desde = this.formatear(a);
    this.hasta = this.formatear(b);
    this.atajoActivo = clave;
    this.cargar();
  }

  alCambiarFechas(): void {
    this.atajoActivo = null;
    this.cargar();
  }

  cargar(): void {
    if (!this.desde || !this.hasta) return;
    this.cargando.set(true);
    this.servicio.obtener(this.desde, this.hasta).subscribe({
      next: (cierre) => {
        this.cierre.set(cierre);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.cierre.set(null);
        this.snackBar.open(error?.error?.mensaje ?? 'No se pudo cargar el cierre de caja.', 'Cerrar', { duration: 5000 });
      }
    });
  }

  // CSV para Excel: separador ";" y BOM UTF-8 (para que las tildes se vean bien al abrirlo). Trae el resumen por día,
  // por usuario y el detalle de cobros y devoluciones.
  descargarCsv(): void {
    const c = this.cierre();
    if (!c) return;
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const fila = (...v: (string | number)[]) => v.map(q).join(';');
    const linea = (tipo: string, l: CierreLinea) =>
      fila(tipo, l.consecutivo, new Date(l.fecha).toLocaleString('es-CO'), l.cliente, nombreMedioPago(l.medio), l.recibo ?? '', l.total, l.usuario ?? '', l.vendedor ?? '', l.anulada ? 'Anulada después' : '');

    const lineas = [
      fila('Cierre de caja', `${c.desde} a ${c.hasta}`),
      '',
      fila('Resumen por medio', 'Cobros', 'Total cobrado', 'Devoluciones', 'Total devuelto', 'Neto'),
      ...c.porMedio.map((m) => fila(nombreMedioPago(m.medio), m.cantidadCobros, m.totalCobros, m.cantidadDevoluciones, m.totalDevoluciones, m.neto)),
      fila('TOTAL', '', c.totalCobros, '', c.totalDevoluciones, c.neto),
      '',
      fila('Por día', 'Cobros', 'Datáfono', 'QR', 'Efectivo', 'Total cobrado', 'Devoluciones', 'Neto'),
      ...c.porDia.map((d) => fila(d.fecha, d.cobros, d.datafono, d.qr, d.efectivo, d.totalCobros, d.devoluciones, d.neto)),
      '',
      fila('Por usuario (quién cobró)', 'Cobros', 'Datáfono', 'QR', 'Efectivo', 'Total cobrado'),
      ...c.porUsuario.map((u) => fila(u.usuario, u.cantidadCobros, u.datafono, u.qr, u.efectivo, u.totalCobros)),
      '',
      fila('Tipo', 'Remisión', 'Fecha y hora', 'Cliente', 'Medio de pago', 'Recibo Redeban', 'Total', 'Cobró', 'Vendedor', 'Nota'),
      ...c.cobros.map((l) => linea('Cobro', l)),
      ...c.devoluciones.map((l) => linea('Devolución', l))
    ];
    const blob = new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = c.desde === c.hasta ? `cierre-caja-${c.desde}.csv` : `cierre-caja-${c.desde}_a_${c.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
