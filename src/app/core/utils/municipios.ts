import { Municipio } from '../models/municipio.model';

// Minúsculas y sin tildes: "Bogotá" == "bogota".
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Búsqueda predictiva: cada palabra escrita debe aparecer (en cualquier orden) en "municipio departamento",
// así "yumbo valle", "valle yumbo" o "yum" encuentran lo mismo. Primero los que empiezan por lo escrito.
export function filtrarMunicipios(lista: Municipio[], texto: string, limite = 50): Municipio[] {
  const palabras = normalizarTexto(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return lista.slice(0, limite);

  const encontrados: { m: Municipio; rango: number }[] = [];
  for (const m of lista) {
    if (!palabras.every((p) => m.busqueda.includes(p))) continue;
    const nombre = normalizarTexto(m.nombre);
    const rango = nombre.startsWith(palabras[0]) ? 0 : nombre.includes(palabras[0]) ? 1 : 2;
    encontrados.push({ m, rango });
  }
  encontrados.sort((a, b) => a.rango - b.rango || a.m.nombre.localeCompare(b.m.nombre, 'es'));
  return encontrados.slice(0, limite).map((x) => x.m);
}
