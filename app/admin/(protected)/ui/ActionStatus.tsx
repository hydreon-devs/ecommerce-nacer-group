export type StatusTone = "error" | "warn" | "ok";
export interface StatusMessage {
  tone: StatusTone;
  text: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  error: "text-admin-critical-fg",
  warn: "text-admin-warning-fg",
  ok: "text-admin-ink-secondary",
};

/**
 * Resultado breve de una acción. Los errores usan `role="alert"` (se anuncian
 * al instante); el resto, `role="status"` (cortés). Renderiza solo cuando hay
 * mensaje, así que la región viva nace junto con el texto.
 */
export function ActionStatus({
  message,
  id,
  className = "text-sm",
  children,
}: {
  message: StatusMessage | null;
  id?: string;
  className?: string;
  /** Acción asociada al mensaje (p. ej. "Recargar"). */
  children?: React.ReactNode;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role={message.tone === "error" ? "alert" : "status"}
      className={`${className} ${TONE_CLASS[message.tone]}`}
    >
      {message.text}
      {children}
    </p>
  );
}
