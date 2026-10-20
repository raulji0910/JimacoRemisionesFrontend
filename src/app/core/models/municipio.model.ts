// Municipio del listado oficial del DANE (Divipola). `busqueda` es el texto sin tildes ni mayúsculas para el filtro predictivo.
export interface Municipio {
  codigo: string;
  nombre: string;
  departamento: string;
  etiqueta: string;
  busqueda: string;
}
