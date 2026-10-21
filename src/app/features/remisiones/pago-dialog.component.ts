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

    <mat-dialog-content class="pago">
      <div class="pago__total">
        <span class="pago__total-etiqueta">Total a cobrar</span>
        <span class="pago__total-valor">{{ data.total | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</span>
      </div>

      <div class="pago__seccion">
        <div class="pago__etiqueta">Medio de pago</div>
        <mat-button-toggle-group class="pago__medios" [(ngModel)]="medio" name="medio" aria-label="Medio de pago" hideSingleSelectionIndicator>
          <mat-button-toggle value="Datafono">
            <mat-icon>credit_card</mat-icon>
            <span>Datáfono</span>
          </mat-button-toggle>
          <mat-button-toggle value="Qr">
            <mat-icon>qr_code_2</mat-icon>
            <span>QR</span>
          </mat-button-toggle>
          <mat-button-toggle value="Efectivo">
            <mat-icon>payments</mat-icon>
            <span>Efectivo</span>
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      @if (medio === 'Efectivo') {
        <p class="pago__texto">Confirma que recibiste el dinero en efectivo.</p>
      } @else {
        <p class="pago__texto">Confirma que el datáfono aprobó el cobro{{ medio === 'Qr' ? ' por QR' : '' }} e ingresa el número del recibo.</p>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="pago__recibo">
          <mat-label>Número de recibo Redeban</mat-label>
          <input matInput [(ngModel)]="recibo" name="recibo" required autocomplete="off" inputmode="numeric" (keyup.enter)="confirmar()" />
        </mat-form-field>
      }

      <p class="pago__aviso">
        <mat-icon>mail</mat-icon>
        <span>Se enviará la remisión a {{ data.email }} y a contabilidad.</span>
      </p>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="pago__acciones">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirmar()" [disabled]="!valido">Confirmar pago</button>
    </mat-dialog-actions>
  `,
  styles: `
    .pago {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-top: 0.25rem;
    }

    .pago__total {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      padding: 0.9rem 1rem;
      border-radius: 14px;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .pago__total-etiqueta {
      font-size: 0.85rem;
    }

    .pago__total-valor {
      font-size: 1.9rem;
      font-weight: 700;
      line-height: 1.1;
    }

    .pago__seccion {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .pago__etiqueta {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }

    .pago__medios {
      width: 100%;
    }

    .pago__medios .mat-button-toggle {
      flex: 1;
    }

    /* Botones grandes: ícono arriba y nombre abajo (más fáciles de tocar y sin apretar el texto). */
    .pago__medios ::ng-deep .mat-button-toggle-label-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      padding: 0.6rem 0.25rem;
      line-height: 1.2;
    }

    .pago__medios ::ng-deep .mat-button-toggle-label-content .mat-icon {
      margin: 0;
    }

    .pago__texto {
      margin: 0;
    }

    .pago__recibo {
      width: 100%;
    }

    .pago__aviso {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0;
      font-size: 0.85rem;
      color: var(--mat-sys-on-surface-variant);
    }

    .pago__aviso .mat-icon {
      flex: none;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }

    .pago__acciones {
      padding: 1rem 1.5rem 1.25rem;
      gap: 0.5rem;
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
