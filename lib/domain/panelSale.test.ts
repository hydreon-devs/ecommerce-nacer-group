import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OCCASIONS,
  addProductToLines,
  advisorNameFor,
  buildPanelSalePayload,
  computeTotals,
  fieldPaso,
  filterProducts,
  isPanelChat,
  mapSaleError,
  mergeDuplicateLines,
  normalizePhone,
  validatePanelSale,
  variantLabel,
  zoneNumberForFee,
  type CatalogProduct,
  type FormLine,
} from "./panelSale.ts";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    lines: [{ variantSku: "CRI-X-STD", qty: 2, optionName: null, optionQty: 1 }],
    deliveryMethod: "domicilio",
    deliveryZone: 2,
    deliveryAddress: "Calle 10 # 20-30",
    desiredDeliveryDate: "2026-10-20",
    occasion: "cumpleaños",
    paymentSource: "transferencia",
    paymentRef: "REF-1",
    details: { buyer_name: "Ana Pérez", buyer_phone: "300 123 4567" },
    ...overrides,
  };
}

const catalog: CatalogProduct[] = [
  {
    id: "p1",
    name: "Mariposa Azul",
    variants: [
      { sku: "A-1", label: "Pequeña", price: 100000, available: 3 },
      { sku: "A-2", label: "Grande", price: 150000, available: 0 },
    ],
    options: [{ name: "Crisálida adicional", price: 20000, maxQty: 2 }],
  },
  {
    id: "p2",
    name: "Árbol de Vida",
    variants: [{ sku: "B-1", label: "Única", price: 80000, available: 5 }],
    options: [],
  },
];

describe("normalizePhone", () => {
  it("keeps only digits", () => {
    assert.equal(normalizePhone("+57 (300) 123-4567"), "573001234567");
    assert.equal(normalizePhone(undefined), "");
  });
});

describe("validatePanelSale", () => {
  it("accepts a complete sale and normalizes values", () => {
    const r = validatePanelSale(validInput());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.details.buyer_phone, "3001234567");
      assert.equal(r.value.deliveryZone, 2);
      assert.equal(r.value.details.may_call_recipient, "si");
      assert.equal(r.value.details.wants_invoice, "no");
    }
  });

  it("requires at least one line and a positive integer quantity", () => {
    const none = validatePanelSale(validInput({ lines: [] }));
    assert.equal(none.ok === false && none.errors.lines !== undefined, true);
    const bad = validatePanelSale(
      validInput({ lines: [{ variantSku: "A", qty: 0, optionName: null, optionQty: 1 }] }),
    );
    assert.equal(bad.ok === false && bad.errors["line:0"] !== undefined, true);
  });

  it("requires zone and address for domicilio, and ignores them for tienda", () => {
    const r = validatePanelSale(validInput({ deliveryZone: null, deliveryAddress: " " }));
    assert.ok(!r.ok && r.errors.delivery_zone && r.errors.delivery_address);
    const t = validatePanelSale(validInput({ deliveryMethod: "tienda", deliveryZone: null, deliveryAddress: "" }));
    assert.equal(t.ok, true);
    if (t.ok) assert.equal(t.value.deliveryZone, null);
  });

  it("checks the date, occasion, payment source and enforces buyer name and phone", () => {
    const r = validatePanelSale(
      validInput({
        desiredDeliveryDate: "2026-02-31",
        occasion: "otra",
        paymentSource: "efectivo",
        details: { buyer_name: " ", buyer_phone: "123" },
      }),
    );
    assert.ok(!r.ok);
    if (!r.ok) {
      for (const key of ["desired_delivery_date", "occasion", "payment_source", "buyer_name", "buyer_phone"]) {
        assert.ok(r.errors[key], key);
      }
    }
  });

  it("applies the DB length limits", () => {
    const r = validatePanelSale(
      validInput({
        details: {
          buyer_name: "x".repeat(151),
          buyer_phone: "3001234567",
          delivery_unit: "x".repeat(121),
          card_from: "x".repeat(101),
          card_message: "x".repeat(1001),
          special_notes: "x".repeat(1001),
        },
        deliveryAddress: "x".repeat(201),
      }),
    );
    assert.ok(!r.ok);
    if (!r.ok) {
      for (const key of ["buyer_name", "delivery_unit", "card_from", "card_message", "special_notes", "delivery_address"]) {
        assert.ok(r.errors[key], key);
      }
    }
    const edge = validatePanelSale(
      validInput({ details: { buyer_name: "x".repeat(150), buyer_phone: "3001234567", card_message: "x".repeat(1000) } }),
    );
    assert.equal(edge.ok, true);
  });

  it("validates emails and only asks invoice data when an invoice is wanted", () => {
    const bad = validatePanelSale(
      validInput({ details: { buyer_name: "A", buyer_phone: "3001234567", buyer_email: "no-es-correo" } }),
    );
    assert.ok(!bad.ok && bad.errors.buyer_email);

    const noInvoice = validatePanelSale(
      validInput({ details: { buyer_name: "A", buyer_phone: "3001234567", invoice_tax_id: "basura" } }),
    );
    assert.equal(noInvoice.ok, true);
    if (noInvoice.ok) assert.equal(noInvoice.value.details.invoice_tax_id, "");

    const wanted = validatePanelSale(
      validInput({
        details: { buyer_name: "A", buyer_phone: "3001234567", wants_invoice: "si", invoice_tax_id: "abc", invoice_email: "x" },
      }),
    );
    assert.ok(!wanted.ok && wanted.errors.invoice_tax_id && wanted.errors.invoice_email);

    const ok = validatePanelSale(
      validInput({
        details: { buyer_name: "A", buyer_phone: "3001234567", wants_invoice: "si", invoice_tax_id: "900123456-7" },
      }),
    );
    assert.equal(ok.ok, true);
  });

  it("rejects an unknown referral source and bad recipient phone", () => {
    const r = validatePanelSale(
      validInput({ details: { buyer_name: "A", buyer_phone: "3001234567", referral_source: "Radio", recipient_phone: "12" } }),
    );
    assert.ok(!r.ok && r.errors.referral_source && r.errors.recipient_phone);
  });

  it("treats garbage input as invalid instead of throwing", () => {
    assert.equal(validatePanelSale(null).ok, false);
    assert.equal(validatePanelSale("x").ok, false);
  });

  it("knows the 12 occasions", () => {
    assert.equal(OCCASIONS.length, 12);
  });
});

