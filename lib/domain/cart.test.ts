import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_LINE_QTY, addToCart, canAddToCart, cartItemCount, quickAddTarget, cartSubtotal, emptyCart, lineKey, lineSubtotal, parseStoredCart, removeLine, serializeCart, setLineQuantity, CART_VERSION } from "./cart.ts";
import type { Producto } from "./types.ts";

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: "p1",
    sku: "CRI-AZUL",
    slug: "mariposa-azul",
    nombre: "Mariposa Azul",
    coleccion: "Pequeños Milagros",
    coleccionSlug: "pequenos-milagros",
    descripcion: null,
    simbolismo: null,
    precioDesdeCop: 50_000,
    tienePreciosVariables: true,
    disponibilidad: "Disponible",
    variantes: [
      { id: "v1", sku: "CRI-AZUL-S", etiqueta: "Pequeña", precioCop: 50_000, vendible: true, imagenUrl: null },
      { id: "v2", sku: "CRI-AZUL-L", etiqueta: "Grande", precioCop: 80_000, vendible: true, imagenUrl: null },
    ],
    adicionales: [
      { id: "a1", nombre: "Tarjeta 3D", precioCop: 12_000, maxCantidad: 2 },
      { id: "a2", nombre: "Chocolates", precioCop: 30_000, maxCantidad: 3 },
    ],
    imagenes: [],
    creadoEn: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("lineKey", () => {
  it("is independent of adicionales order and includes quantities", () => {
    const a = lineKey("SKU", [{ id: "a1", cantidad: 1 }, { id: "a2", cantidad: 2 }]);
    const b = lineKey("SKU", [{ id: "a2", cantidad: 2 }, { id: "a1", cantidad: 1 }]);
    const c = lineKey("SKU", [{ id: "a1", cantidad: 2 }, { id: "a2", cantidad: 2 }]);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.notEqual(lineKey("SKU", []), lineKey("OTHER", []));
  });
});

describe("addToCart", () => {
  it("adds a new line", () => {
    const p = producto();
    const { cart, added } = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 1 });
    assert.equal(added, true);
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines[0].sku, "CRI-AZUL-S");
    assert.equal(cart.lines[0].cantidad, 1);
  });

  it("merges quantities when variant and adicionales match", () => {
    const p = producto();
    const input = { producto: p, variante: p.variantes[0], adicionales: { a1: 1 } };
    const first = addToCart(emptyCart(), { ...input, cantidad: 1 }).cart;
    const second = addToCart(first, { ...input, cantidad: 2 }).cart;
    assert.equal(second.lines.length, 1);
    assert.equal(second.lines[0].cantidad, 3);
  });

  it("keeps a different adicionales combination as a separate line", () => {
    const p = producto();
    const base = { producto: p, variante: p.variantes[0], cantidad: 1 };
    let cart = addToCart(emptyCart(), { ...base, adicionales: { a1: 1 } }).cart;
    cart = addToCart(cart, { ...base, adicionales: { a1: 2 } }).cart;
    cart = addToCart(cart, base).cart;
    assert.equal(cart.lines.length, 3);
  });

  it("keeps a different variant as a separate line", () => {
    const p = producto();
    let cart = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 1 }).cart;
    cart = addToCart(cart, { producto: p, variante: p.variantes[1], cantidad: 1 }).cart;
    assert.equal(cart.lines.length, 2);
  });
});

describe("sellability gate", () => {
  it("Bajo pedido is sellable even when the variant has no stock", () => {
    const p = producto({ disponibilidad: "Bajo pedido" });
    assert.equal(canAddToCart(p, p.variantes[0]), true);
    const { cart, added } = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 1 });
    assert.equal(added, true);
    assert.equal(cart.lines.length, 1);
  });

  it("rejects an Agotado product", () => {
    const p = producto({ disponibilidad: "Agotado" });
    assert.equal(canAddToCart(p, p.variantes[0]), false);
    const { cart, added } = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 1 });
    assert.equal(added, false);
    assert.equal(cart.lines.length, 0);
  });

  it("rejects a non-vendible variant of a sellable product", () => {
    const p = producto();
    const sold = { ...p.variantes[0], vendible: false };
    assert.equal(canAddToCart(p, sold), false);
    assert.equal(addToCart(emptyCart(), { producto: p, variante: sold, cantidad: 1 }).added, false);
  });

  it("rejects a variant that does not belong to the product", () => {
    const p = producto();
    const foreign = { ...p.variantes[0], id: "zz", sku: "OTHER-SKU" };
    assert.equal(canAddToCart(p, foreign), false);
  });
});

