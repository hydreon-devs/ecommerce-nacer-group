import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatDeliveryAddress, type DeliveryAddressSale } from "./deliveryAddress.ts";

const DASH = "—";

function makeSale(overrides: Partial<DeliveryAddressSale> = {}): DeliveryAddressSale {
  return {
    submitted_at: "2026-10-02T03:00:00.000Z",
    delivery_address_exact: null,
    delivery_unit: null,
    building_name: null,
    neighborhood: null,
    city: null,
    ...overrides,
  };
}

describe("formatDeliveryAddress", () => {
  it("joins the exact address with unit, building, neighborhood and city", () => {
    const sale = makeSale({
      delivery_address_exact: "Cra 5 # 6-7",
      delivery_unit: "Apto 301",
      building_name: "Torre Sol",
      neighborhood: "Laureles",
      city: "Medellín",
    });
    assert.equal(
      formatDeliveryAddress("Otra dirección, Bello", sale, DASH),
      "Cra 5 # 6-7, Apto 301, Torre Sol, Laureles, Medellín",
    );
  });

  it("skips blank parts of the exact address", () => {
    const sale = makeSale({ delivery_address_exact: " Cra 5 ", delivery_unit: "  ", city: "Medellín" });
    assert.equal(formatDeliveryAddress(null, sale, DASH), "Cra 5, Medellín");
  });

  it("uses the order address when the exact one is missing, without neighborhood or city", () => {
    const sale = makeSale({
      delivery_address_exact: "   ",
      delivery_unit: "Apto 2",
      building_name: "Torre Sol",
      neighborhood: "Santa Ana",
      city: "Girardota",
    });
    assert.equal(
      formatDeliveryAddress("Cra. 9a #10E-68, Girardota, Antioquia, Colombia", sale, DASH),
      "Cra. 9a #10E-68, Girardota, Antioquia, Colombia, Apto 2, Torre Sol",
    );
  });

  it("uses the order address alone when the form was not submitted", () => {
    assert.equal(formatDeliveryAddress(" Cra 9 # 10, Girardota ", null, DASH), "Cra 9 # 10, Girardota");
    const draft = makeSale({ submitted_at: null, delivery_address_exact: "Cra 5", city: "Medellín" });
    assert.equal(formatDeliveryAddress("Cra 9 # 10", draft, DASH), "Cra 9 # 10");
  });

  it("falls back to unit, building, neighborhood and city when there is no street address", () => {
    const sale = makeSale({ neighborhood: "Santa Ana", city: "Girardota" });
    assert.equal(formatDeliveryAddress(null, sale, DASH), "Santa Ana, Girardota");
    assert.equal(formatDeliveryAddress("  ", sale, DASH), "Santa Ana, Girardota");
    assert.equal(
      formatDeliveryAddress(null, makeSale({ delivery_unit: "Apto 2", building_name: "Torre", city: "Bello" }), DASH),
      "Apto 2, Torre, Bello",
    );
  });

  it("returns the fallback when there is nothing", () => {
    assert.equal(formatDeliveryAddress(null, null, DASH), DASH);
    assert.equal(formatDeliveryAddress("  ", makeSale(), DASH), DASH);
    assert.equal(formatDeliveryAddress(null, makeSale({ submitted_at: null, city: "Bello" }), DASH), DASH);
  });
});
