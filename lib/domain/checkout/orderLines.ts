import type { WebOrderLine } from "./webOrderResult.ts";

/**
 * The server's order lines carry only the variant SKU. This pairs each with
 * the cart line it came from, just to show a name. Amounts always come from
 * the server line, never from the cart.
 */

export interface NamedCartLine {
  sku: string;
  nombre: string;
  etiqueta: string;
}

export interface DescribedOrderLine {
  /** Product name from the cart, or the SKU if the cart no longer has it. */
  name: string;
  /** Variant label ("Azul"), or "". */
  label: string;
  line: WebOrderLine;
}

export function describeOrderLines(
  lines: readonly WebOrderLine[],
  cart: readonly NamedCartLine[],
): DescribedOrderLine[] {
  // The RPC keeps the order of the request, so positions normally line up.
  const aligned = lines.length === cart.length && lines.every((l, i) => cart[i].sku === l.variantSku);
  const used = new Set<number>();

  return lines.map((line, index) => {
    let match: NamedCartLine | undefined;
    if (aligned) {
      match = cart[index];
    } else {
      const at = cart.findIndex((c, i) => !used.has(i) && c.sku === line.variantSku);
      if (at !== -1) {
        used.add(at);
        match = cart[at];
      }
    }
    return { name: match?.nombre ?? line.variantSku, label: match?.etiqueta ?? "", line };
  });
}
