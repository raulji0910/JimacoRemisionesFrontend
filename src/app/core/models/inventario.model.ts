export type TipoMovimiento = 'CargaInicial' | 'Entrada' | 'Venta' | 'Reintegro' | 'Ajuste';

export interface Movimiento {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  // Con signo: positivo entra, negativo sale.
  cantidad: number;
  // Stock del producto después de este movimiento.
  saldoResultante: number;
  remisionId: number | null;
  remisionConsecutivo: string | null;
  usuario: string | null;
  motivo: string | null;
}

// Movimiento manual (solo administrador): Entrada (cantidad positiva) o Ajuste (con signo, motivo obligatorio).
export interface MovimientoManual {
  tipo: 'Entrada' | 'Ajuste';
  cantidad: number;
  motivo: string | null;
}

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  CargaInicial: 'Stock inicial',
  Entrada: 'Entrada',
  Venta: 'Venta',
  Reintegro: 'Reintegro por anulación',
  Ajuste: 'Ajuste'
};
