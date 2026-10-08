import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface TextoDialogData {
  titulo: string;
  mensaje?: string;
  etiqueta: string;
  obligatorio: boolean;
  textoConfirmar: string;
  colorConfirmar?: 'warn' | 'primary';
  ayuda?: string;
}

// Pide un texto corto antes de ejecutar una acción (referencia del voucher al cobrar, motivo al
// anular). Cierra con el texto escrito ('' si era opcional y quedó vacío) o null si cancela.
@Component({
  selector: 'app-texto-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>

    <mat-dialog-content class="dialogo-form">
      @if (data.mensaje) {
        <p>{{ data.mensaje }}</p>
      }
      <mat-form-field appearance="outline" class="dialogo-form__campo">
        <mat-label>{{ data.etiqueta }}</mat-label>
        <input matInput [(ngModel)]="texto" name="texto" [required]="data.obligatorio" (keyup.enter)="confirmar()" />
        @if (data.ayuda) {
          <mat-hint>{{ data.ayuda }}</mat-hint>
        }
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-flat-button [color]="data.colorConfirmar || 'primary'" (click)="confirmar()" [disabled]="data.obligatorio && !texto.trim()">
        {{ data.textoConfirmar }}
      </button>
    </mat-dialog-actions>
  `
})
export class TextoDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<TextoDialogComponent>);
  readonly data = inject<TextoDialogData>(MAT_DIALOG_DATA);
  texto = '';

  confirmar(): void {
    if (this.data.obligatorio && !this.texto.trim()) return;
    this.dialogRef.close(this.texto.trim());
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