describe("quantity bounds", () => {
  it("clamps the added quantity to [1, MAX_LINE_QTY] and floors fractions", () => {
    const p = producto();
    const add = (cantidad: number) =>
      addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad }).cart.lines[0].cantidad;
    assert.equal(add(0), 1);
    assert.equal(add(-4), 1);
    assert.equal(add(2.9), 2);
    assert.equal(add(Number.NaN), 1);
    assert.equal(add(10_000), MAX_LINE_QTY);
  });

  it("caps merged quantity at MAX_LINE_QTY", () => {
    const p = producto();
    const input = { producto: p, variante: p.variantes[0], cantidad: MAX_LINE_QTY };
    const cart = addToCart(addToCart(emptyCart(), input).cart, input).cart;
    assert.equal(cart.lines[0].cantidad, MAX_LINE_QTY);
  });

  it("caps adicional quantity at maxCantidad and ignores zero or unknown adicionales", () => {
    const p = producto();
    const { cart } = addToCart(emptyCart(), {
      producto: p,
      variante: p.variantes[0],
      cantidad: 1,
      adicionales: { a1: 99, a2: 0, ghost: 3 },
    });
    assert.deepEqual(
      cart.lines[0].adicionales.map((a) => [a.id, a.cantidad]),
      [["a1", 2]],
    );
  });
});

describe("line quantity updates", () => {
  function withLine() {
    const p = producto();
    return addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 2 }).cart;
  }

  it("updates the quantity of an existing line", () => {
    const cart = withLine();
    assert.equal(setLineQuantity(cart, cart.lines[0].key, 5).lines[0].cantidad, 5);
  });

  it("removes the line when the quantity drops to 0 or below", () => {
    const cart = withLine();
    assert.equal(setLineQuantity(cart, cart.lines[0].key, 0).lines.length, 0);
    assert.equal(setLineQuantity(cart, cart.lines[0].key, -1).lines.length, 0);
  });

  it("clamps to MAX_LINE_QTY and floors fractions", () => {
    const cart = withLine();
    const key = cart.lines[0].key;
    assert.equal(setLineQuantity(cart, key, 999).lines[0].cantidad, MAX_LINE_QTY);
    assert.equal(setLineQuantity(cart, key, 3.7).lines[0].cantidad, 3);
  });

  it("ignores non-finite quantities and unknown keys", () => {
    const cart = withLine();
    assert.deepEqual(setLineQuantity(cart, cart.lines[0].key, Number.NaN), cart);
    assert.deepEqual(setLineQuantity(cart, "nope", 4), cart);
  });

  it("removeLine drops only the matching line", () => {
    const p = producto();
    let cart = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 1 }).cart;
    cart = addToCart(cart, { producto: p, variante: p.variantes[1], cantidad: 1 }).cart;
    const next = removeLine(cart, cart.lines[0].key);
    assert.equal(next.lines.length, 1);
    assert.equal(next.lines[0].sku, "CRI-AZUL-L");
  });
});

describe("subtotals (integer COP)", () => {
  it("line subtotal = (variant price + sum of adicional price x qty) x line qty", () => {
    const p = producto();
    const { cart } = addToCart(emptyCart(), {
      producto: p,
      variante: p.variantes[1],
      cantidad: 3,
      adicionales: { a1: 2, a2: 1 },
    });
    // (80_000 + 12_000*2 + 30_000*1) * 3
    assert.equal(lineSubtotal(cart.lines[0]), 402_000);
  });

  it("cart subtotal sums lines; empty cart is 0", () => {
    const p = producto();
    let cart = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 2 }).cart;
    cart = addToCart(cart, { producto: p, variante: p.variantes[1], cantidad: 1, adicionales: { a1: 1 } }).cart;
    assert.equal(cartSubtotal(cart), 2 * 50_000 + (80_000 + 12_000));
    assert.equal(cartSubtotal(emptyCart()), 0);
  });

  it("always yields safe integers", () => {
    const p = producto();
    const { cart } = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 7, adicionales: { a2: 3 } });
    assert.ok(Number.isInteger(lineSubtotal(cart.lines[0])));
    assert.ok(Number.isInteger(cartSubtotal(cart)));
  });

  it("item count sums line quantities", () => {
    const p = producto();
    let cart = addToCart(emptyCart(), { producto: p, variante: p.variantes[0], cantidad: 2 }).cart;
    cart = addToCart(cart, { producto: p, variante: p.variantes[1], cantidad: 4 }).cart;
    assert.equal(cartItemCount(cart), 6);
    assert.equal(cartItemCount(emptyCart()), 0);
  });
});

