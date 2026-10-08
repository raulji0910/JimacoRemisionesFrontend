import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';
import { Rol, Usuario, UsuarioActualizar, UsuarioCrear } from '../../core/models/usuario.model';

export interface UsuarioFormDialogData {
  usuario: Usuario | null;
}

@Component({
  selector: 'app-usuario-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule
  ],
  templateUrl: './usuario-form-dialog.component.html'
})
export class UsuarioFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UsuarioFormDialogComponent>);
  private readonly authService = inject(AuthService);
  readonly data = inject<UsuarioFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.usuario !== null;
  readonly esUsuarioActual = this.data.usuario !== null && this.data.usuario.email === this.authService.usuario()?.email;

  nombre = this.data.usuario?.nombre ?? '';
  email = this.data.usuario?.email ?? '';
  rol: Rol = this.data.usuario?.rol ?? 'Operador';
  activo = this.data.usuario?.activo ?? true;
  password = '';
  nuevaPassword = '';

  guardar(): void {
    if (!this.nombre || (!this.editando && (!this.email || !this.password))) return;

    if (this.editando) {
      const dto: UsuarioActualizar = {
        nombre: this.nombre,
        rol: this.rol,
        activo: this.activo,
        nuevaPassword: this.nuevaPassword || null
      };
      this.dialogRef.close(dto);
    } else {
      const dto: UsuarioCrear = {
        nombre: this.nombre,
        email: this.email,
        password: this.password,
        rol: this.rol
      };
      this.dialogRef.close(dto);
    }
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
