import { mapsSearchHref, phoneHref } from "@/lib/domain/contactLinks";
import { focusRingClass } from "./formClasses";

const LINK = `inline-flex min-h-11 items-center gap-1.5 text-admin-ink underline underline-offset-2 hover:text-admin-accent ${focusRingClass}`;

function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/** Teléfono como enlace `tel:`; si no es reconocible, texto plano. Solo para vistas con datos de contacto (nunca `produccion`). */
export function PhoneLink({ phone, who }: { phone: string; who: string }) {
  const href = phoneHref(phone);
  if (!href) return <span>{phone}</span>;
  return (
    <a href={href} className={`${LINK} font-admin-mono`} aria-label={`Llamar a ${who}: ${phone}`}>
      <Icon path="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
      {phone}
    </a>
  );
}

/** Dirección como búsqueda de Google Maps en pestaña nueva; sin dirección, texto plano. */
export function AddressLink({ address }: { address: string }) {
  const href = mapsSearchHref(address);
  if (!href) return <span className="text-admin-ink-muted">{address}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${LINK} break-words`}
      aria-label={`Abrir en Google Maps: ${address} (se abre en una pestaña nueva)`}
    >
      <Icon path="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
      <span>{address}</span>
    </a>
  );
}
