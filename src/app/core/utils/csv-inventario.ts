import { ImportarInventarioFila } from '../models/inventario.model';

export interface ResultadoCsv {
  filas: ImportarInventarioFila[];
  // Filas que no se pudieron leer (con el motivo), para mostrarlas antes de importar.
  errores: string[];
  // Columnas que el archivo trae y se reconocieron.
  columnas: string[];
}

// Alias aceptados por columna (comparados sin tildes, minúsculas y sin símbolos).
const ALIAS: Record<string, string[]> = {
  idWorldOffice: ['idinventario', 'idworldoffice', 'id'],
  codigo: ['codigo', 'codigoinventario'],
  nombre: ['nombre', 'descripcion'],
  unidad: ['unidad', 'unidaddemedida'],
  iva: ['ivaporc', 'iva', 'ivapct'],
  activo: ['activo'],
  existencia: ['existencia', 'existenciauno', 'stock'],
  precio: ['precio', 'preciolastventa', 'precioultimaventa', 'ultimoprecio']
};

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Decodifica el archivo: SSMS puede guardar el CSV en UTF-8 (con o sin BOM) o en ANSI (Windows-1252).
 * Se intenta UTF-8 estricto y, si falla, se cae a Windows-1252, para no dañar tildes ni eñes.
 */
export function decodificarArchivo(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** CSV según RFC 4180 (comillas dobles, saltos de línea dentro de comillas). */
export function parsearCsv(texto: string, delimitador: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') entreComillas = true;
    else if (c === delimitador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo);
      campo = '';
      if (fila.some((x) => x.trim() !== '')) filas.push(fila);
      fila = [];
    } else campo += c;
  }

  fila.push(campo);
  if (fila.some((x) => x.trim() !== '')) filas.push(fila);
  return filas;
}

function detectarDelimitador(primeraLinea: string): string {
  const comas = (primeraLinea.match(/,/g) ?? []).length;
  const puntoYComa = (primeraLinea.match(/;/g) ?? []).length;
  const tabs = (primeraLinea.match(/\t/g) ?? []).length;
  if (tabs > comas && tabs > puntoYComa) return '\t';
  return puntoYComa > comas ? ';' : ',';
}

/** Números con punto o coma decimal; vacío / NULL => null. */
export function parsearNumero(valor: string | undefined): number | null {
  if (valor === undefined) return null;
  let t = valor.trim();
  if (t === '' || t.toUpperCase() === 'NULL') return null;
  t = t.replace(/\s/g, '');

  const tienePunto = t.includes('.');
  const tieneComa = t.includes(',');
  if (tienePunto && tieneComa) {
    // El último separador es el decimal; el otro es de miles.
    t = t.lastIndexOf('.') > t.lastIndexOf(',') ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  } else if (tieneComa) {
    t = t.replace(',', '.');
  }

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parsearActivo(valor: string | undefined): boolean {
  if (valor === undefined || valor.trim() === '') return true;
  const t = valor.trim().toLowerCase();
  // WO usa -1 como "sí" y 0 como "no" (convención de Access).
  return !(t === '0' || t === 'false' || t === 'no' || t === 'n');
}

export function leerInventarioCsv(texto: string): ResultadoCsv {
  const limpio = texto.replace(/^﻿/, '');
  const primeraLinea = limpio.split(/\r?\n/, 1)[0] ?? '';
  const filas = parsearCsv(limpio, detectarDelimitador(primeraLinea));

  if (filas.length < 2) return { filas: [], errores: ['El archivo no tiene datos (solo encabezado o está vacío).'], columnas: [] };

  const encabezado = filas[0].map(normalizar);
  const indice: Record<string, number> = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const pos = encabezado.findIndex((h) => alias.includes(h));
    if (pos >= 0) indice[campo] = pos;
  }

  const faltan = ['idWorldOffice', 'codigo', 'nombre'].filter((c) => indice[c] === undefined);
  if (faltan.length > 0) {
    return {
      filas: [],
      errores: [`Faltan columnas obligatorias: ${faltan.join(', ')}. Se esperan: IdInventario, Codigo, Nombre (y opcionales Unidad, IvaPorc, Activo, ExistenciaUno, PrecioUltimaVenta).`],
      columnas: Object.keys(indice)
    };
  }

  const resultado: ImportarInventarioFila[] = [];
  const errores: string[] = [];

  for (let i = 1; i < filas.length; i++) {
    const f = filas[i];
    const celda = (campo: string): string | undefined => (indice[campo] === undefined ? undefined : f[indice[campo]]);

    const id = parsearNumero(celda('idWorldOffice'));
    const codigo = (celda('codigo') ?? '').trim();
    const nombre = (celda('nombre') ?? '').trim();

    if (id === null || !Number.isInteger(id) || id <= 0 || !codigo || !nombre) {
      errores.push(`Fila ${i + 1}: falta IdInventario, código o nombre.`);
      continue;
    }

    const iva = parsearNumero(celda('iva'));
    const precio = parsearNumero(celda('precio'));

    resultado.push({
      idWorldOffice: id,
      codigo,
      nombre,
      unidad: (celda('unidad') ?? '').trim() || null,
      iva: iva === null ? 19 : Math.round(iva),
      activo: parsearActivo(celda('activo')),
      existencia: parsearNumero(celda('existencia')),
      precio: precio !== null && precio > 0 ? precio : null
    });
  }

  return { filas: resultado, errores, columnas: Object.keys(indice) };
}
