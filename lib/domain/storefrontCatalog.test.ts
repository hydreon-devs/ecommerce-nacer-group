import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGallery,
  categoryLabel,
  collectionSlug,
  listCollections,
  mapStorefrontProducts,
  selectFeatured,
  selectRelated,
  skuToSlug,
  toCop,
  variantLabel,
  type StorefrontProductRow,
} from "./storefrontCatalog.ts";

function row(over: Partial<StorefrontProductRow> = {}): StorefrontProductRow {
  return {
    id: "p1",
    sku: "CRI-ARR-BONSAI",
    name: "Arreglo Bonsai",
    brand: "crisalidas",
    description: "Descripción",
    image_url: null,
    base_price: "150000.00",
    category: "Pequeños Milagros",
    simbolismo: null,
    short_name: null,
    created_at: "2026-01-01T00:00:00Z",
    is_published: true,
    product_variants: [
      {
        id: "v1",
        sku: "CRI-ARR-BONSAI-STD",
        attributes: { presentacion: "estándar" },
        price_delta: 0,
        image_url: "https://x.test/a.png",
        is_active: true,
        short_name: null,
      },
    ],
    product_options: [],
    ...over,
  };
}

const units = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe("toCop", () => {
  it("rounds numeric strings and numbers to integer COP", () => {
    assert.equal(toCop("150000.00"), 150000);
    assert.equal(toCop(25000), 25000);
    assert.equal(toCop("1999.6"), 2000);
  });
  it("treats null, undefined and garbage as 0", () => {
    assert.equal(toCop(null), 0);
    assert.equal(toCop(undefined), 0);
    assert.equal(toCop("abc"), 0);
  });
});

describe("skuToSlug", () => {
  it("lowercases the SKU", () => {
    assert.equal(skuToSlug("CRI-ARR-BONSAI"), "cri-arr-bonsai");
  });
  it("is deterministic and trims", () => {
    assert.equal(skuToSlug("  COM-PIN-01 "), "com-pin-01");
  });
});

describe("categoryLabel / collectionSlug", () => {
  it("uses the collection for crisalidas", () => {
    assert.equal(categoryLabel("crisalidas", "Instantes de Vida"), "Instantes de Vida");
  });
  it("labels complementos without category", () => {
    assert.equal(categoryLabel("complementos", null), "Complementos");
  });
  it("falls back to the brand label for crisalidas without category", () => {
    assert.equal(categoryLabel("crisalidas", null), "Crisálidas");
  });
  it("builds an accent-free url slug", () => {
    assert.equal(collectionSlug("Pequeños Milagros"), "pequenos-milagros");
    assert.equal(collectionSlug("Mariposas de Liberación"), "mariposas-de-liberacion");
  });
});

describe("variantLabel", () => {
  it("joins attribute values capitalized", () => {
    assert.equal(variantLabel({ presentacion: "estándar" }, null, "X"), "Estándar");
    assert.equal(variantLabel({ cantidad: "50 mariposas" }, null, "X"), "50 mariposas");
  });
  it("falls back to short_name then sku", () => {
    assert.equal(variantLabel({}, "Corta", "SKU-1"), "Corta");
    assert.equal(variantLabel(null, null, "SKU-1"), "SKU-1");
  });
});

describe("buildGallery", () => {
  it("puts the product image first, then distinct variant images", () => {
    const g = buildGallery("Bonsai", "https://x.test/p.png", [
      { etiqueta: "Azul", imagenUrl: "https://x.test/a.png" },
      { etiqueta: "Rojo", imagenUrl: "https://x.test/a.png" },
      { etiqueta: "Verde", imagenUrl: null },
      { etiqueta: "Lila", imagenUrl: "https://x.test/l.png" },
    ]);
    assert.deepEqual(
      g.map((i) => i.url),
      ["https://x.test/p.png", "https://x.test/a.png", "https://x.test/l.png"],
    );
    assert.equal(g[0].alt, "Bonsai");
    assert.equal(g[1].alt, "Bonsai — Azul");
  });
  it("returns an empty gallery when there are no images", () => {
    assert.deepEqual(buildGallery("X", null, [{ etiqueta: "a", imagenUrl: null }]), []);
  });
});

