import { OrigenRegistro } from './producto.model';

export type TipoPersona = 'Natural' | 'Juridica';

export interface Comprador {
  id: number;
  tipoPersona: TipoPersona;
  tipoDocumento: string;
  numeroDocumento: string;
  dv: string | null;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  nombreCompleto: string;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string;
  origen: OrigenRegistro;
  activo: boolean;
}

export interface CompradorGuardar {
  tipoPersona: TipoPersona;
  tipoDocumento: string;
  numeroDocumento: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string;
  activo: boolean;
}
