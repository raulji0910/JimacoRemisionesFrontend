import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Producto, ProductoActualizar, ProductoCrear } from '../../core/models/producto.model';

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

  codigo = this.data.producto?.codigo ?? '';
  nombre = this.data.producto?.nombre ?? '';
  unidadMedida: string | null = this.data.producto?.unidadMedida ?? 'Unidad';
  precioVenta: number | null = this.data.producto?.precioVenta ?? null;
  costo: number | null = this.data.producto?.costo ?? null;
  iva = this.data.producto?.iva ?? 19;
  activo = this.data.producto?.activo ?? true;
  // Solo al crear: el stock luego cambia con entradas, ventas y ajustes (botón "Ajustar stock").
  stockInicial: number | null = 0;

  get valido(): boolean {
    const stockOk = this.editando || (this.stockInicial !== null && Number.isInteger(this.stockInicial) && this.stockInicial >= 0);
    return !!this.codigo.trim() && !!this.nombre.trim() && this.precioVenta !== null && this.precioVenta >= 0 && stockOk;
  }

  guardar(): void {
    if (!this.valido) return;

    const base = {
      codigo: this.codigo.trim(),
      nombre: this.nombre.trim(),
      unidadMedida: this.unidadMedida?.trim() || null,
      precioVenta: this.precioVenta ?? 0,
      costo: this.costo,
      iva: this.iva
    };

    const dto: ProductoCrear | ProductoActualizar = this.editando
      ? { ...base, activo: this.activo }
      : { ...base, stockInicial: this.stockInicial ?? 0 };
    this.dialogRef.close(dto);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
