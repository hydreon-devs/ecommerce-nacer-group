import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bogotaDate, buildDeliveryCalendar, formatDeliveryDate } from "./deliveryCalendar.ts";

const MON_TO_SAT = [1, 2, 3, 4, 5, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

describe("bogotaDate", () => {
  it("uses the Bogotá calendar date, not the server's UTC date", () => {
    // 03:00 UTC on the 22nd is 22:00 on the 21st in Bogotá (UTC-5).
    assert.equal(bogotaDate(new Date("2026-10-22T03:00:00Z")), "2026-10-21");
  });

  it("flips to the next day exactly at 05:00 UTC", () => {
    assert.equal(bogotaDate(new Date("2026-10-21T04:59:59Z")), "2026-10-20");
    assert.equal(bogotaDate(new Date("2026-10-21T05:00:00Z")), "2026-10-21");
  });
});

describe("buildDeliveryCalendar", () => {
  it("starts tomorrow, never today", () => {
    const days = buildDeliveryCalendar({
      today: "2026-10-21",
      businessWeekdays: ALL_DAYS,
      holidays: [],
      horizonDays: 60,
    });
    assert.equal(days[0], "2026-10-22");
    assert.ok(!days.includes("2026-10-21"));
  });

  it("starts tomorrow in Bogotá across the UTC midnight boundary", () => {
    // Server clock already says the 22nd (UTC), Bogotá is still the 21st.
    const today = bogotaDate(new Date("2026-10-22T03:00:00Z"));
    const days = buildDeliveryCalendar({
      today,
      businessWeekdays: ALL_DAYS,
      holidays: [],
      horizonDays: 60,
    });
    assert.equal(days[0], "2026-10-22");
  });

  it("covers exactly the horizon when every day is open", () => {
    const days = buildDeliveryCalendar({
      today: "2026-10-21",
      businessWeekdays: ALL_DAYS,
      holidays: [],
      horizonDays: 60,
    });
    assert.equal(days.length, 60);
    assert.equal(days[59], "2026-12-20");
  });

  it("skips Sundays when the workshop has no Sunday row", () => {
    const days = buildDeliveryCalendar({
      today: "2026-10-21",
      businessWeekdays: MON_TO_SAT,
      holidays: [],
      horizonDays: 60,
    });
    assert.ok(!days.includes("2026-10-25")); // a Sunday
    assert.ok(days.includes("2026-10-24")); // Saturday
    assert.ok(days.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0));
  });

  it("skips holidays", () => {
    const days = buildDeliveryCalendar({
      today: "2026-10-09",
      businessWeekdays: MON_TO_SAT,
      holidays: ["2026-10-12"],
      horizonDays: 60,
    });
    assert.ok(!days.includes("2026-10-12"));
    assert.ok(days.includes("2026-10-13"));
  });

  it("skips closed weekdays other than Sunday", () => {
    const days = buildDeliveryCalendar({
      today: "2026-10-21",
      businessWeekdays: [2, 3, 4, 5], // Tue-Fri
      holidays: [],
      horizonDays: 14,
    });
    assert.ok(days.length > 0);
    assert.ok(
      days.every((d) => [2, 3, 4, 5].includes(new Date(`${d}T00:00:00Z`).getUTCDay())),
    );
  });

  it("returns an empty calendar when there are no business hours", () => {
    assert.deepEqual(
      buildDeliveryCalendar({
        today: "2026-10-21",
        businessWeekdays: [],
        holidays: [],
        horizonDays: 60,
      }),
      [],
    );
  });

  it("crosses month and year boundaries correctly", () => {
    const days = buildDeliveryCalendar({
      today: "2026-12-30",
      businessWeekdays: ALL_DAYS,
      holidays: [],
      horizonDays: 3,
    });
    assert.deepEqual(days, ["2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("returns an empty calendar for a malformed today instead of throwing", () => {
    assert.deepEqual(
      buildDeliveryCalendar({
        today: "not-a-date",
        businessWeekdays: ALL_DAYS,
        holidays: [],
        horizonDays: 60,
      }),
      [],
    );
  });
});

describe("formatDeliveryDate", () => {
  it("spells the calendar date in Spanish without shifting it by time zone", () => {
    assert.equal(formatDeliveryDate("2026-10-23"), "viernes 23 de octubre");
    assert.equal(formatDeliveryDate("2027-01-01"), "viernes 1 de enero");
  });

  it("returns the input untouched when it is not a date", () => {
    assert.equal(formatDeliveryDate("mañana"), "mañana");
  });
});
