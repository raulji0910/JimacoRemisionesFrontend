import { Component, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MedioPago } from '../../core/models/remision.model';

export interface PagoDialogData {
  total: number;
  email: string;
}

export interface PagoDialogResultado {
  medioPago: MedioPago;
  reciboRedeban: string | null;
}

// Cobro de una remisión: primero el medio (datáfono, QR o efectivo) y luego lo que ese medio necesita.
// Datáfono y QR pasan por el mismo datáfono Redeban, así que ambos piden el número de recibo; efectivo solo se marca.
@Component({
  selector: 'app-pago-dialog',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatButtonToggleModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Confirmar pago</h2>

    <mat-dialog-content class="dialogo-form pago">
      <div class="pago__total">{{ data.total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</div>

      <mat-button-toggle-group class="pago__medios" [(ngModel)]="medio" name="medio" aria-label="Medio de pago">
        <mat-button-toggle value="Datafono">
          <mat-icon>credit_card</mat-icon>
          Datáfono
        </mat-button-toggle>
        <mat-button-toggle value="Qr">
          <mat-icon>qr_code_2</mat-icon>
          QR
        </mat-button-toggle>
        <mat-button-toggle value="Efectivo">
          <mat-icon>payments</mat-icon>
          Efectivo
        </mat-button-toggle>
      </mat-button-toggle-group>

      @if (medio === 'Efectivo') {
        <p class="pago__texto">Confirma que recibiste el dinero en efectivo. Se enviará la remisión a {{ data.email }} y a contabilidad.</p>
      } @else {
        <p class="pago__texto">
          Confirma que el datáfono aprobó el cobro{{ medio === 'Qr' ? ' por QR' : '' }}. Se enviará la remisión a {{ data.email }} y a contabilidad.
        </p>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Número de recibo Redeban</mat-label>
          <input matInput [(ngModel)]="recibo" name="recibo" required autocomplete="off" (keyup.enter)="confirmar()" />
        </mat-form-field>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirmar()" [disabled]="!valido">Confirmar pago</button>
    </mat-dialog-actions>
  `,
  styles: `
    .pago {
      gap: 0.75rem;
    }

    .pago__total {
      font-size: 1.6rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .pago__medios {
      width: 100%;
    }

    .pago__medios .mat-button-toggle {
      flex: 1;
    }

    .pago__texto {
      margin: 0.25rem 0 0.5rem;
    }
  `
})
export class PagoDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PagoDialogComponent, PagoDialogResultado | null>);
  readonly data = inject<PagoDialogData>(MAT_DIALOG_DATA);

  medio: MedioPago = 'Datafono';
  recibo = '';

  get valido(): boolean {
    return this.medio === 'Efectivo' || !!this.recibo.trim();
  }

  confirmar(): void {
    if (!this.valido) return;
    this.dialogRef.close({ medioPago: this.medio, reciboRedeban: this.medio === 'Efectivo' ? null : this.recibo.trim() });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
