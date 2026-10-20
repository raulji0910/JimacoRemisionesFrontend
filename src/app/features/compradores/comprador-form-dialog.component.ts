import { normalizarCelular } from '../../core/utils/whatsapp';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MunicipioService } from '../../core/services/municipio.service';
import { Municipio } from '../../core/models/municipio.model';
import { filtrarMunicipios, normalizarTexto } from '../../core/utils/municipios';
import { Comprador, CompradorGuardar, TipoPersona } from '../../core/models/comprador.model';

export interface CompradorFormDialogData {
  comprador: Comprador | null;
  // Al crear desde una venta: el documento que ya se escribió y no se encontró.
  numeroDocumentoInicial?: string;
}

// Tipos de documento (mismos códigos que usa contabilidad al crear terceros en World Office).
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
    MatCheckboxModule,
    MatAutocompleteModule,
    MatIconModule
  ],
  templateUrl: './comprador-form-dialog.component.html',
  styleUrl: './comprador-form-dialog.component.scss'
})
export class CompradorFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CompradorFormDialogComponent>);
  readonly data = inject<CompradorFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.comprador !== null;
  readonly tiposDocumento = TIPOS_DOCUMENTO;

  tipoPersona: TipoPersona = this.data.comprador?.tipoPersona ?? 'Natural';
  tipoDocumento = this.data.comprador?.tipoDocumento ?? 'CC';
  numeroDocumento = this.data.comprador?.numeroDocumento ?? this.data.numeroDocumentoInicial ?? '';
  primerNombre = this.data.comprador?.primerNombre ?? '';
  segundoNombre = this.data.comprador?.segundoNombre ?? '';
  primerApellido = this.data.comprador?.primerApellido ?? '';
  segundoApellido = this.data.comprador?.segundoApellido ?? '';
  direccion = this.data.comprador?.direccion ?? '';
  // Ciudad: se elige de la lista oficial del DANE con búsqueda predictiva; no se acepta texto libre.
  // Mientras escribes el valor es un string; al elegir una opción pasa a ser el Municipio.
  private readonly municipioService = inject(MunicipioService);
  private municipios: Municipio[] = [];
  ciudadValor: string | Municipio = '';
  sugerencias: Municipio[] = [];
  telefono = this.data.comprador?.telefono ?? '';
  email = this.data.comprador?.email ?? '';
  activo = this.data.comprador?.activo ?? true;

  constructor() {
    this.municipioService.listar().subscribe((lista) => {
      this.municipios = lista;
      this.sugerencias = filtrarMunicipios(lista, '');
      const codigo = this.data.comprador?.ciudadCodigoDane;
      // Un comprador antiguo sin código (ciudad escrita a mano) debe volver a elegirla de la lista.
      if (codigo) this.ciudadValor = lista.find((m) => m.codigo === codigo) ?? '';
    });
  }

  mostrarMunicipio = (valor: string | Municipio | null): string => (!valor ? '' : typeof valor === 'string' ? valor : valor.etiqueta);

  alEscribirCiudad(valor: string | Municipio): void {
    this.ciudadValor = valor;
    if (typeof valor === 'string') this.sugerencias = filtrarMunicipios(this.municipios, valor);
  }

  // Al cerrarse la lista, lo escrito que no corresponda a una opción elegida se borra: no queda texto manual.
  alCerrarListaCiudad(): void {
    const valor = this.ciudadValor;
    if (typeof valor !== 'string' || !valor) return;
    const unico = this.municipios.filter((m) => normalizarTexto(m.etiqueta) === normalizarTexto(valor));
    this.ciudadValor = unico.length === 1 ? unico[0] : '';
    this.sugerencias = filtrarMunicipios(this.municipios, '');
  }

  get ciudadElegida(): Municipio | null {
    return typeof this.ciudadValor === 'string' ? null : this.ciudadValor;
  }

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
    return !!this.numeroDocumento.trim() && nombreOk && correoOk && normalizarCelular(this.telefono) !== null && this.ciudadElegida !== null;
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
      ciudadCodigoDane: this.ciudadElegida!.codigo,
      telefono: normalizarCelular(this.telefono),
      email: this.email.trim(),
      activo: this.activo
    };
    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
