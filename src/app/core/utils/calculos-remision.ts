import { IvaDesglose } from '../models/remision.model';

export interface LineaCalculo {
  precioUnitario: number;
  cantidad: number;
  iva: number;
}

export interface ResultadoCalculo {
  subtotalItems: number;
  subtotalConDescuento: number;
  ivaDesglose: IvaDesglose[];
  totalGeneral: number;
}

const redondear = (valor: number): number => Math.round((valor + Number.EPSILON) * 100) / 100;

// Misma fórmula que RemisionCalculos.cs del backend: el descuento global se prorratea entre las
// tarifas de IVA según la participación de cada tramo en el subtotal. Solo para mostrar el total
// en vivo mientras se arma la remisión; el valor oficial siempre lo devuelve el backend.
export function calcularRemision(lineas: LineaCalculo[], descuento: number): ResultadoCalculo {
  const subtotalItems = lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0);
  const subtotalConDescuento = subtotalItems - descuento;

  const porTarifa = new Map<number, number>();
  for (const linea of lineas) {
    porTarifa.set(linea.iva, (porTarifa.get(linea.iva) ?? 0) + linea.precioUnitario * linea.cantidad);
  }

  const ivaDesglose: IvaDesglose[] = [...porTarifa.entries()]
    .filter(([tarifa]) => tarifa > 0)
    .map(([tarifa, subtotalGrupo]) => {
      const proporcion = subtotalItems > 0 ? subtotalGrupo / subtotalItems : 0;
      const base = redondear(subtotalGrupo - descuento * proporcion);
      return { tarifa, base, valor: redondear((base * tarifa) / 100) };
    })
    .sort((a, b) => b.tarifa - a.tarifa);

  const totalIva = ivaDesglose.reduce((suma, d) => suma + d.valor, 0);
  return { subtotalItems, subtotalConDescuento, ivaDesglose, totalGeneral: subtotalConDescuento + totalIva };
}
