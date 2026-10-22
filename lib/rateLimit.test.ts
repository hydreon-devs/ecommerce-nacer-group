import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromHeaders, createSlidingWindowLimiter } from "./rateLimit.ts";

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

describe("sliding window limiter", () => {
  it("allows up to the limit inside the window and then blocks", () => {
    const c = clock();
    const limiter = createSlidingWindowLimiter({ limit: 3, windowMs: 60_000, now: c.now });
    assert.equal(limiter.check("ip").allowed, true);
    assert.equal(limiter.check("ip").allowed, true);
    assert.equal(limiter.check("ip").allowed, true);
    const blocked = limiter.check("ip");
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60_000);
  });

  it("keeps a separate budget per key", () => {
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 1000, now: clock().now });
    assert.equal(limiter.check("a").allowed, true);
    assert.equal(limiter.check("b").allowed, true);
    assert.equal(limiter.check("a").allowed, false);
  });

  it("slides: old hits expire one by one, not all at once", () => {
    const c = clock();
    const limiter = createSlidingWindowLimiter({ limit: 2, windowMs: 1000, now: c.now });
    limiter.check("ip"); // t=0
    c.advance(600);
    limiter.check("ip"); // t=600
    c.advance(300); // t=900: both inside
    assert.equal(limiter.check("ip").allowed, false);
    c.advance(150); // t=1050: the first expired, the second did not
    assert.equal(limiter.check("ip").allowed, true);
    assert.equal(limiter.check("ip").allowed, false);
  });

  it("reports when the oldest hit leaves the window", () => {
    const c = clock();
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 1000, now: c.now });
    limiter.check("ip");
    c.advance(400);
    assert.equal(limiter.check("ip").retryAfterMs, 600);
  });

  it("does not count blocked attempts against the budget", () => {
    const c = clock();
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 1000, now: c.now });
    limiter.check("ip");
    for (let i = 0; i < 5; i++) limiter.check("ip");
    c.advance(1001);
    assert.equal(limiter.check("ip").allowed, true);
  });

  it("forgets idle keys so memory stays bounded", () => {
    const c = clock();
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 1000, now: c.now, maxKeys: 3 });
    for (const k of ["a", "b", "c"]) limiter.check(k);
    c.advance(2000);
    limiter.check("d");
    assert.ok(limiter.size() <= 3);
    assert.equal(limiter.size(), 1);
  });

  it("never grows past maxKeys even when nothing has expired", () => {
    const limiter = createSlidingWindowLimiter({ limit: 1, windowMs: 60_000, now: clock().now, maxKeys: 2 });
    for (const k of ["a", "b", "c", "d"]) limiter.check(k);
    assert.ok(limiter.size() <= 2);
  });

  it("rejects a nonsensical configuration", () => {
    assert.throws(() => createSlidingWindowLimiter({ limit: 0, windowMs: 1000 }));
    assert.throws(() => createSlidingWindowLimiter({ limit: 1, windowMs: 0 }));
  });
});

describe("clientIpFromHeaders", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

  it("prefers x-real-ip", () => {
    assert.equal(clientIpFromHeaders(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })), "1.2.3.4");
  });

  it("takes the entry the proxy appended (last), not one the client can forge (first)", () => {
    assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })), "1.2.3.4");
    assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": "1.2.3.4" })), "1.2.3.4");
  });

  it("falls back to a shared bucket when no address is known", () => {
    assert.equal(clientIpFromHeaders(h({})), "unknown");
    assert.equal(clientIpFromHeaders(h({ "x-forwarded-for": " , " })), "unknown");
  });
});
