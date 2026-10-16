import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Producto } from '../../core/models/producto.model';
import { MovimientoManual } from '../../core/models/inventario.model';

export interface AjusteStockDialogData {
  producto: Producto;
}

// Entrada de mercancía (suma) o ajuste por conteo físico (corrige a un valor, o suma/resta). Solo Admin.
@Component({
  selector: 'app-ajuste-stock-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatButtonToggleModule],
  template: `
    <h2 mat-dialog-title>Stock de {{ data.producto.codigo }}</h2>

    <mat-dialog-content class="dialogo-form">
      <p class="ajuste__producto">
        {{ data.producto.nombre }}<br />
        Stock actual: <strong>{{ data.producto.stock }}</strong>
      </p>

      <mat-button-toggle-group [(ngModel)]="tipo" name="tipo" aria-label="Tipo de movimiento" class="ajuste__tipo">
        <mat-button-toggle value="Entrada">Llegó mercancía</mat-button-toggle>
        <mat-button-toggle value="Ajuste">Ajuste por conteo</mat-button-toggle>
      </mat-button-toggle-group>

      @if (tipo() === 'Entrada') {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="dialogo-form__campo">
          <mat-label>Unidades que llegaron</mat-label>
          <input matInput type="number" min="1" step="1" [ngModel]="cantidad()" (ngModelChange)="cantidad.set($event)" name="cantidad" />
        </mat-form-field>
      } @else {
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="dialogo-form__campo">
          <mat-label>Stock real contado</mat-label>
          <input matInput type="number" min="0" step="1" [ngModel]="contado()" (ngModelChange)="contado.set($event)" name="contado" />
          <mat-hint>Se registra la diferencia contra el stock actual</mat-hint>
        </mat-form-field>
      }

      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="dialogo-form__campo">
        <mat-label>Motivo {{ tipo() === 'Ajuste' ? '(obligatorio)' : '(opcional)' }}</mat-label>
        <input matInput [ngModel]="motivo()" (ngModelChange)="motivo.set($event)" name="motivo" maxlength="500" />
      </mat-form-field>

      @if (resumen(); as texto) {
        <p class="ajuste__resumen">{{ texto }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="!valido()">Registrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .ajuste__producto {
        margin: 0 0 1rem;
        font-size: 0.9rem;
        color: var(--mat-sys-on-surface-variant);
      }
      .ajuste__tipo {
        margin-bottom: 1rem;
      }
      .ajuste__resumen {
        margin: 0.25rem 0 0;
        font-weight: 500;
      }
    `
  ]
})
export class AjusteStockDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AjusteStockDialogComponent>);
  readonly data = inject<AjusteStockDialogData>(MAT_DIALOG_DATA);

  readonly tipo = signal<'Entrada' | 'Ajuste'>('Entrada');
  readonly cantidad = signal<number | null>(null);
  readonly contado = signal<number | null>(null);
  readonly motivo = signal('');

  // Diferencia que se va a registrar (con signo).
  private readonly delta = computed(() => {
    if (this.tipo() === 'Entrada') return this.cantidad() ?? 0;
    const contado = this.contado();
    return contado === null ? 0 : contado - this.data.producto.stock;
  });

  readonly valido = computed(() => {
    const delta = this.delta();
    if (this.tipo() === 'Entrada') return Number.isInteger(delta) && delta > 0;
    return Number.isInteger(delta) && delta !== 0 && (this.contado() ?? -1) >= 0 && this.motivo().trim().length > 0;
  });

  readonly resumen = computed(() => {
    const delta = this.delta();
    if (!delta) return null;
    const nuevo = this.data.producto.stock + delta;
    return `Quedará en ${nuevo} unidades (${delta > 0 ? '+' : ''}${delta}).`;
  });

  guardar(): void {
    if (!this.valido()) return;
    const dto: MovimientoManual = {
      tipo: this.tipo(),
      cantidad: this.delta(),
      motivo: this.motivo().trim() || null
    };
    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