describe("buildPanelSalePayload", () => {
  it("builds the contract shape with the advisor from the server", () => {
    const r = validatePanelSale(validInput());
    assert.ok(r.ok);
    const p = buildPanelSalePayload(r.value, "Laura");
    assert.equal(p.advisor_name, "Laura");
    assert.equal(p.payment_source, "transferencia");
    assert.equal(p.delivery_method, "domicilio");
    assert.equal(p.delivery_zone, 2);
    assert.equal(p.delivery_address, "Calle 10 # 20-30");
    assert.equal(p.desired_delivery_date, "2026-10-20");
    assert.deepEqual(p.lines, [{ variant_sku: "CRI-X-STD", qty: 2 }]);
    assert.equal(p.details.buyer_phone, "3001234567");
    assert.equal(p.details.delivery_address_exact, "Calle 10 # 20-30");
  });

  it("sends the add-on only when chosen and omits zone and address for tienda", () => {
    const r = validatePanelSale(
      validInput({
        deliveryMethod: "tienda",
        lines: [{ variantSku: "A-1", qty: 1, optionName: "Crisálida adicional", optionQty: 2 }],
      }),
    );
    assert.ok(r.ok);
    const p = buildPanelSalePayload(r.value, "Laura");
    assert.deepEqual(p.lines, [
      { variant_sku: "A-1", qty: 1, option_name: "Crisálida adicional", option_qty: 2 },
    ]);
    assert.ok(!("delivery_zone" in p));
    assert.ok(!("delivery_address" in p));
    assert.equal(p.details.delivery_address_exact, "");
  });
});

