export interface ActionMessage {
  text: string;
  /** El conflicto se resuelve recargando: la UI ofrece el botón. */
  refresh: boolean;
}

const ADVANCE_ERRORS: Record<string, ActionMessage> = {
  PEDIDO_CAMBIO: {
    text: "Otra persona ya actualizó este pedido. Recarga para ver su estado.",
    refresh: true,
  },
  SIN_SIGUIENTE_PASO: {
    text: "Este pedido ya no tiene un siguiente paso. Recarga para ver su estado.",
    refresh: true,
  },
  PEDIDO_NO_EXISTE: { text: "El pedido ya no existe.", refresh: true },
};

export const ADVANCE_GENERIC_ERROR: ActionMessage = {
  text: "No se pudo actualizar el pedido. Inténtalo de nuevo.",
  refresh: false,
};

/** Código de error de `advanceFulfillment` → mensaje humano en español. */
export function advanceErrorMessage(code: string): ActionMessage {
  return ADVANCE_ERRORS[code] ?? ADVANCE_GENERIC_ERROR;
}
