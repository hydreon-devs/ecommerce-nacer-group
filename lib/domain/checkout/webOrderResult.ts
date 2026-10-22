import { z } from "zod";
import { fieldPage, serverFieldMessage, type DeliveryMethod, type DetailsPageNumber } from "./saleDetails.ts";
import { quoteErrorMessage } from "./quoteDelivery.ts";

/**
 * What `create_web_order` answers, parsed and turned into the place the
 * customer has to go next. Pure: no network, no React.
 *
 * Success: the SERVER's order (integer COP) that the Summary renders.
 * Failure: `{ ok: false, error, paso, ...context }`; `mapRpcFailure` turns the
 * code into a typed route (`datos` -> a sub-page with inline field messages,
 * `entrega` -> step 1, `productos` -> the availability issues, `intento` ->
 * a new attempt). An unreadable answer is `malformed`, never guessed at.
 */

// ---- Success ---------------------------------------------------------------------

const cop = z.number().int().nonnegative();

const orderSchema = z.object({
  ok: z.literal(true),
  order_id: z.uuid(),
  human_number: z.string().min(1),
  reutilizado: z.boolean(),
  expires_at: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  subtotal: cop,
  delivery_fee: cop,
  grand_total: cop,
  lines: z.array(
    z.object({
      variant_sku: z.string().min(1),
      qty: z.number().int().positive(),
      unit_price: cop,
      total_price: cop,
      options: z.array(z.object({ name: z.string().min(1), qty: z.number().int().positive(), unit_price: cop })),
    }),
  ),
});

export interface WebOrderLine {
  variantSku: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  options: { name: string; qty: number; unitPrice: number }[];
}

/** The order as the server priced and reserved it. */
export interface WebOrder {
  orderId: string;
  humanNumber: string;
  /** The RPC returned the order of an earlier call with the same attempt. */
  reused: boolean;
  /** ISO timestamp; the reservation ends here. */
  expiresAt: string;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  lines: WebOrderLine[];
}

// ---- Failure ---------------------------------------------------------------------

export type Paso = "intento" | "productos" | "entrega" | "datos";
const PASOS: readonly string[] = ["intento", "productos", "entrega", "datos"];

export interface RpcFailure {
  error: string;
  paso: Paso;
  variantSku?: string;
  units?: number;
  option?: string;
  state?: string | null;
  nextValidDate?: string;
  fields?: string[];
}

export type ParsedCreateWebOrder =
  | { kind: "ok"; order: WebOrder }
  | { kind: "failed"; failure: RpcFailure }
  | { kind: "malformed" };

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export function parseCreateWebOrderResult(raw: unknown): ParsedCreateWebOrder {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { kind: "malformed" };
  const body = raw as Record<string, unknown>;

  if (body.ok === true) {
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) return { kind: "malformed" };
    const o = parsed.data;
    return {
      kind: "ok",
      order: {
        orderId: o.order_id,
        humanNumber: o.human_number,
        reused: o.reutilizado,
        expiresAt: o.expires_at,
        subtotal: o.subtotal,
        deliveryFee: o.delivery_fee,
        grandTotal: o.grand_total,
        lines: o.lines.map((l) => ({
          variantSku: l.variant_sku,
          qty: l.qty,
          unitPrice: l.unit_price,
          totalPrice: l.total_price,
          options: l.options.map((x) => ({ name: x.name, qty: x.qty, unitPrice: x.unit_price })),
        })),
      },
    };
  }

  if (body.ok === false) {
    const error = str(body.error);
    if (!error || typeof body.paso !== "string" || !PASOS.includes(body.paso)) return { kind: "malformed" };
    const failure: RpcFailure = { error, paso: body.paso as Paso };
    const sku = str(body.variant_sku);
    if (sku) failure.variantSku = sku;
    if (typeof body.unidades === "number") failure.units = body.unidades;
    const option = str(body.opcion);
    if (option) failure.option = option;
    if ("estado" in body) failure.state = typeof body.estado === "string" ? body.estado : null;
    const next = str(body.proxima_fecha_valida);
    if (next) failure.nextValidDate = next;
    if (Array.isArray(body.campos)) failure.fields = body.campos.filter((c): c is string => typeof c === "string");
    return { kind: "failed", failure };
  }

  return { kind: "malformed" };
}

// ---- Routes ----------------------------------------------------------------------