describe("mapStorefrontProducts", () => {
  it("maps a product with price, slug, category and gallery", () => {
    const [p] = mapStorefrontProducts([row()], units({ v1: 3 }));
    assert.equal(p.slug, "cri-arr-bonsai");
    assert.equal(p.coleccion, "Pequeños Milagros");
    assert.equal(p.coleccionSlug, "pequenos-milagros");
    assert.equal(p.precioDesdeCop, 150000);
    assert.equal(p.disponibilidad, "Disponible");
    assert.equal(p.variantes[0].precioCop, 150000);
    assert.equal(p.variantes[0].etiqueta, "Estándar");
    assert.equal(p.variantes[0].vendible, true);
    assert.equal(p.imagenes.length, 1);
  });

  it("never exposes raw units on the client shape", () => {
    const [p] = mapStorefrontProducts([row()], units({ v1: 3 }));
    assert.equal(JSON.stringify(p).includes("availableUnits"), false);
    assert.equal("stock" in p, false);
  });

  it("adds price_delta to base_price (numeric strings), rounded", () => {
    const r = row({
      product_variants: [
        { id: "v1", sku: "A-1", attributes: { color: "azul" }, price_delta: "10000.00", image_url: null, is_active: true, short_name: null },
        { id: "v2", sku: "A-2", attributes: { color: "rojo" }, price_delta: 0, image_url: null, is_active: true, short_name: null },
      ],
    });
    const [p] = mapStorefrontProducts([r], units({ v1: 1, v2: 1 }));
    assert.deepEqual(p.variantes.map((v) => v.precioCop), [150000, 160000]);
    assert.equal(p.precioDesdeCop, 150000);
    assert.equal(p.tienePreciosVariables, true);
  });

  it("is Agotado only when no active variant has units", () => {
    const r = row({
      product_variants: [
        { id: "v1", sku: "A-1", attributes: {}, price_delta: 0, image_url: null, is_active: true, short_name: null },
        { id: "v2", sku: "A-2", attributes: {}, price_delta: 0, image_url: null, is_active: true, short_name: null },
      ],
    });
    assert.equal(mapStorefrontProducts([r], units({ v1: 0, v2: 2 }))[0].disponibilidad, "Disponible");
    assert.equal(mapStorefrontProducts([r], units({ v1: 0, v2: 0 }))[0].disponibilidad, "Agotado");
    // sin fila en la vista = sin unidades
    assert.equal(mapStorefrontProducts([r], units({}))[0].disponibilidad, "Agotado");
  });

  it("ignores inactive variants and drops products left without any", () => {
    const r = row({
      product_variants: [
        { id: "v1", sku: "A-1", attributes: {}, price_delta: 0, image_url: null, is_active: false, short_name: null },
      ],
    });
    assert.deepEqual(mapStorefrontProducts([r], units({ v1: 5 })), []);
  });

  it("drops unpublished products and brands that do not sell", () => {
    assert.equal(mapStorefrontProducts([row({ is_published: false })], units({ v1: 1 })).length, 0);
    assert.equal(mapStorefrontProducts([row({ brand: "florea" })], units({ v1: 1 })).length, 0);
  });

  it("labels complementos and keeps only active options", () => {
    const r = row({
      brand: "complementos",
      sku: "COM-PIN",
      category: null,
      product_options: [
        { id: "o1", name: "Crisálida adicional", price: "25000.00", max_qty: 1, is_active: true },
        { id: "o2", name: "Inactiva", price: 1000, max_qty: 1, is_active: false },
      ],
    });
    const [p] = mapStorefrontProducts([r], units({ v1: 1 }));
    assert.equal(p.coleccion, "Complementos");
    assert.deepEqual(p.adicionales, [
      { id: "o1", nombre: "Crisálida adicional", precioCop: 25000, maxCantidad: 1 },
    ]);
  });

  it("produces unique, reversible slugs", () => {
    const rows = [row({ id: "a", sku: "CRI-A" }), row({ id: "b", sku: "CRI-B", product_variants: [{ id: "v9", sku: "B-1", attributes: {}, price_delta: 0, image_url: null, is_active: true, short_name: null }] })];
    const out = mapStorefrontProducts(rows, units({ v1: 1, v9: 1 }));
    assert.deepEqual(out.map((p) => p.slug).sort(), ["cri-a", "cri-b"]);
  });
});

describe("listCollections", () => {
  it("returns present collections in canonical order, Complementos last", () => {
    const rows = [
      row({ id: "1", sku: "COM-1", brand: "complementos", category: null }),
      row({ id: "2", sku: "CRI-2", category: "Mariposas de Liberación" }),
      row({ id: "3", sku: "CRI-3", category: "Pequeños Milagros" }),
    ];
    const ps = mapStorefrontProducts(rows, units({ v1: 1 }));
    assert.deepEqual(
      listCollections(ps).map((c) => c.nombre),
      ["Pequeños Milagros", "Mariposas de Liberación", "Complementos"],
    );
  });
});

