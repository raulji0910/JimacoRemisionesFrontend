import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

// El paginador de Material viene en inglés ("Items per page", "1 – 10 of 25"); aquí va en español.
@Injectable()
export class PaginadorEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Por página';
  override nextPageLabel = 'Siguiente';
  override previousPageLabel = 'Anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  override getRangeLabel = (pagina: number, tamano: number, total: number): string => {
    if (total === 0) return '0 de 0';
    const inicio = pagina * tamano;
    const fin = Math.min(inicio + tamano, total);
    return `${inicio + 1} – ${fin} de ${total}`;
  };
}
