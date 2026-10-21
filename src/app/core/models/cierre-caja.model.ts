import { MedioPago } from './remision.model';

export interface CierreLinea {
  id: number;
  consecutivo: string;
  fecha: string;
  cliente: string;
  medio: MedioPago | null;
  recibo: string | null;
  total: number;
  usuario: string | null;
  anulada: boolean;
}

export interface CierreMedio {
  medio: MedioPago;
  cantidadCobros: number;
  totalCobros: number;
  cantidadDevoluciones: number;
  totalDevoluciones: number;
  neto: number;
}

export interface CierreCaja {
  fecha: string;
  porMedio: CierreMedio[];
  totalCobros: number;
  totalDevoluciones: number;
  neto: number;
  cobros: CierreLinea[];
  devoluciones: CierreLinea[];
}
