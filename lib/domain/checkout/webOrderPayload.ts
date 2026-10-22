import type { CartLine } from "../cart.ts";
import type { DeliveryStep } from "./deliveryStep.ts";
import type { Municipality } from "./municipalities.ts";
import type { DetailsDraft, Occasion, SaleDetails } from "./saleDetails.ts";

/**
 * Builds what travels to `create_web_order`.
 *
 * Two shapes, on purpose:
 *  - `OrderRequest`: what the browser sends to the server action. Cart lines
 *    (SKU, quantity, adicionales by name), the delivery as the customer chose
 *    it, and the raw form. NO price, fee, total or distance: the server
 *    re-reads every money value and re-measures the distance.
 *  - `CreateWebOrderPayload`: what the server sends to the RPC, built from the
 *    validated request plus the server-measured distance.
 */

// ---- Browser -> server -----------------------------------------------------------

export interface OrderLineInput {
  sku: string;
  qty: number;
  /** Adicionales by NAME: the database resolves them to ids. */
  options: { name: string; qty: number }[];
}

export type OrderDeliveryInput =
  | { method: "tienda"; date: string }
  | {
      method: "domicilio";
      address: string;
      municipality: Municipality;
      neighborhood: string;
      unit?: string;
      building?: string;
      date: string;
    };

/** The order content without the attempt ids: what the signature is computed over. */
export interface OrderRequest {
  lines: OrderLineInput[];
  delivery: OrderDeliveryInput;
  details: DetailsDraft;
}

export function cartToOrderLines(
  lines: readonly Pick<CartLine, "sku" | "cantidad" | "adicionales">[],
): OrderLineInput[] {
  return lines.map((l) => ({
    sku: l.sku,
    qty: l.cantidad,
    options: l.adicionales.filter((a) => a.cantidad > 0).map((a) => ({ name: a.nombre, qty: a.cantidad })),
  }));
}

export function buildOrderRequest(
  lines: readonly Pick<CartLine, "sku" | "cantidad" | "adicionales">[],
  delivery: DeliveryStep,
  details: DetailsDraft,
): OrderRequest {
  const deliveryInput: OrderDeliveryInput =
    delivery.method === "tienda"
      ? { method: "tienda", date: delivery.date }
      : {
          method: "domicilio",
          address: delivery.address,
          municipality: delivery.municipality,
          neighborhood: delivery.neighborhood,
          unit: delivery.unit,
          building: delivery.building,
          date: delivery.date,
        };
  return { lines: cartToOrderLines(lines), delivery: deliveryInput, details };
}

/**
 * Identity of the order content. The attempt manager compares it to decide
 * whether a new submission is the same order (idempotent resubmit, reload) or
 * a changed one (new attempt that replaces the old).
 */
export function orderRequestSignature(request: OrderRequest): string {
  return JSON.stringify(request);
}

// ---- Server -> RPC ---------------------------------------------------------------

/** Delivery as the server resolved it: the address and distance are its own. */
export type ServerDelivery =
  | { method: "tienda"; date: string }
  | {
      method: "domicilio";
      /** Google's resolved address from the server-side measurement. */
      address: string;
      /** Integer meters measured by the server, never the client's. */
      distanceM: number;
      neighborhood: string;
      city: string;
      unit?: string;
      building?: string;
      date: string;
    };

export interface CreateWebOrderPayload {
  attempt_id: string;
  replaces_attempt_id: string | null;
  lines: { variant_sku: string; qty: number; options: { name: string; qty: number }[] }[];
  delivery: { method: "tienda" | "domicilio"; address: string | null; distance_m: number | null };
  desired_delivery_date: string;
  occasion: Occasion | null;
  details: Omit<SaleDetails, "occasion"> & {
    neighborhood?: string | null;
    city?: string | null;
    delivery_unit?: string | null;
    building_name?: string | null;
  };
}

export function buildCreateWebOrderPayload(input: {
  attemptId: string;
  replacesAttemptId: string | null;
  lines: readonly OrderLineInput[];
  delivery: ServerDelivery;
  details: SaleDetails;
}): CreateWebOrderPayload {
  const { occasion, ...rest } = input.details;
  const d = input.delivery;

  return {
    attempt_id: input.attemptId,
    replaces_attempt_id: input.replacesAttemptId,
    lines: input.lines.map((l) => ({
      variant_sku: l.sku,
      qty: l.qty,
      options: l.options.map((o) => ({ name: o.name, qty: o.qty })),
    })),
    delivery:
      d.method === "tienda"
        ? { method: "tienda", address: null, distance_m: null }
        : { method: "domicilio", address: d.address, distance_m: d.distanceM },
    desired_delivery_date: d.date,
    occasion,
    // Pickup carries no address fields at all (the database strips them too).
    details:
      d.method === "tienda"
        ? rest
        : {
            ...rest,
            neighborhood: d.neighborhood,
            city: d.city,
            delivery_unit: d.unit?.trim() || null,
            building_name: d.building?.trim() || null,
          },
  };
}
