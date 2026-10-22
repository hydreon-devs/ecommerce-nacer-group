import { z } from "zod";
import { MAX_LINE_QTY } from "../cart.ts";
import type { CreateOrderResult } from "./attempt.ts";
import type { DistanceProvider } from "./distanceProvider.ts";
import { MUNICIPALITIES } from "./municipalities.ts";
import {
  ADDRESS_MAX_LENGTH,
  ADDRESS_MIN_LENGTH,
  buildDestination,
  quoteErrorMessage,
} from "./quoteDelivery.ts";
import { BUILDING_MAX_LENGTH } from "./deliveryStep.ts";
import { createDetailsSchema, fieldPage, serverFieldMessage, validateDetails } from "./saleDetails.ts";
import { buildCreateWebOrderPayload, type CreateWebOrderPayload, type ServerDelivery } from "./webOrderPayload.ts";
import {
  mapRpcFailure,
  parseCreateWebOrderResult,
  type OrderRoute,
} from "./webOrderResult.ts";

/**
 * Server use case behind `createWebOrderAction`. Input is untrusted (a public
 * POST): everything is validated here with the shared schemas, the distance is
 * RE-MEASURED through the `DistanceProvider` (the client's meters, fee and
 * resolved address are never read) and prices never travel: the RPC reads them
 * from the database. Network and database are injected, so tests use fakes.
 */

export interface CreateWebOrderDeps {
  distance: DistanceProvider;
  /** Calls `create_web_order` with the admin client and returns the raw jsonb. */
  rpc: (payload: CreateWebOrderPayload) => Promise<unknown>;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const lineSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
  options: z
    .array(z.object({ name: z.string().trim().min(1).max(120), qty: z.number().int().min(1).max(99) }))
    .max(30),
});

const deliverySchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("tienda"), date: z.string().regex(DATE) }),
  z.object({
    method: z.literal("domicilio"),
    address: z.string().trim().min(ADDRESS_MIN_LENGTH).max(ADDRESS_MAX_LENGTH),
    municipality: z.enum(MUNICIPALITIES),
    neighborhood: z.string().trim().min(2).max(100),
    unit: z.string().trim().max(100).optional(),
    building: z.string().trim().max(BUILDING_MAX_LENGTH).optional(),
    date: z.string().regex(DATE),
  }),
]);

const attemptIds = z
  .object({ attemptId: z.uuid(), replacesAttemptId: z.uuid().nullish() })
  .refine((v) => v.replacesAttemptId == null || v.replacesAttemptId.toLowerCase() !== v.attemptId.toLowerCase());

const fail = (route: OrderRoute): CreateOrderResult => ({ ok: false, route });

const UNREADABLE: OrderRoute = {
  kind: "retry",
  message: "No pudimos leer tu pedido. Recarga la página e inténtalo de nuevo.",
};
const UNAVAILABLE: OrderRoute = {
  kind: "retry",
  message: "No pudimos crear tu pedido en este momento. Inténtalo de nuevo en unos minutos.",
};

export async function createWebOrder(raw: unknown, deps: CreateWebOrderDeps): Promise<CreateOrderResult> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail(UNREADABLE);
  const body = raw as Record<string, unknown>;

  // 1. Attempt ids.
  const ids = attemptIds.safeParse(body);
  if (!ids.success) {
    return fail({ kind: "intento", reason: "invalid", message: "Reiniciamos tu pedido para continuar." });
  }

  // 2. Lines.
  const lines = z.array(lineSchema).min(1).max(50).safeParse(body.lines);
  if (!lines.success) {
    return fail({
      kind: "productos",
      message: "No pudimos leer tu carrito. Vuelve a abrirlo e inténtalo de nuevo.",
    });
  }

  // 3. Delivery as the customer chose it.
  const delivery = deliverySchema.safeParse(body.delivery);
  if (!delivery.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of delivery.error.issues) fieldErrors[String(issue.path[0] ?? "method")] ??= "Revisa este dato.";
    return fail({
      kind: "entrega",
      fieldErrors,
      message: "Revisa los datos de la entrega e inténtalo de nuevo.",
    });
  }
  const method = delivery.data.method;

  // 4. Details: the same schemas as the form, before spending a Google call.
  const details = createDetailsSchema().safeParse(body.details);
  if (!details.success) {
    // Re-run per page to get one message per field and the earliest page.
    const checked = validateDetails(
      (typeof body.details === "object" && body.details !== null ? body.details : {}) as never,
      method,
    );
    const fieldErrors: Record<string, string> = checked.ok ? {} : { ...checked.errors };
    if (Object.keys(fieldErrors).length === 0) {
      for (const issue of details.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field) fieldErrors[field] ??= serverFieldMessage(field);
      }
    }
    let page = 4;
    for (const field of Object.keys(fieldErrors)) {
      const p = fieldPage(field, method);
      if (p !== null && p < page) page = p;
    }
    return fail({
      kind: "datos",
      page: Object.keys(fieldErrors).length > 0 ? (page as 1 | 2 | 3 | 4) : 1,
      fieldErrors,
      message: "Revisa los datos señalados para continuar.",
    });
  }

  // 5. Distance, re-measured here. Pickup measures nothing.
  let serverDelivery: ServerDelivery;
  if (delivery.data.method === "tienda") {
    serverDelivery = { method: "tienda", date: delivery.data.date };
  } else {
    const d = delivery.data;
    let measured;
    try {
      measured = await deps.distance.measure(buildDestination(d.address, d.municipality));
    } catch {
      measured = null;
    }
    if (measured === null || !measured.ok) {
      const kind = measured === null ? "provider_error" : measured.error.kind;
      const message = quoteErrorMessage(kind);
      return fail({ kind: "entrega", fieldErrors: { address: message }, message });
    }
    serverDelivery = {
      method: "domicilio",
      // Orders keep Google's resolved address (up to 200 characters).
      address: measured.resolvedAddress.slice(0, ADDRESS_MAX_LENGTH),
      distanceM: measured.meters,
      neighborhood: d.neighborhood,
      city: d.municipality,
      unit: d.unit,
      building: d.building,
      date: d.date,
    };
  }

  // 6. The RPC.
  const payload = buildCreateWebOrderPayload({
    attemptId: ids.data.attemptId,
    replacesAttemptId: ids.data.replacesAttemptId ?? null,
    lines: lines.data,
    delivery: serverDelivery,
    details: details.data,
  });

  let answer: unknown;
  try {
    answer = await deps.rpc(payload);
  } catch {
    return fail(UNAVAILABLE);
  }

  const parsed = parseCreateWebOrderResult(answer);
  if (parsed.kind === "ok") return { ok: true, order: parsed.order };
  if (parsed.kind === "failed") return fail(mapRpcFailure(parsed.failure, method));
  return fail(UNAVAILABLE);
}
