import { IvaDesglose } from '../models/remision.model';

export interface LineaCalculo {
  precioUnitario: number;
  cantidad: number;
  iva: number;
}

export interface ResultadoCalculo {
  subtotalItems: number;
  descuento: number;
  subtotalConDescuento: number;
  ivaDesglose: IvaDesglose[];
  totalGeneral: number;
}

const redondear = (valor: number): number => Math.round((valor + Number.EPSILON) * 100) / 100;

// Misma fórmula que RemisionCalculos.cs del backend: el descuento global se prorratea entre las
// tarifas de IVA según la participación de cada tramo en el subtotal. Solo para mostrar el total
// en vivo mientras se arma la remisión; el valor oficial siempre lo devuelve el backend.
// El descuento llega en % sobre el valor antes de IVA; la retención (opcional) en pesos. Ambos se restan del
// valor antes de IVA y el IVA se calcula sobre lo que queda.
export function calcularRemision(lineas: LineaCalculo[], descuentoPorcentaje: number, retencion = 0): ResultadoCalculo {
  const subtotalItems = lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0);
  const descuento = redondear((subtotalItems * descuentoPorcentaje) / 100);
  const reduccion = descuento + retencion;
  const subtotalConDescuento = subtotalItems - reduccion;

  const porTarifa = new Map<number, number>();
  for (const linea of lineas) {
    porTarifa.set(linea.iva, (porTarifa.get(linea.iva) ?? 0) + linea.precioUnitario * linea.cantidad);
  }

  const ivaDesglose: IvaDesglose[] = [...porTarifa.entries()]
    .filter(([tarifa]) => tarifa > 0)
    .map(([tarifa, subtotalGrupo]) => {
      const proporcion = subtotalItems > 0 ? subtotalGrupo / subtotalItems : 0;
      const base = redondear(subtotalGrupo - reduccion * proporcion);
      return { tarifa, base, valor: redondear((base * tarifa) / 100) };
    })
    .sort((a, b) => b.tarifa - a.tarifa);

  const totalIva = ivaDesglose.reduce((suma, d) => suma + d.valor, 0);
  return { subtotalItems, descuento, subtotalConDescuento, ivaDesglose, totalGeneral: subtotalConDescuento + totalIva };
}
