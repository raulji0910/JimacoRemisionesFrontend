export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  // Precio por unidad, antes de IVA.
  precioVenta: number;
  costo: number | null;
  iva: number;
  activo: boolean;
  // Existencia actual: la maneja esta app (cambia con ventas, entradas y ajustes).
  stock: number;
}

export interface ProductoCrear {
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  precioVenta: number;
  costo: number | null;
  iva: number;
  // Unidades con las que arranca el producto (queda como "Carga inicial" en el historial).
  stockInicial: number;
}

// El stock no se edita aquí: solo cambia con movimientos.
export interface ProductoActualizar {
  codigo: string;
  nombre: string;
  unidadMedida: string | null;
  precioVenta: number;
  costo: number | null;
  iva: number;
  activo: boolean;
}
