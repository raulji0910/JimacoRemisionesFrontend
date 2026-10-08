import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface MensajeDialogData {
  titulo: string;
  mensaje: string;
  icono?: string;
}

// Modal genérico para avisos que necesitan más presencia que un snackbar (ej. una acción
// bloqueada por una regla de negocio) — a diferencia del snackbar, aparece centrado y el usuario
// tiene que cerrarlo explícitamente, así no se pierde de vista.
@Component({
  selector: 'app-mensaje-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './mensaje-dialog.component.html',
  styleUrl: './mensaje-dialog.component.scss'
})
export class MensajeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MensajeDialogComponent>);
  readonly data = inject<MensajeDialogData>(MAT_DIALOG_DATA);

  cerrar(): void {
    this.dialogRef.close();
  }
}