export type OrderRoute =
  /** A details sub-page, with the inline message per field. */
  | { kind: "datos"; page: DetailsPageNumber; fieldErrors: Record<string, string>; message: string }
  /** Step 1; `fieldErrors` use the step-1 field names (`address`, `date`, `neighborhood`, ...). */
  | { kind: "entrega"; fieldErrors: Record<string, string>; message: string; suggestedDate?: string }
  /** Back to the availability issues; `variantSku` says which line to flag. */
  | { kind: "productos"; message: string; variantSku?: string }
  /** The attempt cannot be used: the client starts a new one. */
  | { kind: "intento"; reason: "closed" | "invalid"; message: string }
  /** Nothing is wrong with the data: try again (rate limit, network, unreadable answer). */
  | { kind: "retry"; message: string };

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** `YYYY-MM-DD` as "viernes 23 de octubre". A calendar day, so no time-zone shift. */
export function formatDeliveryDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${WEEKDAYS[date.getUTCDay()]} ${Number(m[3])} de ${MONTHS[date.getUTCMonth()]}`;
}

function productsMessage(f: RpcFailure): string {
  switch (f.error) {
    case "PEDIDO_SIN_LINEAS":
      return "Tu carrito está vacío. Agrega algo para poder continuar.";
    case "LINEA_INVALIDA":
      return "No pudimos leer uno de los productos de tu carrito. Quítalo y vuelve a agregarlo.";
    case "VARIANTE_NO_DISPONIBLE":
      return "Uno de tus productos ya no está disponible. Quítalo de tu pedido para continuar.";
    case "STOCK_INSUFICIENTE": {
      const n = f.units;
      if (typeof n === "number" && n > 0) {
        return `Solo ${n === 1 ? "queda 1 unidad" : `quedan ${n} unidades`} de uno de tus productos. Ajusta la cantidad para continuar.`;
      }
      return "Ya no quedan unidades de uno de tus productos. Quítalo de tu pedido para continuar.";
    }
    case "OPCION_NO_EXISTE":
      return `El adicional «${f.option ?? "elegido"}» ya no está disponible. Quítalo de tu pedido para continuar.`;
    case "OPCION_EXCEDE_MAXIMO":
      return `Elegiste más unidades de «${f.option ?? "un adicional"}» de las que podemos preparar. Ajusta la cantidad para continuar.`;
    default:
      return "Algo cambió en tus productos. Revisa tu pedido para continuar.";
  }
}

/** The database field behind each step-1 field, as step 1 names it. */
const STEP1_FIELD: Record<string, string> = {
  neighborhood: "neighborhood",
  city: "municipality",
  delivery_unit: "unit",
  building_name: "building",
};

function entregaRoute(f: RpcFailure): OrderRoute {
  const route = (field: string, message: string, extra: { suggestedDate?: string } = {}): OrderRoute => ({
    kind: "entrega",
    fieldErrors: { [field]: message },
    message,
    ...extra,
  });
  switch (f.error) {
    case "METODO_INVALIDO":
      return route("method", "Elige cómo quieres recibir tu pedido.");
    case "DIRECCION_REQUERIDA":
      return route("address", "Escribe la dirección de entrega.");
    case "DISTANCIA_INVALIDA":
      return route("address", quoteErrorMessage("address_not_found"));
    case "FUERA_DE_COBERTURA":
      return route("address", quoteErrorMessage("out_of_coverage"));
    case "FECHA_INVALIDA":
      return route("date", "Elige una fecha disponible del calendario.");
    case "FECHA_SIN_ENTREGA": {
      const next = f.nextValidDate;
      return route(
        "date",
        next
          ? `Ya no podemos entregar en esa fecha. La próxima disponible es el ${formatDeliveryDate(next)}.`
          : "Ya no podemos entregar en esa fecha. Elige otra del calendario.",
        next ? { suggestedDate: next } : {},
      );
    }
    default:
      return {
        kind: "entrega",
        fieldErrors: {},
        message: "Revisa los datos de la entrega e inténtalo de nuevo.",
      };
  }
}

function datosRoute(f: RpcFailure, method: DeliveryMethod): OrderRoute {
  if (f.error === "OCASION_INVALIDA") {
    const message = serverFieldMessage("occasion");
    return { kind: "datos", page: 3, fieldErrors: { occasion: message }, message };
  }

  const fields = f.fields ?? [];

  // Address-related fields belong to step 1, which comes first: go there.
  const step1 = fields.filter((c) => c in STEP1_FIELD);
  if (step1.length > 0) {
    const fieldErrors: Record<string, string> = {};
    for (const c of step1) fieldErrors[STEP1_FIELD[c]] = "Revisa este dato.";
    return { kind: "entrega", fieldErrors, message: "Revisa los datos de la entrega e inténtalo de nuevo." };
  }

  const fieldErrors: Record<string, string> = {};
  let page: DetailsPageNumber | null = null;
  for (const c of fields) {
    const p = fieldPage(c, method);
    if (p === null) continue;
    fieldErrors[c] = serverFieldMessage(c);
    if (page === null || p < page) page = p;
  }
  return {
    kind: "datos",
    page: page ?? 1,
    fieldErrors,
    message: "Revisa los datos señalados para continuar.",
  };
}

/** Turns a database failure into where the customer goes next. */
export function mapRpcFailure(failure: RpcFailure, method: DeliveryMethod): OrderRoute {
  switch (failure.paso) {
    case "intento":
      return failure.error === "INTENTO_CERRADO"
        ? {
            kind: "intento",
            reason: "closed",
            message: "El tiempo de tu reserva terminó. Volvemos a reservar tus productos.",
          }
        : { kind: "intento", reason: "invalid", message: "Reiniciamos tu pedido para continuar." };
    case "productos":
      return { kind: "productos", message: productsMessage(failure), variantSku: failure.variantSku };
    case "entrega":
      return entregaRoute(failure);
    case "datos":
      return datosRoute(failure, method);
  }
}

// ---- Time ------------------------------------------------------------------------

const BOGOTA_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "America/Bogota",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** `HH:MM` (24 h) in America/Bogota, or "" if the timestamp is unreadable. */
export function formatExpiryBogota(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return BOGOTA_CLOCK.format(date);
}

/** Whole minutes left (rounded up), never below zero. */
export function minutesUntil(iso: string, now: Date): number {
  const ms = Date.parse(iso) - now.getTime();
  return Number.isNaN(ms) || ms <= 0 ? 0 : Math.ceil(ms / 60_000);
}
