import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Comprador, CompradorGuardar, TipoPersona } from '../../core/models/comprador.model';

export interface CompradorFormDialogData {
  comprador: Comprador | null;
  // Al crear desde una venta: el documento que ya se escribió y no se encontró.
  numeroDocumentoInicial?: string;
}

// Mismos códigos que World Office usa para el tipo de tercero.
export const TIPOS_DOCUMENTO = [
  { codigo: 'CC', nombre: 'Cédula de ciudadanía' },
  { codigo: 'NIT', nombre: 'NIT' },
  { codigo: 'CE', nombre: 'Cédula de extranjería' },
  { codigo: 'PAS', nombre: 'Pasaporte' },
  { codigo: 'TI', nombre: 'Tarjeta de identidad' },
  { codigo: 'TE', nombre: 'Tarjeta de extranjería' },
  { codigo: 'PEP', nombre: 'Permiso especial de permanencia' },
  { codigo: 'PPT', nombre: 'Permiso por protección temporal' },
  { codigo: 'RC', nombre: 'Registro civil' },
  { codigo: 'NUIP', nombre: 'NUIP' },
  { codigo: 'OTRO', nombre: 'Otro' }
];

@Component({
  selector: 'app-comprador-form-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatCheckboxModule
  ],
  templateUrl: './comprador-form-dialog.component.html',
  styleUrl: './comprador-form-dialog.component.scss'
})
export class CompradorFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CompradorFormDialogComponent>);
  readonly data = inject<CompradorFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.comprador !== null;
  readonly tiposDocumento = TIPOS_DOCUMENTO;
  // Un tercero que viene de World Office no cambia de documento (es su llave allá).
  readonly documentoBloqueado = this.data.comprador?.origen === 'WorldOffice';

  tipoPersona: TipoPersona = this.data.comprador?.tipoPersona ?? 'Natural';
  tipoDocumento = this.data.comprador?.tipoDocumento ?? 'CC';
  numeroDocumento = this.data.comprador?.numeroDocumento ?? this.data.numeroDocumentoInicial ?? '';
  primerNombre = this.data.comprador?.primerNombre ?? '';
  segundoNombre = this.data.comprador?.segundoNombre ?? '';
  primerApellido = this.data.comprador?.primerApellido ?? '';
  segundoApellido = this.data.comprador?.segundoApellido ?? '';
  direccion = this.data.comprador?.direccion ?? '';
  ciudad = this.data.comprador?.ciudad ?? '';
  telefono = this.data.comprador?.telefono ?? '';
  email = this.data.comprador?.email ?? '';
  activo = this.data.comprador?.activo ?? true;

  get esJuridica(): boolean {
    return this.tipoPersona === 'Juridica';
  }

  alCambiarTipoPersona(): void {
    // Persona jurídica siempre se identifica con NIT.
    if (this.esJuridica) this.tipoDocumento = 'NIT';
    else if (this.tipoDocumento === 'NIT') this.tipoDocumento = 'CC';
  }

  get valido(): boolean {
    const correoOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email.trim());
    const nombreOk = !!this.primerNombre.trim() && (this.esJuridica || !!this.primerApellido.trim());
    return !!this.numeroDocumento.trim() && nombreOk && correoOk;
  }

  guardar(): void {
    if (!this.valido) return;

    const dto: CompradorGuardar = {
      tipoPersona: this.tipoPersona,
      tipoDocumento: this.tipoDocumento,
      numeroDocumento: this.numeroDocumento.trim(),
      primerNombre: this.primerNombre.trim(),
      segundoNombre: this.esJuridica ? null : this.segundoNombre.trim() || null,
      primerApellido: this.esJuridica ? null : this.primerApellido.trim() || null,
      segundoApellido: this.esJuridica ? null : this.segundoApellido.trim() || null,
      direccion: this.direccion.trim() || null,
      ciudad: this.ciudad.trim() || null,
      telefono: this.telefono.trim() || null,
      email: this.email.trim(),
      activo: this.activo
    };
    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
