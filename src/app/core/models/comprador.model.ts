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
  ciudadCodigoDane: string | null;
  telefono: string | null;
  email: string;
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
  ciudadCodigoDane: string;
  telefono: string | null;
  email: string;
  activo: boolean;
}
