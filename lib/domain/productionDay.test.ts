import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bogotaToday, formatLongDay, isValidDay, parseDayParam, shiftDay } from "./productionDay.ts";

// 2026-10-14T02:00Z = 2026-10-13 21:00 en Bogotá (UTC-5).
const NOW = new Date("2026-10-14T02:00:00.000Z");

describe("bogotaToday", () => {
  it("usa el día de Bogotá, no el UTC", () => {
    assert.equal(bogotaToday(NOW), "2026-10-13");
  });
  it("pasa al día siguiente a las 00:00 de Bogotá", () => {
    assert.equal(bogotaToday(new Date("2026-10-14T05:00:00.000Z")), "2026-10-14");
    assert.equal(bogotaToday(new Date("2026-10-14T04:59:59.999Z")), "2026-10-13");
  });
});

describe("parseDayParam", () => {
  it("acepta un día válido", () => {
    assert.equal(parseDayParam("2026-11-02", NOW), "2026-11-02");
  });
  it("sin valor equivale a hoy", () => {
    assert.equal(parseDayParam(undefined, NOW), "2026-10-13");
    assert.equal(parseDayParam("", NOW), "2026-10-13");
  });
  it("formato inválido equivale a hoy", () => {
    assert.equal(parseDayParam("13/10/2026", NOW), "2026-10-13");
    assert.equal(parseDayParam("2026-1-5", NOW), "2026-10-13");
    assert.equal(parseDayParam("hola", NOW), "2026-10-13");
  });
  it("un día imposible equivale a hoy", () => {
    assert.equal(parseDayParam("2026-02-31", NOW), "2026-10-13");
    assert.equal(parseDayParam("2026-13-01", NOW), "2026-10-13");
    assert.equal(parseDayParam("2026-00-10", NOW), "2026-10-13");
  });
  it("acepta el 29 de febrero solo en bisiesto", () => {
    assert.equal(parseDayParam("2028-02-29", NOW), "2028-02-29");
    assert.equal(parseDayParam("2026-02-29", NOW), "2026-10-13");
  });
  it("toma el primer valor si llega repetido", () => {
    assert.equal(parseDayParam(["2026-11-02", "2026-11-03"], NOW), "2026-11-02");
  });
});

describe("shiftDay", () => {
  it("avanza y retrocede un día", () => {
    assert.equal(shiftDay("2026-10-13", 1), "2026-10-14");
    assert.equal(shiftDay("2026-10-13", -1), "2026-10-12");
  });
  it("cruza fin de mes, de año y bisiesto", () => {
    assert.equal(shiftDay("2026-10-31", 1), "2026-11-01");
    assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
    assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
    assert.equal(shiftDay("2028-02-28", 1), "2028-02-29");
    assert.equal(shiftDay("2026-02-28", 1), "2026-03-01");
  });
});

describe("formatLongDay", () => {
  it("escribe el día en español largo", () => {
    assert.equal(formatLongDay("2026-10-13"), "martes, 13 de octubre de 2026");
    assert.equal(formatLongDay("2026-01-01"), "jueves, 1 de enero de 2026");
  });
});

describe("isValidDay", () => {
  it("acepta solo días reales con formato YYYY-MM-DD", () => {
    assert.equal(isValidDay("2026-10-13"), true);
    assert.equal(isValidDay("2028-02-29"), true);
    assert.equal(isValidDay("2026-02-31"), false);
    assert.equal(isValidDay("12026-10-13"), false);
    assert.equal(isValidDay(""), false);
  });
});
