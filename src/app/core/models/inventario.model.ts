export interface EstadoInventario {
  // Hora (UTC, ISO) de la última foto de existencias de World Office; null si nunca se cargó.
  ultimaFotoEn: string | null;
  bodegaVenta: string;
  productosConExistencia: number;
  // Productos activos que todavía no se pueden vender por no tener precio.
  productosSinPrecio: number;
}

export interface ImportarInventarioFila {
  idWorldOffice: number;
  codigo: string;
  nombre: string;
  unidad: string | null;
  iva: number;
  activo: boolean;
  existencia: number | null;
  precio: number | null;
}

export interface ImportarInventarioRequest {
  filas: ImportarInventarioFila[];
  actualizarPrecios: boolean;
  exportadoEn: string | null;
}

export interface ImportarInventarioResultado {
  productosCreados: number;
  productosActualizados: number;
  omitidos: number;
  existenciasCargadas: number;
  preciosAsignados: number;
  avisos: string[];
}
