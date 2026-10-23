// Conceptos de retención en la fuente (renta) más comunes con su tarifa, según el Estatuto Tributario / DUT 1625 de 2016.
// Son sugerencias: el vendedor puede ajustar el porcentaje, y contabilidad debe validar cuál aplica a cada cliente.
export interface ConceptoReteFuente {
  clave: string;
  etiqueta: string;
  porcentaje: number | null; // null = el vendedor digita el porcentaje
}

export const CONCEPTOS_RETEFUENTE: ConceptoReteFuente[] = [
  { clave: 'compras-declarante', etiqueta: 'Compras generales, declarante de renta', porcentaje: 2.5 },
  { clave: 'compras-no-declarante', etiqueta: 'Compras generales, no declarante', porcentaje: 3.5 },
  { clave: 'servicios-declarante', etiqueta: 'Servicios generales, declarante de renta', porcentaje: 4 },
  { clave: 'servicios-no-declarante', etiqueta: 'Servicios generales, no declarante', porcentaje: 6 },
  { clave: 'honorarios-natural', etiqueta: 'Honorarios y comisiones, persona natural', porcentaje: 10 },
  { clave: 'honorarios-juridica', etiqueta: 'Honorarios y comisiones, persona jurídica', porcentaje: 11 },
  { clave: 'arriendo-inmuebles', etiqueta: 'Arrendamiento de bienes inmuebles', porcentaje: 3.5 },
  { clave: 'arriendo-muebles', etiqueta: 'Arrendamiento de bienes muebles', porcentaje: 4 },
  { clave: 'transporte-carga', etiqueta: 'Transporte de carga', porcentaje: 1 },
  { clave: 'hoteles-restaurantes', etiqueta: 'Hoteles y restaurantes', porcentaje: 3.5 },
  { clave: 'otro', etiqueta: 'Otro (digitar porcentaje)', porcentaje: null }
];

// Tarifa general de ReteIVA: 15 % del IVA.
export const RETEIVA_GENERAL = 15;

// Topes de sensatez (los mismos del servidor); no son tarifas.
export const TOPE_RETEFUENTE = 35;
export const TOPE_RETEICA_POR_MIL = 20;
export const TOPE_RETEIVA = 100;