describe("selectFeatured", () => {
  it("takes the newest vendible products, ties broken by sku", () => {
    const mk = (id: string, sku: string, created: string, v: string) =>
      row({
        id,
        sku,
        created_at: created,
        product_variants: [{ id: v, sku: `${sku}-1`, attributes: {}, price_delta: 0, image_url: null, is_active: true, short_name: null }],
      });
    const ps = mapStorefrontProducts(
      [
        mk("1", "CRI-OLD", "2026-01-01T00:00:00Z", "va"),
        mk("2", "CRI-NEW", "2026-03-01T00:00:00Z", "vb"),
        mk("3", "CRI-SOLD", "2026-04-01T00:00:00Z", "vc"),
        mk("4", "CRI-MID", "2026-02-01T00:00:00Z", "vd"),
      ],
      units({ va: 1, vb: 1, vc: 0, vd: 1 }),
    );
    assert.deepEqual(
      selectFeatured(ps, 2).map((p) => p.sku),
      ["CRI-NEW", "CRI-MID"],
    );
  });
});

describe("selectRelated", () => {
  const mk = (id: string, sku: string, category: string | null, created: string, v: string) =>
    row({
      id,
      sku,
      brand: category ? "crisalidas" : "complementos",
      category,
      created_at: created,
      product_variants: [{ id: v, sku: `${sku}-1`, attributes: {}, price_delta: 0, image_url: null, is_active: true, short_name: null }],
    });
  const ps = mapStorefrontProducts(
    [
      mk("1", "CRI-SELF", "Pequeños Milagros", "2026-05-01T00:00:00Z", "va"),
      mk("2", "CRI-OLD", "Pequeños Milagros", "2026-01-01T00:00:00Z", "vb"),
      mk("3", "CRI-NEW", "Pequeños Milagros", "2026-04-01T00:00:00Z", "vc"),
      mk("4", "CRI-SOLD", "Pequeños Milagros", "2026-04-15T00:00:00Z", "vd"),
      mk("5", "CRI-OTHER", "Instantes de Vida", "2026-06-01T00:00:00Z", "ve"),
      mk("6", "CRI-MID-B", "Pequeños Milagros", "2026-02-01T00:00:00Z", "vf"),
      mk("7", "CRI-MID-A", "Pequeños Milagros", "2026-02-01T00:00:00Z", "vg"),
      mk("8", "COM-OLD", null, "2026-01-01T00:00:00Z", "vh"),
      mk("9", "COM-NEW", null, "2026-03-01T00:00:00Z", "vi"),
      mk("10", "COM-SOLD", null, "2026-07-01T00:00:00Z", "vj"),
    ],
    units({ va: 1, vb: 1, vc: 1, vd: 0, ve: 1, vf: 1, vg: 1, vh: 1, vi: 1, vj: 0 }),
  );
  const bySku = (sku: string) => ps.find((p) => p.sku === sku)!;

  it("takes vendible products of the same collection first, newest first, excluding itself", () => {
    assert.deepEqual(
      selectRelated(ps, bySku("CRI-SELF"), 4).map((p) => p.sku),
      ["CRI-NEW", "CRI-MID-A", "CRI-MID-B", "CRI-OLD"],
    );
  });
  it("respects the limit", () => {
    assert.equal(selectRelated(ps, bySku("CRI-SELF"), 3).length, 3);
  });
  it("fills the remaining slots with vendible complementos, newest first", () => {
    assert.deepEqual(
      selectRelated(ps, bySku("CRI-OTHER"), 4).map((p) => p.sku),
      ["COM-NEW", "COM-OLD"],
    );
  });
  it("tops up a short collection with complementos after its own products", () => {
    assert.deepEqual(
      selectRelated(ps, bySku("CRI-SELF"), 6).map((p) => p.sku),
      ["CRI-NEW", "CRI-MID-A", "CRI-MID-B", "CRI-OLD", "COM-NEW", "COM-OLD"],
    );
  });
  it("never repeats or recommends itself when the current product is a complemento", () => {
    assert.deepEqual(
      selectRelated(ps, bySku("COM-NEW"), 4).map((p) => p.sku),
      ["COM-OLD"],
    );
  });
});
