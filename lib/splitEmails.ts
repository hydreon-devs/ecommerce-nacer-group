export type EmailPart =
  | { type: "text"; value: string }
  | { type: "email"; value: string };

/** Local@dominio con TLD; el punto final de una oración no entra al match. */
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/**
 * Parte un texto en fragmentos de texto y de correo para poder pintar los
 * correos como `mailto:`. Los textos legales son datos tipados (verbatim, sin
 * marcado), así que la detección vive aquí y no en el contenido: reescribir el
 * texto legal para insertar enlaces sería tocar una decisión del cliente.
 */
export function splitEmails(text: string): EmailPart[] {
  const parts: EmailPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(EMAIL_PATTERN)) {
    if (match.index > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, match.index) });
    }
    parts.push({ type: "email", value: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    parts.push({ type: "text", value: text.slice(cursor) });
  }
  return parts;
}
