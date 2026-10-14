import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProductionLine, ProductionOrder } from "@/lib/data/production";
import { DASH } from "../pedidos/orderView.ts";
import { buildProductionDay, buildProductionRow, productCountLabel, variantLabel } from "./productionView.ts";

function makeLine(overrides: Partial<ProductionLine> = {}): ProductionLine {
  return {
    sku: "CM-001-AZ",
    productName: "Mariposa de duelo",
    attributes: { color: "azul" },
    qty: 2,
    chrysalisCount: 5,
    imageUrl: "https://example.test/CM-001-AZ.png",
    options: [],
    ...overrides,
  };
}

function makeOrder(overrides: Partial<ProductionOrder> = {}): ProductionOrder {
  return {
    id: "ord-1",
    human_number: "TEST0001",
    status: "pagado",
    payment_status: "aprobado",
    fulfillment_status: "en_construccion",
    delivery_method: "domicilio",
    occasion: "Homenaje",
    desired_delivery_date: "2026-10-13",
    advisor_name: "Agente virtual",
    supplier_name: null,
    artisan_name: null,
    lines: [makeLine()],
    sale: {
      submitted_at: "2026-10-02T03:00:00.000Z",
      card_from: "Ana",
      card_to: "Luis",
      card_message: "Siempre contigo",
      special_notes: "x".repeat(100),
      neighborhood: "Laureles",
      city: "Medellín",
    },
    ...overrides,
  };
}

describe("variantLabel", () => {
  it("lista los atributos como clave: valor", () => {
    assert.equal(variantLabel({ color: "azul" }), "color: azul");
  });
  it("la presentación estándar es ruido", () => {
    assert.equal(variantLabel({ presentacion: "estándar" }), "");
    assert.equal(variantLabel({ presentacion: "Estandar", color: "rojo" }), "color: rojo");
  });
  it("otra presentación sí se muestra", () => {
    assert.equal(variantLabel({ presentacion: "premium" }), "presentacion: premium");
  });
  it("tolera nulo y valores vacíos", () => {
    assert.equal(variantLabel(null), "");
    assert.equal(variantLabel({ color: "" }), "");
  });
});

describe("foto de la variante", () => {
  it("pasa la imagen de la variante a la línea del detalle, o null si no tiene", () => {
    const row = buildProductionRow(makeOrder({ lines: [makeLine(), makeLine({ sku: "B", imageUrl: null })] }));
    assert.equal(row.detail.lines[0].imageUrl, "https://example.test/CM-001-AZ.png");
    assert.equal(row.detail.lines[1].imageUrl, null);
  });
});

describe("productCountLabel", () => {
  it("singular y plural", () => {
    assert.equal(productCountLabel(1), "1 producto");
    assert.equal(productCountLabel(3), "3 productos");
    assert.equal(productCountLabel(0), "0 productos");
  });
});

