import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bogotaDay,
  bogotaYearMonth,
  bucketTrend,
  parsePeriodParams,
  periodForMonth,
  periodLabel,
  periodQuery,
  periodRange,
  resolvePeriodSelection,
  samePeriod,
  trendGranularity,
  type PeriodSelection,
} from "./period.ts";

describe("periodForMonth", () => {
  it("starts and ends at midnight Bogotá (UTC-5) of the month boundaries", () => {
    assert.deepEqual(periodForMonth(2026, 10), {
      desde: "2026-10-01T05:00:00.000Z",
      hasta: "2026-11-01T05:00:00.000Z",
    });
  });

  it("rolls December over into January of the next year", () => {
    assert.deepEqual(periodForMonth(2026, 12), {
      desde: "2026-12-01T05:00:00.000Z",
      hasta: "2027-01-01T05:00:00.000Z",
    });
  });

  it("handles a leap-year February", () => {
    assert.deepEqual(periodForMonth(2028, 2), {
      desde: "2028-02-01T05:00:00.000Z",
      hasta: "2028-03-01T05:00:00.000Z",
    });
  });
});

describe("bogotaYearMonth", () => {
  it("uses the Bogotá calendar, not UTC, at the month boundary", () => {
    // 2026-11-01 03:00 UTC is still 2026-10-31 22:00 in Bogotá.
    assert.deepEqual(bogotaYearMonth(new Date("2026-11-01T03:00:00Z")), { year: 2026, month: 10 });
    assert.deepEqual(bogotaYearMonth(new Date("2026-11-01T05:00:00Z")), { year: 2026, month: 11 });
  });
});

describe("periodRange", () => {
  it("returns null for the all-time selection", () => {
    assert.equal(periodRange({ kind: "all" }), null);
  });

  it("covers a whole year from Jan 1 00:00 Bogotá to Jan 1 of the next year", () => {
    assert.deepEqual(periodRange({ kind: "year", year: 2026 }), {
      desde: "2026-01-01T05:00:00.000Z",
      hasta: "2027-01-01T05:00:00.000Z",
    });
  });

  it("covers a single month like periodForMonth", () => {
    assert.deepEqual(periodRange({ kind: "month", year: 2026, month: 12 }), periodForMonth(2026, 12));
  });
});

describe("parsePeriodParams", () => {
  const now = new Date("2026-10-13T15:00:00Z");
  const all: PeriodSelection = { kind: "all" };

  it("is unfiltered when there are no params", () => {
    assert.deepEqual(parsePeriodParams({}, now), all);
  });

  it("accepts a year alone as the whole year", () => {
    assert.deepEqual(parsePeriodParams({ anio: "2025" }, now), { kind: "year", year: 2025 });
    assert.deepEqual(parsePeriodParams({ anio: "2026" }, now), { kind: "year", year: 2026 });
  });

  it("accepts month and year, including the current month", () => {
    assert.deepEqual(parsePeriodParams({ mes: "3", anio: "2026" }, now), { kind: "month", year: 2026, month: 3 });
    assert.deepEqual(parsePeriodParams({ mes: "12", anio: "2025" }, now), { kind: "month", year: 2025, month: 12 });
    assert.deepEqual(parsePeriodParams({ mes: "10", anio: "2026" }, now), { kind: "month", year: 2026, month: 10 });
  });

  it("treats a month without a year as unfiltered", () => {
    assert.deepEqual(parsePeriodParams({ mes: "3" }, now), all);
  });

  it("treats an empty month as absent", () => {
    assert.deepEqual(parsePeriodParams({ mes: "", anio: "2025" }, now), { kind: "year", year: 2025 });
  });

  it("falls back to unfiltered on non-numeric, fractional or out-of-range values", () => {
    for (const raw of [
      { mes: "abc", anio: "2026" },
      { mes: "0", anio: "2026" },
      { mes: "13", anio: "2026" },
      { mes: "1.5", anio: "2026" },
      { mes: "-1", anio: "2026" },
      { anio: "26" },
      { anio: "1999" },
      { anio: "2026abc" },
      { mes: "3", anio: "26" },
      { mes: "", anio: "" },
    ]) {
      assert.deepEqual(parsePeriodParams(raw, now), all, JSON.stringify(raw));
    }
  });

  it("falls back to unfiltered on future months and years", () => {
    assert.deepEqual(parsePeriodParams({ mes: "11", anio: "2026" }, now), all);
    assert.deepEqual(parsePeriodParams({ mes: "1", anio: "2027" }, now), all);
    assert.deepEqual(parsePeriodParams({ anio: "2027" }, now), all);
  });

  it("uses the first value when a param is repeated", () => {
    assert.deepEqual(parsePeriodParams({ mes: ["2", "5"], anio: ["2025"] }, now), {
      kind: "month",
      year: 2025,
      month: 2,
    });
  });
});

describe("periodLabel", () => {
  it("names all time, a year and a month", () => {
    assert.equal(periodLabel({ kind: "all" }), "Todos los periodos");
    assert.equal(periodLabel({ kind: "year", year: 2026 }), "2026");
    assert.equal(periodLabel({ kind: "month", year: 2026, month: 10 }), "Octubre de 2026");
  });
});

