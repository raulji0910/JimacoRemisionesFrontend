import { IvaDesglose } from '../models/remision.model';

export interface LineaCalculo {
  precioUnitario: number;
  cantidad: number;
  iva: number;
  descuentoPorcentaje: number;
}

export interface ResultadoCalculo {
  subtotalItems: number;
  descuento: number;
  subtotalConDescuento: number;
  ivaDesglose: IvaDesglose[];
  totalBruto: number;
  reteFuente: number;
  reteIca: number;
  reteIva: number;
  totalGeneral: number;
}

const redondear = (valor: number): number => Math.round((valor + Number.EPSILON) * 100) / 100;

// Misma fórmula que RemisionCalculos.cs del backend: el descuento global se prorratea entre las
// tarifas de IVA según la participación de cada tramo en el subtotal. Solo para mostrar el total
// en vivo mientras se arma la remisión; el valor oficial siempre lo devuelve el backend.
// Cada línea lleva su propio descuento (% sobre su valor antes de IVA); no hay descuento general. El IVA de cada
// línea se calcula sobre su valor ya descontado. Las retenciones NO tocan el IVA: ReteFuente (%) y ReteICA (por mil)
// se calculan sobre el valor antes de IVA (ya con descuentos), ReteIVA (%) sobre el IVA, y las tres se restan al final:
// `totalGeneral` es el total a pagar y `totalBruto` el total antes de retenciones.
export function descuentoDeLinea(l: LineaCalculo): number {
  return redondear((l.precioUnitario * l.cantidad * l.descuentoPorcentaje) / 100);
}

export function calcularRemision(
  lineas: LineaCalculo[],
  reteFuentePorcentaje = 0,
  reteIcaPorMil = 0,
  reteIvaPorcentaje = 0
): ResultadoCalculo {
  const subtotalItems = lineas.reduce((suma, l) => suma + l.precioUnitario * l.cantidad, 0);
  const descuento = lineas.reduce((suma, l) => suma + descuentoDeLinea(l), 0);
  const subtotalConDescuento = subtotalItems - descuento;

  const porTarifa = new Map<number, number>();
  for (const linea of lineas) {
    const neto = linea.precioUnitario * linea.cantidad - descuentoDeLinea(linea);
    porTarifa.set(linea.iva, (porTarifa.get(linea.iva) ?? 0) + neto);
  }

  const ivaDesglose: IvaDesglose[] = [...porTarifa.entries()]
    .filter(([tarifa]) => tarifa > 0)
    .map(([tarifa, base]) => ({ tarifa, base: redondear(base), valor: redondear((redondear(base) * tarifa) / 100) }))
    .sort((a, b) => b.tarifa - a.tarifa);

  const totalIva = ivaDesglose.reduce((suma, d) => suma + d.valor, 0);
  const totalBruto = subtotalConDescuento + totalIva;
  const reteFuente = redondear((subtotalConDescuento * reteFuentePorcentaje) / 100);
  const reteIca = redondear((subtotalConDescuento * reteIcaPorMil) / 1000);
  const reteIva = redondear((totalIva * reteIvaPorcentaje) / 100);

  return {
    subtotalItems,
    descuento,
    subtotalConDescuento,
    ivaDesglose,
    totalBruto,
    reteFuente,
    reteIca,
    reteIva,
    totalGeneral: totalBruto - reteFuente - reteIca - reteIva
  };
}