describe("mapSaleError", () => {
  const names = { "A-1": "Mariposa Azul (Pequeña)" };

  it("explains insufficient stock with the product and remaining units", () => {
    const r = mapSaleError({ ok: false, error: "STOCK_INSUFICIENTE", paso: "productos", variant_sku: "A-1", unidades: 2, mensaje: "texto para el modelo" }, names);
    assert.equal(r.paso, "productos");
    assert.match(r.message, /Mariposa Azul \(Pequeña\)/);
    assert.match(r.message, /2 unidades/);
    assert.ok(!r.message.includes("modelo"));
    assert.deepEqual(r.fields, ["line:A-1"]);
    assert.match(mapSaleError({ ok: false, error: "STOCK_INSUFICIENTE", variant_sku: "A-1", unidades: 1 }, names).message, /1 unidad\b/);
    assert.match(mapSaleError({ ok: false, error: "STOCK_INSUFICIENTE", variant_sku: "A-1", unidades: 0 }, names).message, /no quedan unidades/i);
  });

  it("maps add-on limits with the maximum", () => {
    const r = mapSaleError({ ok: false, error: "OPCION_EXCEDE_MAXIMO", variant_sku: "A-1", maximo: 2 }, names);
    assert.match(r.message, /2/);
  });

  it("marks fields for data errors and delivery/payment codes", () => {
    const d = mapSaleError({ ok: false, error: "DATOS_INVALIDOS", paso: "datos", campos: ["buyer_phone"] }, {});
    assert.deepEqual(d.fields, ["buyer_phone"]);
    assert.equal(d.paso, "datos");
    const o = mapSaleError({ ok: false, error: "DATOS_INVALIDOS", paso: "datos", restriccion: "orders_occasion_check" }, {});
    assert.deepEqual(o.fields, ["occasion"]);
    assert.equal(o.paso, "datos");
    assert.deepEqual(mapSaleError({ ok: false, error: "DIRECCION_REQUERIDA" }, {}).fields, ["delivery_address"]);
    assert.equal(mapSaleError({ ok: false, error: "DIRECCION_REQUERIDA" }, {}).paso, "entrega");
    assert.equal(mapSaleError({ ok: false, error: "PAGO_YA_APLICADO" }, {}).paso, "pago");
    assert.deepEqual(mapSaleError({ ok: false, error: "PAGO_YA_APLICADO" }, {}).fields, ["payment_ref"]);
  });

  it("falls back to a generic Spanish message for unknown shapes, never echoing mensaje", () => {
    const r = mapSaleError({ ok: false, error: "NUEVO_CODIGO", mensaje: "Dile al cliente..." }, {});
    assert.ok(r.message.length > 0 && !r.message.includes("cliente"));
    assert.equal(mapSaleError(null, {}).paso, "datos");
  });
});

describe("fieldPaso", () => {
  it("assigns every field to a step", () => {
    assert.equal(fieldPaso("lines"), "productos");
    assert.equal(fieldPaso("line:3"), "productos");
    assert.equal(fieldPaso("delivery_zone"), "entrega");
    assert.equal(fieldPaso("occasion"), "entrega");
    assert.equal(fieldPaso("payment_source"), "pago");
    assert.equal(fieldPaso("buyer_name"), "datos");
  });
});

describe("computeTotals", () => {
  it("adds lines, add-ons and the zone value", () => {
    const total = computeTotals(
      [
        { variantSku: "A-1", qty: 2, optionName: "Crisálida adicional", optionQty: 1 },
        { variantSku: "B-1", qty: 1, optionName: null, optionQty: 1 },
      ],
      catalog,
      25000,
    );
    // El adicional va por unidad: la base lo suma al precio unitario de la línea.
    assert.deepEqual(total, { products: 280000, addOns: 40000, delivery: 25000, total: 345000 });
  });

  it("ignores unknown variants and defaults delivery to zero", () => {
    assert.equal(computeTotals([{ variantSku: "??", qty: 3, optionName: null, optionQty: 1 }], catalog, 0).total, 0);
  });
});

