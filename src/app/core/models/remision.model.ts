export type EstadoPago = 'Pendiente' | 'Pagada' | 'Anulada';
// Datáfono y QR pasan por el mismo datáfono Redeban (llevan número de recibo); Efectivo solo se marca.
export type MedioPago = 'Datafono' | 'Qr' | 'Efectivo';

export const NOMBRES_MEDIO_PAGO: Record<MedioPago, string> = { Datafono: 'Datáfono', Qr: 'Pago con QR', Efectivo: 'Efectivo' };

export function nombreMedioPago(medio: MedioPago | null | undefined): string {
  return medio ? NOMBRES_MEDIO_PAGO[medio] : '';
}
export type TipoEntrega = 'EnSitio' | 'Envio';
export type EstadoEntrega = 'Pendiente' | 'Entregada';

export interface RemisionItemEntrada {
  productoId: number;
  cantidad: number;
}

export interface RemisionGuardar {
  compradorId: number;
  tipoEntrega: TipoEntrega;
  descuentoPorcentaje: number;
  retencion: number;
  nota: string | null;
  items: RemisionItemEntrada[];
}

export interface RemisionItem {
  id: number;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  precioUnitario: number;
  iva: number;
  cantidad: number;
  subtotal: number;
  costo: number | null;
  margenPorcentaje: number | null;
}

export interface IvaDesglose {
  tarifa: number;
  base: number;
  valor: number;
}

export interface RemisionResumen {
  id: number;
  consecutivo: number;
  consecutivoFormateado: string;
  compradorNombre: string;
  compradorDocumento: string;
  fechaCreacion: string;
  total: number;
  estadoPago: EstadoPago;
  medioPago: MedioPago | null;
  tipoEntrega: TipoEntrega;
  estadoEntrega: EstadoEntrega;
  correoEnviado: boolean;
}

export interface RemisionDetalle {
  id: number;
  consecutivo: number;
  consecutivoFormateado: string;
  compradorId: number;
  compradorTipoDocumento: string;
  compradorDocumento: string;
  compradorNombre: string;
  compradorDireccion: string | null;
  compradorCiudad: string | null;
  compradorTelefono: string | null;
  compradorEmail: string;
  nota: string | null;
  fechaCreacion: string;
  creadoPor: string | null;
  estadoPago: EstadoPago;
  fechaPago: string | null;
  pagadaPor: string | null;
  reciboRedeban: string | null;
  medioPago: MedioPago | null;
  tipoEntrega: TipoEntrega;
  estadoEntrega: EstadoEntrega;
  fechaEntrega: string | null;
  correoEnviadoEn: string | null;
  fechaAnulacion: string | null;
  motivoAnulacion: string | null;
  items: RemisionItem[];
  subtotalItems: number;
  descuentoPorcentaje: number;
  descuento: number;
  retencion: number;
  subtotalConDescuento: number;
  ivaDesglose: IvaDesglose[];
  totalGeneral: number;
}

export interface PagarResultado {
  remision: RemisionDetalle;
  correoEnviado: boolean;
  errorCorreo: string | null;
  correoEnCola: boolean;
}

export interface EnviarCorreoResultado {
  remision: RemisionDetalle;
  correoEnviado: boolean;
  errorCorreo: string | null;
}
