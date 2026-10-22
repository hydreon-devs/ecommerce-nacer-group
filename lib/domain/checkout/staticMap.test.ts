import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { staticMapUrl } from "./staticMap.ts";

describe("staticMapUrl", () => {
  it("places a marker on the resolved address with the browser key", () => {
    const url = new URL(staticMapUrl("Cra. 43A #1-50, Medellín", "BROWSER_KEY")!);
    assert.equal(url.origin + url.pathname, "https://maps.googleapis.com/maps/api/staticmap");
    assert.match(url.searchParams.get("markers") ?? "", /Cra\. 43A #1-50, Medellín$/);
    assert.equal(url.searchParams.get("key"), "BROWSER_KEY");
    assert.ok(url.searchParams.get("zoom"));
  });

  it("returns null without a key or an address (text only)", () => {
    assert.equal(staticMapUrl("Cra. 43A", undefined), null);
    assert.equal(staticMapUrl("Cra. 43A", "  "), null);
    assert.equal(staticMapUrl("  ", "KEY"), null);
  });
});
