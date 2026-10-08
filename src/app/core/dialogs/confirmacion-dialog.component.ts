import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmacionDialogData {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  colorConfirmar?: 'warn' | 'primary';
}

// Diálogo genérico de "¿estás seguro?" para acciones destructivas o difíciles de revertir
// (reabrir una cotización emitida, eliminar un producto, etc.) — se reutiliza en toda la app
// en vez de duplicar un mat-dialog por cada acción que necesite una confirmación extra.
@Component({
  selector: 'app-confirmacion-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirmacion-dialog.component.html'
})
export class ConfirmacionDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmacionDialogComponent>);
  readonly data = inject<ConfirmacionDialogData>(MAT_DIALOG_DATA);

  confirmar(): void {
    this.dialogRef.close(true);
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
