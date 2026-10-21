import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCop } from "../format.ts";
import { cartPillLabel, shouldShowCartPill } from "./cartPill.ts";

const base = { headerHidden: true, itemCount: 2, drawerOpen: false, pathname: "/catalogo" };

describe("shouldShowCartPill", () => {
  it("shows when the header is hidden and the cart has items", () => {
    assert.equal(shouldShowCartPill(base), true);
  });

  it("hides while the header is visible", () => {
    assert.equal(shouldShowCartPill({ ...base, headerHidden: false }), false);
  });

  it("hides on an empty cart", () => {
    assert.equal(shouldShowCartPill({ ...base, itemCount: 0 }), false);
  });

  it("hides while the drawer is open", () => {
    assert.equal(shouldShowCartPill({ ...base, drawerOpen: true }), false);
  });

  it("hides on /checkout and nested checkout paths", () => {
    for (const pathname of ["/checkout", "/checkout/", "/checkout/pago", "/checkout/a/b"]) {
      assert.equal(shouldShowCartPill({ ...base, pathname }), false, pathname);
    }
  });

  it("does not confuse look-alike paths with checkout", () => {
    for (const pathname of ["/checkouts", "/catalogo/checkout-kit", "/"]) {
      assert.equal(shouldShowCartPill({ ...base, pathname }), true, pathname);
    }
  });

  it("tolerates a missing pathname", () => {
    assert.equal(shouldShowCartPill({ ...base, pathname: null }), true);
  });
});

describe("cartPillLabel", () => {
  it("builds the visible text with count and COP total", () => {
    assert.equal(cartPillLabel(2, 402000).text, `Tu pedido (2) · ${formatCop(402000)}`);
  });

  it("uses singular for one product and plural otherwise", () => {
    assert.equal(
      cartPillLabel(1, 50000).ariaLabel,
      `Ver tu pedido: 1 producto, ${formatCop(50000)}`,
    );
    assert.equal(
      cartPillLabel(2, 402000).ariaLabel,
      `Ver tu pedido: 2 productos, ${formatCop(402000)}`,
    );
  });

  it("formats integer COP with no decimals", () => {
    assert.ok(!/[.,]\d{1,2}$/.test(cartPillLabel(3, 1234567).text.replace(/ /g, " ")));
    assert.ok(cartPillLabel(3, 1234567).text.includes("1.234.567"));
  });
});
