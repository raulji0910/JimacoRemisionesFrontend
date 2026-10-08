export type OrigenRegistro = 'Local' | 'WorldOffice';

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  precioVenta: number;
  costo: number | null;
  iva: number;
  origen: OrigenRegistro;
  activo: boolean;
}

export interface ProductoCrear {
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  precioVenta: number;
  costo: number | null;
  iva: number;
}

export interface ProductoActualizar extends ProductoCrear {
  activo: boolean;
}
