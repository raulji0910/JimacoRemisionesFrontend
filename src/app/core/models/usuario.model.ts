export type Rol = 'Admin' | 'Operador' | 'Sincronizador';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

export interface UsuarioCrear {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

export interface UsuarioActualizar {
  nombre: string;
  rol: Rol;
  activo: boolean;
  nuevaPassword: string | null;
}
