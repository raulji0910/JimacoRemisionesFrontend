export interface PaginaResultado<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}