describe("trendGranularity", () => {
  it("is daily only for a single month", () => {
    assert.equal(trendGranularity({ kind: "month", year: 2026, month: 3 }), "day");
    assert.equal(trendGranularity({ kind: "year", year: 2026 }), "month");
    assert.equal(trendGranularity({ kind: "all" }), "month");
  });
});

describe("bucketTrend", () => {
  const orders = [
    // 2026-11-01 03:00 UTC = 2026-10-31 22:00 Bogotá -> October
    { confirmed_at: "2026-11-01T03:00:00Z", grand_total: 100 },
    // 2026-11-01 05:00 UTC = 2026-11-01 00:00 Bogotá -> November
    { confirmed_at: "2026-11-01T05:00:00Z", grand_total: 40 },
    { confirmed_at: "2026-10-05T15:00:00Z", grand_total: 10 },
    { confirmed_at: "2026-10-05T20:00:00Z", grand_total: 5 },
  ];

  it("buckets by Bogotá month, sorted ascending", () => {
    assert.deepEqual(bucketTrend(orders, "month"), [
      { date: "2026-10", total: 115 },
      { date: "2026-11", total: 40 },
    ]);
  });

  it("buckets by Bogotá day, sorted ascending", () => {
    assert.deepEqual(bucketTrend(orders, "day"), [
      { date: "2026-10-05", total: 15 },
      { date: "2026-10-31", total: 100 },
      { date: "2026-11-01", total: 40 },
    ]);
  });

  it("returns nothing for no orders", () => {
    assert.deepEqual(bucketTrend([], "month"), []);
  });
});

describe("bogotaDay", () => {
  it("returns the Bogotá calendar day, not the UTC day", () => {
    assert.equal(bogotaDay("2026-11-01T03:00:00Z"), "2026-10-31");
  });
});

describe("resolvePeriodSelection", () => {
  const now = new Date("2026-10-13T15:00:00Z");
  const month: PeriodSelection = { kind: "month", year: 2026, month: 10 };

  it("keeps all periods as the default default, exactly like parsePeriodParams", () => {
    for (const raw of [{}, { anio: "abc" }, { mes: "3" }, { anio: "2026" }, { anio: "2026", mes: "3" }, { anio: "2026", mes: "11" }]) {
      assert.deepEqual(resolvePeriodSelection(raw, now), parsePeriodParams(raw, now));
    }
  });

  it("uses the page default on a bare URL", () => {
    assert.deepEqual(resolvePeriodSelection({}, now, month), month);
  });

  it("falls back to the page default, not to all, on malformed or impossible values", () => {
    for (const raw of [{ anio: "abc" }, { mes: "3" }, { anio: "2026", mes: "13" }, { anio: "2026", mes: "11" }, { anio: "1999" }]) {
      assert.deepEqual(resolvePeriodSelection(raw, now, month), month);
    }
  });

  it("reaches all periods explicitly with ?periodo=todos", () => {
    assert.deepEqual(resolvePeriodSelection({ periodo: "todos" }, now, month), { kind: "all" });
    assert.deepEqual(resolvePeriodSelection({ periodo: ["todos"] }, now, month), { kind: "all" });
  });

  it("still honours valid year and month values", () => {
    assert.deepEqual(resolvePeriodSelection({ anio: "2025" }, now, month), { kind: "year", year: 2025 });
    assert.deepEqual(resolvePeriodSelection({ anio: "2026", mes: "3" }, now, month), {
      kind: "month",
      year: 2026,
      month: 3,
    });
  });
});

describe("periodQuery", () => {
  const month: PeriodSelection = { kind: "month", year: 2026, month: 10 };

  it("with the default default (all) matches the legacy URLs", () => {
    assert.equal(periodQuery({ kind: "all" }), "");
    assert.equal(periodQuery({ kind: "year", year: 2026 }), "?anio=2026");
    assert.equal(periodQuery({ kind: "month", year: 2026, month: 3 }), "?mes=3&anio=2026");
  });

  it("is the bare URL for the page default and explicit for everything else", () => {
    assert.equal(periodQuery(month, month), "");
    assert.equal(periodQuery({ kind: "all" }, month), "?periodo=todos");
    assert.equal(periodQuery({ kind: "year", year: 2026 }, month), "?anio=2026");
  });

  it("round-trips through resolvePeriodSelection", () => {
    const now = new Date("2026-10-13T15:00:00Z");
    const selections: PeriodSelection[] = [
      { kind: "all" },
      { kind: "year", year: 2025 },
      { kind: "month", year: 2026, month: 3 },
      month,
    ];
    for (const s of selections) {
      const params: Record<string, string> = Object.fromEntries(new URLSearchParams(periodQuery(s, month)));
      assert.deepEqual(resolvePeriodSelection(params, now, month), s);
    }
  });
});

describe("samePeriod", () => {
  it("compares selections by value", () => {
    assert.equal(samePeriod({ kind: "all" }, { kind: "all" }), true);
    assert.equal(samePeriod({ kind: "year", year: 2026 }, { kind: "year", year: 2026 }), true);
    assert.equal(samePeriod({ kind: "year", year: 2026 }, { kind: "month", year: 2026, month: 1 }), false);
    assert.equal(
      samePeriod({ kind: "month", year: 2026, month: 1 }, { kind: "month", year: 2026, month: 2 }),
      false,
    );
  });
});
