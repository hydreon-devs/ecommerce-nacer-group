import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMonthGrid,
  formatMonthLabel,
  moveFocus,
  monthRange,
} from "./calendarGrid.ts";
import { buildDeliveryCalendar } from "./deliveryCalendar.ts";

// Today Wed 2026-10-21, Mon-Sat open, Mon 2026-10-12 and 2026-11-02 holidays (kept out).
const TODAY = "2026-10-21";
const HOLIDAYS = ["2026-11-02", "2026-11-16"];
const DATES = buildDeliveryCalendar({
  today: TODAY,
  businessWeekdays: [1, 2, 3, 4, 5, 6],
  holidays: HOLIDAYS,
  horizonDays: 60,
});

function cell(grid: ReturnType<typeof buildMonthGrid>, date: string) {
  const found = grid.flat().find((c) => c.date === date);
  assert.ok(found, `cell ${date}`);
  return found;
}

describe("buildMonthGrid", () => {
  it("is Monday-first with 7 cells per week", () => {
    const grid = buildMonthGrid(2026, 10, DATES, TODAY, HOLIDAYS);
    assert.ok(grid.every((w) => w.length === 7));
    assert.equal(grid[0][0].date, "2026-09-28"); // Oct 1 2026 is a Thursday
    assert.equal(grid[0][3].date, "2026-10-01");
    assert.equal(grid.at(-1)![6].date, "2026-11-01");
  });

  it("handles a month that starts on Monday (5 weeks, no leading days)", () => {
    const grid = buildMonthGrid(2026, 6, [], TODAY, []);
    assert.equal(grid[0][0].date, "2026-06-01");
    assert.equal(grid[0][0].inMonth, true);
    assert.equal(grid.length, 5);
  });

  it("handles a month that starts on Sunday (6 weeks, 6 leading days)", () => {
    const grid = buildMonthGrid(2026, 11, DATES, TODAY, HOLIDAYS);
    assert.equal(grid[0][0].date, "2026-10-26");
    assert.equal(grid[0][0].inMonth, false);
    assert.equal(grid[0][6].date, "2026-11-01");
    assert.equal(grid[0][6].inMonth, true);
    assert.equal(grid.length, 6);
  });

  it("includes Feb 29 in a leap year and not in a common one", () => {
    const leap = buildMonthGrid(2028, 2, [], "2028-01-01", []);
    assert.ok(leap.flat().some((c) => c.date === "2028-02-29" && c.inMonth));
    const common = buildMonthGrid(2027, 2, [], "2027-01-01", []);
    assert.ok(!common.flat().some((c) => c.date === "2027-02-29"));
    assert.equal(common.flat().filter((c) => c.inMonth).length, 28);
  });

  it("rolls over the year in December and January", () => {
    const dec = buildMonthGrid(2026, 12, [], "2026-01-01", []);
    assert.equal(dec.at(-1)![6].date, "2027-01-03");
    assert.equal(dec.at(-1)![6].inMonth, false);
    const jan = buildMonthGrid(2027, 1, [], "2026-01-01", []);
    assert.equal(jan[0][0].date, "2026-12-28");
  });

  it("marks only the calendar dates as selectable", () => {
    const grid = buildMonthGrid(2026, 10, DATES, TODAY, HOLIDAYS);
    assert.equal(cell(grid, "2026-10-22").selectable, true);
    assert.equal(cell(grid, "2026-10-21").selectable, false); // today
    assert.equal(cell(grid, "2026-10-25").selectable, false); // Sunday
  });

  it("flags today without making it selectable", () => {
    const grid = buildMonthGrid(2026, 10, DATES, TODAY, HOLIDAYS);
    assert.equal(cell(grid, "2026-10-21").isToday, true);
    assert.equal(cell(grid, "2026-10-22").isToday, false);
  });

  it("explains why a day is not selectable", () => {
    const grid = buildMonthGrid(2026, 11, DATES, TODAY, HOLIDAYS);
    assert.equal(cell(grid, "2026-11-01").reason, "sunday");
    assert.equal(cell(grid, "2026-11-02").reason, "holiday");
    assert.equal(cell(grid, "2026-11-03").reason, undefined);
    const oct = buildMonthGrid(2026, 10, DATES, TODAY, HOLIDAYS);
    assert.equal(cell(oct, "2026-10-20").reason, "past");
    assert.equal(cell(oct, "2026-10-21").reason, "past");
    const dec = buildMonthGrid(2026, 12, DATES, TODAY, HOLIDAYS);
    assert.equal(cell(dec, "2026-12-29").reason, "outside"); // beyond the 60-day horizon
  });

  it("calls a non-selectable open-looking weekday closed", () => {
    // Only Tue-Fri open: a Saturday has no reason of the above kinds.
    const dates = buildDeliveryCalendar({ today: TODAY, businessWeekdays: [2, 3, 4, 5], holidays: [], horizonDays: 30 });
    const grid = buildMonthGrid(2026, 10, dates, TODAY, []);
    assert.equal(cell(grid, "2026-10-24").reason, "closed");
  });
});