describe("persisted state", () => {
  function filled() {
    const p = producto();
    return addToCart(emptyCart(), {
      producto: p,
      variante: p.variantes[0],
      cantidad: 2,
      adicionales: { a1: 1 },
    }).cart;
  }

  it("round-trips a cart", () => {
    const cart = filled();
    assert.deepEqual(parseStoredCart(serializeCart(cart)), cart);
  });

  it("returns an empty cart for null, empty and non-JSON input", () => {
    assert.deepEqual(parseStoredCart(null), emptyCart());
    assert.deepEqual(parseStoredCart(""), emptyCart());
    assert.deepEqual(parseStoredCart("{not json"), emptyCart());
  });

  it("returns an empty cart for valid JSON of the wrong shape", () => {
    for (const raw of ["null", "42", '"x"', "[]", "{}", '{"version":1}', '{"version":1,"lines":"no"}']) {
      assert.deepEqual(parseStoredCart(raw), emptyCart(), raw);
    }
  });

  it("returns an empty cart for an old or future version", () => {
    const payload = JSON.parse(serializeCart(filled()));
    for (const version of [0, CART_VERSION + 1, "1"]) {
      assert.deepEqual(parseStoredCart(JSON.stringify({ ...payload, version })), emptyCart());
    }
  });

  it("rejects tampered lines: float price, bad quantity, mismatched key", () => {
    const payload = JSON.parse(serializeCart(filled()));
    const mutate = (patch: Record<string, unknown>) =>
      JSON.stringify({ ...payload, lines: [{ ...payload.lines[0], ...patch }] });
    assert.deepEqual(parseStoredCart(mutate({ precioCop: 50_000.5 })), emptyCart());
    assert.deepEqual(parseStoredCart(mutate({ precioCop: -1 })), emptyCart());
    assert.deepEqual(parseStoredCart(mutate({ cantidad: 0 })), emptyCart());
    assert.deepEqual(parseStoredCart(mutate({ cantidad: MAX_LINE_QTY + 1 })), emptyCart());
    assert.deepEqual(parseStoredCart(mutate({ key: "other|" })), emptyCart());
  });

  it("rejects an adicional above its maxCantidad and duplicate keys", () => {
    const payload = JSON.parse(serializeCart(filled()));
    const over = { ...payload.lines[0], adicionales: [{ ...payload.lines[0].adicionales[0], cantidad: 9 }] };
    assert.deepEqual(parseStoredCart(JSON.stringify({ ...payload, lines: [over] })), emptyCart());
    assert.deepEqual(
      parseStoredCart(JSON.stringify({ ...payload, lines: [payload.lines[0], payload.lines[0]] })),
      emptyCart(),
    );
  });
});

describe("quickAddTarget", () => {
  const v = (id: string, vendible: boolean) => ({
    id,
    sku: `SKU-${id}`,
    etiqueta: id,
    precioCop: 10_000,
    vendible,
    imagenUrl: null,
  });

  it("adds the only sellable variant", () => {
    const p = producto({ variantes: [v("v1", true)] });
    assert.deepEqual(quickAddTarget(p), { kind: "add", variante: p.variantes[0] });
  });

  it("treats Bajo pedido as sellable (stock never gates)", () => {
    const p = producto({ disponibilidad: "Bajo pedido", variantes: [v("v1", true)] });
    assert.deepEqual(quickAddTarget(p), { kind: "add", variante: p.variantes[0] });
  });

  it("asks to choose when several variants are sellable", () => {
    const p = producto({ variantes: [v("v1", true), v("v2", true)] });
    assert.deepEqual(quickAddTarget(p), { kind: "choose" });
  });

  it("adds the single sellable variant among non-sellable ones", () => {
    const p = producto({ variantes: [v("v1", false), v("v2", true), v("v3", false)] });
    assert.deepEqual(quickAddTarget(p), { kind: "add", variante: p.variantes[1] });
  });

  it("offers nothing for an Agotado product", () => {
    const p = producto({ disponibilidad: "Agotado", variantes: [v("v1", true)] });
    assert.deepEqual(quickAddTarget(p), { kind: "none" });
  });

  it("offers nothing when no variant is sellable", () => {
    const p = producto({ variantes: [v("v1", false), v("v2", false)] });
    assert.deepEqual(quickAddTarget(p), { kind: "none" });
  });

  it("offers nothing when there are no variants", () => {
    assert.deepEqual(quickAddTarget(producto({ variantes: [] })), { kind: "none" });
  });
});
