// Celular colombiano: 10 dígitos que empiezan por 3 (se acepta con +57 / 57 delante).
// Devuelve solo los 10 dígitos, o null si no es válido.
export function normalizarCelular(valor: string | null | undefined): string | null {
  let digitos = (valor ?? '').replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('57')) digitos = digitos.slice(2);
  return digitos.length === 10 && digitos.startsWith('3') ? digitos : null;
}

// Enlace que abre el chat de WhatsApp (app del celular o WhatsApp Web) con el mensaje ya escrito.
export function enlaceWhatsApp(celular: string, mensaje: string): string {
  return `https://wa.me/57${celular}?text=${encodeURIComponent(mensaje)}`;
}