describe("monthRange", () => {
  it("spans the first and last month with selectable dates", () => {
    assert.deepEqual(monthRange(DATES), {
      first: { year: 2026, month: 10 },
      last: { year: 2026, month: 12 },
    });
  });

  it("works within one month and across a year boundary", () => {
    assert.deepEqual(monthRange(["2026-10-22"]), {
      first: { year: 2026, month: 10 },
      last: { year: 2026, month: 10 },
    });
    assert.deepEqual(monthRange(["2026-12-30", "2027-01-04"]), {
      first: { year: 2026, month: 12 },
      last: { year: 2027, month: 1 },
    });
  });

  it("is null for an empty calendar", () => {
    assert.equal(monthRange([]), null);
  });
});

describe("moveFocus", () => {
  it("ArrowRight / ArrowLeft move to the next / previous selectable day", () => {
    assert.equal(moveFocus("2026-10-22", "ArrowRight", DATES), "2026-10-23");
    assert.equal(moveFocus("2026-10-24", "ArrowRight", DATES), "2026-10-26"); // skips Sunday
    assert.equal(moveFocus("2026-10-26", "ArrowLeft", DATES), "2026-10-24");
  });

  it("ArrowDown / ArrowUp move by a week, snapping to the nearest selectable day", () => {
    assert.equal(moveFocus("2026-10-22", "ArrowDown", DATES), "2026-10-29");
    assert.equal(moveFocus("2026-10-29", "ArrowUp", DATES), "2026-10-22");
    // Nov 2 is a holiday: down from Oct 26 lands on the next selectable (Nov 3).
    assert.equal(moveFocus("2026-10-26", "ArrowDown", DATES), "2026-11-03");
  });

  it("never leaves the range", () => {
    const last = DATES.at(-1)!;
    assert.equal(moveFocus(last, "ArrowRight", DATES), last);
    assert.equal(moveFocus(last, "ArrowDown", DATES), last);
    assert.equal(moveFocus(DATES[0], "ArrowLeft", DATES), DATES[0]);
    assert.equal(moveFocus(DATES[0], "ArrowUp", DATES), DATES[0]);
  });

  it("Home / End go to the first / last selectable day of the Monday-first week", () => {
    // Week Mon 2026-10-26 .. Sun 11-01; Sunday is closed.
    assert.equal(moveFocus("2026-10-28", "Home", DATES), "2026-10-26");
    assert.equal(moveFocus("2026-10-28", "End", DATES), "2026-10-31");
    // First week: Mon 10-19 .. 10-25, today and earlier are not selectable.
    assert.equal(moveFocus("2026-10-23", "Home", DATES), "2026-10-22");
  });

  it("PageDown / PageUp change month keeping the day, snapping to a selectable one", () => {
    assert.equal(moveFocus("2026-10-22", "PageDown", DATES), "2026-11-23");
    assert.equal(moveFocus("2026-11-23", "PageUp", DATES), "2026-10-23");
  });

  it("PageUp / PageDown stay put when the adjacent month has nothing selectable", () => {
    assert.equal(moveFocus("2026-10-22", "PageUp", DATES), "2026-10-22");
    const last = DATES.at(-1)!;
    assert.equal(moveFocus(last, "PageDown", DATES), last);
  });

  it("clamps the day when the target month is shorter", () => {
    const dates = ["2027-01-29", "2027-01-30", "2027-02-26", "2027-02-27"];
    assert.equal(moveFocus("2027-01-30", "PageDown", dates), "2027-02-27");
  });

  it("returns null for keys it does not handle and stays put on an empty calendar", () => {
    assert.equal(moveFocus("2026-10-22", "a", DATES), null);
    assert.equal(moveFocus("2026-10-22", "ArrowRight", []), "2026-10-22");
  });
});

describe("formatMonthLabel", () => {
  it("names the month and year in Spanish", () => {
    assert.equal(formatMonthLabel(2026, 10), "Octubre de 2026");
    assert.equal(formatMonthLabel(2027, 1), "Enero de 2027");
  });
});