describe("addProductToLines", () => {
  const single: CatalogProduct = {
    id: "s",
    name: "Orquídea de Dos Tallos",
    variants: [{ sku: "S-1", label: "Única", price: 300000, available: 3 }],
    options: [],
  };
  const multi: CatalogProduct = {
    id: "m",
    name: "Aura",
    variants: [
      { sku: "M-1", label: "blanco", price: 100000, available: 2 },
      { sku: "M-2", label: "negro", price: 100000, available: 0 },
      { sku: "M-3", label: "rosa", price: 100000, available: 1 },
    ],
    options: [{ name: "Crisálida adicional", price: 25000, maxQty: 1 }],
  };
  const line = (key: number, productId: string, variantSku: string, qty: number, optionName = ""): FormLine => ({
    key,
    productId,
    variantSku,
    qty,
    optionName,
    optionQty: 1,
  });
  const addTimes = (product: CatalogProduct, times: number) => {
    let lines: FormLine[] = [];
    for (let key = 1; key <= times; key++) lines = addProductToLines(lines, product, key);
    return lines;
  };

  it("adds a line the first time a product is picked", () => {
    assert.deepEqual(addProductToLines([], single, 1), [line(1, "s", "S-1", 1)]);
  });

  it("raises the quantity instead of repeating a product without variants", () => {
    assert.deepEqual(addTimes(single, 2), [line(1, "s", "S-1", 2)]);
  });

  it("stops at the available stock", () => {
    assert.deepEqual(addTimes(single, 5), [line(1, "s", "S-1", 3)]);
  });

  it("uses the next variant with stock before repeating one", () => {
    assert.deepEqual(addTimes(multi, 2), [line(1, "m", "M-1", 1), line(2, "m", "M-3", 1)]);
    assert.deepEqual(addTimes(multi, 4), [line(1, "m", "M-1", 2), line(2, "m", "M-3", 1)]);
  });

  it("does not add another add-on: a line with add-on gets a plain line next to it", () => {
    const withAddOn = [line(1, "m", "M-3", 1), line(2, "m", "M-1", 1, "Crisálida adicional")];
    assert.deepEqual(addProductToLines(withAddOn, multi, 3), [...withAddOn, line(3, "m", "M-1", 1)]);
  });

  it("leaves other products untouched", () => {
    const lines = addProductToLines([line(1, "m", "M-1", 1)], single, 2);
    assert.deepEqual(lines, [line(1, "m", "M-1", 1), line(2, "s", "S-1", 1)]);
  });
});

describe("mergeDuplicateLines", () => {
  const line = (key: number, variantSku: string, qty: number, optionName = "", optionQty = 1): FormLine => ({
    key,
    productId: "p",
    variantSku,
    qty,
    optionName,
    optionQty,
  });

  it("joins lines with the same variant and add-on into the first one", () => {
    assert.deepEqual(mergeDuplicateLines([line(1, "A", 1), line(2, "B", 1), line(3, "A", 2)]), [
      line(1, "A", 3),
      line(2, "B", 1),
    ]);
  });

  it("keeps apart lines whose add-on differs", () => {
    const lines = [line(1, "A", 1), line(2, "A", 1, "Extra"), line(3, "A", 1, "Extra", 2)];
    assert.deepEqual(mergeDuplicateLines(lines), lines);
  });

  it("ignores the add-on quantity when there is no add-on", () => {
    assert.deepEqual(mergeDuplicateLines([line(1, "A", 1, "", 1), line(2, "A", 1, "", 2)]), [line(1, "A", 2, "", 1)]);
  });
});

describe("catalog helpers", () => {
  it("builds a variant label from attributes", () => {
    assert.equal(variantLabel({ color: "Azul", tamaño: "Grande" }), "Azul · Grande");
    assert.equal(variantLabel({}), "Única");
  });

  it("filters products by name ignoring case and accents", () => {
    assert.deepEqual(filterProducts(catalog, "arbol").map((p) => p.id), ["p2"]);
    assert.deepEqual(filterProducts(catalog, "  ").map((p) => p.id), ["p1", "p2"]);
    assert.deepEqual(filterProducts(catalog, "zzz"), []);
  });
});

describe("advisorNameFor", () => {
  it("prefers the profile name, then the email, trimmed and capped at 100", () => {
    assert.equal(advisorNameFor({ email: "a@b.co", user_metadata: { full_name: " Laura Gómez " } }), "Laura Gómez");
    assert.equal(advisorNameFor({ email: "laura@nacer.co", user_metadata: {} }), "laura@nacer.co");
    assert.equal(advisorNameFor({ email: "x".repeat(150) }).length, 100);
    assert.equal(advisorNameFor(null), "");
  });
});

describe("panel orders display helpers", () => {
  it("recognizes the synthetic chat id", () => {
    assert.equal(isPanelChat("panel:0f0e"), true);
    assert.equal(isPanelChat("573001112233"), false);
  });

  it("finds the zone number by the delivery fee, 1-based, in tariff order", () => {
    const values = [18000, 25000, 35000, 40000];
    assert.equal(zoneNumberForFee(25000, values), 2);
    assert.equal(zoneNumberForFee(40000, values), 4);
    assert.equal(zoneNumberForFee(12345, values), null);
    assert.equal(zoneNumberForFee(null, values), null);
  });
});