describe("buildProductionRow", () => {
  it("la tarjeta lleva la cantidad de productos del pedido", () => {
    const row = buildProductionRow(makeOrder({ lines: [makeLine({ qty: 2 }), makeLine({ qty: 1, sku: "B" })] }));
    assert.equal(row.productCount, "3 productos");
    assert.equal(buildProductionRow(makeOrder({ lines: [makeLine({ qty: 1 })] })).productCount, "1 producto");
  });

  it("el detalle trae la sección Entrega completa", () => {
    const { detail } = buildProductionRow(makeOrder());
    assert.equal(detail.deliveryDate, "13/10/2026");
    assert.equal(detail.deliveryMethod, "Domicilio");
    assert.equal(detail.occasion, "Homenaje");
    assert.equal(detail.place, "Medellín, Laureles");
    assert.equal(detail.state, "en_construccion");
  });

  it("sin fecha, ocasión ni envío el detalle muestra rayas", () => {
    const { detail } = buildProductionRow(
      makeOrder({ desired_delivery_date: null, occasion: null, delivery_method: null, sale: null }),
    );
    assert.equal(detail.deliveryDate, DASH);
    assert.equal(detail.occasion, DASH);
    assert.equal(detail.deliveryMethod, DASH);
    assert.equal(detail.place, DASH);
  });

  it("arma las celdas de la tabla", () => {
    const row = buildProductionRow(makeOrder());
    assert.equal(row.humanNumber, "TEST0001");
    assert.equal(row.detail.totalQty, 2);
    assert.equal(row.chrysalis, 10);
    assert.equal(row.detail.occasion, "Homenaje");
    assert.equal(row.deliveryMethod, "Domicilio");
    assert.equal(row.detail.place, "Medellín, Laureles");
    assert.equal(row.state, "en_construccion");
    assert.notEqual(row.detail.card, null);
    assert.equal(row.step?.to, "preparado");
  });

  it("la fila solo lleva lo que muestra la tarjeta", () => {
    const row = buildProductionRow(makeOrder());
    assert.deepEqual(Object.keys(row).sort(), ["chrysalis", "deliveryMethod", "detail", "humanNumber", "id", "productCount", "state", "step"]);
  });

  it("deja la observación completa en el detalle", () => {
    const row = buildProductionRow(makeOrder());
    assert.equal(row.detail.observation, "x".repeat(100));
  });

  it("suma los adicionales de crisálida por unidad y los lista sin precio", () => {
    const row = buildProductionRow(
      makeOrder({
        lines: [
          makeLine({
            qty: 3,
            chrysalisCount: 5,
            options: [
              { qty: 1, nombre: "Crisalida adicional", precio: 25000 },
              { qty: 1, nombre: "Caja de regalo", precio: 8000 },
            ],
          }),
        ],
      }),
    );
    assert.equal(row.chrysalis, 18);
    assert.deepEqual(row.detail.lines[0].extras, ["Crisalida adicional ×1", "Caja de regalo ×1"]);
    assert.ok(!JSON.stringify(row).includes("25000"));
  });

  it("una línea sin conteo queda fuera de la suma y se marca con guion", () => {
    const row = buildProductionRow(
      makeOrder({ lines: [makeLine(), makeLine({ chrysalisCount: null, sku: "X" })] }),
    );
    assert.equal(row.chrysalis, 10);
    assert.equal(row.detail.lines[1].chrysalis, null);
    assert.equal(row.detail.lines[1].chrysalisLabel, DASH);
    assert.equal(row.detail.totalQty, 4);
  });

  it("si ninguna línea tiene conteo, las crisálidas del pedido son indefinidas", () => {
    const row = buildProductionRow(makeOrder({ lines: [makeLine({ chrysalisCount: null })] }));
    assert.equal(row.chrysalis, null);
    assert.equal(row.detail.chrysalisLabel, DASH);
  });

  it("un borrador de sale_details no muestra nada y lo indica", () => {
    const row = buildProductionRow(
      makeOrder({ sale: { ...makeOrder().sale!, submitted_at: null } }),
    );
    assert.equal(row.detail.place, DASH);
    assert.equal(row.detail.observation, DASH);
    assert.equal(row.detail.card, null);
    assert.equal(row.detail.observation, DASH);
  });

  it("sin fila de sale_details también espera al cliente", () => {
    assert.equal(buildProductionRow(makeOrder({ sale: null })).detail.card, null);
  });

  it("el detalle trae tarjeta, descripción, asesor y proveedor", () => {
    const row = buildProductionRow(makeOrder({ supplier_name: "Marta", artisan_name: "Rosa" }));
    assert.deepEqual(row.detail.card, { from: "Ana", to: "Luis", message: "Siempre contigo" });
    assert.equal("description" in row.detail.lines[0], false);
    assert.ok(!JSON.stringify(row).includes("Urna"));
    assert.equal(row.detail.advisor, "Agente virtual");
    assert.equal(row.detail.supplierName, "Marta");
    assert.equal(row.detail.artisanName, "Rosa");
  });

  it("no expone datos de contacto ni dinero", () => {
    const json = JSON.stringify(buildProductionRow(makeOrder()));
    for (const key of ["phone", "email", "price", "precio", "grand_total", "address", "buyer"]) {
      assert.ok(!json.toLowerCase().includes(key), key);
    }
  });
});

describe("cantidad de adicionales", () => {
  it("la etiqueta y el conteo coinciden con cantidades mal formadas", () => {
    for (const [qty, label] of [[-2, 1], ["2", 2], [1.5, 1.5], [undefined, 1]] as const) {
      const row = buildProductionRow(
        makeOrder({
          lines: [makeLine({ qty: 1, chrysalisCount: 0, options: [{ nombre: "Crisalida adicional", qty }] })],
        }),
      );
      assert.deepEqual(row.detail.lines[0].extras, [`Crisalida adicional ×${label}`]);
      assert.equal(row.chrysalis, label);
    }
  });
});

describe("buildProductionDay", () => {
  it("resume el día: fecha larga, pedidos y crisálidas", () => {
    const view = buildProductionDay(
      [makeOrder(), makeOrder({ id: "ord-2", human_number: "TEST0002", lines: [makeLine({ qty: 1 })] })],
      "2026-10-13",
    );
    assert.equal(view.dayLabel, "martes, 13 de octubre de 2026");
    assert.equal(view.orderCount, 2);
    assert.equal(view.chrysalisTotal, 15);
  });

  it("ordena en construcción, preparado, en despacho y el resto, de forma estable", () => {
    const view = buildProductionDay(
      [
        makeOrder({ id: "a", human_number: "A", fulfillment_status: "entregado" }),
        makeOrder({ id: "b", human_number: "B", fulfillment_status: "en_despacho" }),
        makeOrder({ id: "c", human_number: "C", fulfillment_status: "preparado" }),
        makeOrder({ id: "d", human_number: "D", fulfillment_status: "en_construccion" }),
        makeOrder({ id: "e", human_number: "E", fulfillment_status: "en_construccion" }),
      ],
      "2026-10-13",
    );
    assert.deepEqual(
      view.rows.map((r) => r.humanNumber),
      ["D", "E", "C", "B", "A"],
    );
  });

  it("día vacío", () => {
    const view = buildProductionDay([], "2026-10-13");
    assert.equal(view.orderCount, 0);
    assert.equal(view.chrysalisTotal, 0);
    assert.deepEqual(view.rows, []);
  });
});
