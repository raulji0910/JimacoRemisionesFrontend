import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Producto, ProductoActualizar } from '../../core/models/producto.model';

export interface ProductoFormDialogData {
  producto: Producto | null;
}

const IVAS_DISPONIBLES = [19, 5, 0];

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatCheckboxModule],
  templateUrl: './producto-form-dialog.component.html'
})
export class ProductoFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProductoFormDialogComponent>);
  readonly data = inject<ProductoFormDialogData>(MAT_DIALOG_DATA);

  readonly editando = this.data.producto !== null;
  readonly ivasDisponibles = IVAS_DISPONIBLES;
  // Un producto que viene de World Office no cambia de código (es la llave del inventario allá).
  readonly codigoBloqueado = this.data.producto?.origen === 'WorldOffice';

  codigo = this.data.producto?.codigo ?? '';
  nombre = this.data.producto?.nombre ?? '';
  unidadMedida: string | null = this.data.producto?.unidadMedida ?? null;
  precioVenta: number | null = this.data.producto?.precioVenta ?? null;
  costo: number | null = this.data.producto?.costo ?? null;
  iva = this.data.producto?.iva ?? 19;
  activo = this.data.producto?.activo ?? true;

  get valido(): boolean {
    return !!this.codigo.trim() && !!this.nombre.trim() && this.precioVenta !== null && this.precioVenta >= 0;
  }

  guardar(): void {
    if (!this.valido) return;

    const dto: ProductoActualizar = {
      codigo: this.codigo.trim(),
      nombre: this.nombre.trim(),
      unidadMedida: this.unidadMedida?.trim() || null,
      precioVenta: this.precioVenta ?? 0,
      costo: this.costo,
      iva: this.iva,
      activo: this.activo
    };
    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
