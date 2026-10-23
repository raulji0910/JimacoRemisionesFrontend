import { MedioPago } from './remision.model';

export interface CierreLinea {
  id: number;
  consecutivo: string;
  fecha: string;
  cliente: string;
  medio: MedioPago | null;
  recibo: string | null;
  total: number;
  usuario: string | null; // quien la cobró
  vendedor: string | null; // quien la creó
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

// Un día del rango; datafono / qr / efectivo son el neto del día en cada medio.
export interface CierreDia {
  fecha: string;
  cobros: number;
  datafono: number;
  qr: number;
  efectivo: number;
  totalCobros: number;
  devoluciones: number;
  neto: number;
}

export interface CierreUsuario {
  usuario: string;
  cantidadCobros: number;
  datafono: number;
  qr: number;
  efectivo: number;
  totalCobros: number;
}

export interface CierreCaja {
  desde: string;
  hasta: string;
  porMedio: CierreMedio[];
  totalCobros: number;
  totalDevoluciones: number;
  neto: number;
  porDia: CierreDia[];
  porUsuario: CierreUsuario[];
  cobros: CierreLinea[];
  devoluciones: CierreLinea[];
}
