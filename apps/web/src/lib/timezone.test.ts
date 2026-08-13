import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeTimeZone,
  formatTimeZoneLabel,
  getTimeZoneOptions
} from "./timezone";

test("timezone menu contains one entry per commonly named zone", () => {
  const options = getTimeZoneOptions("de-DE");
  assert.equal(options.filter((option) => option.label === "CET / CEST").length, 1);
  assert.equal(options.some((option) => option.label.includes("Berlin")), false);
  assert.equal(options.some((option) => option.label.includes("Paris")), false);
  assert.equal(options.some((option) => option.label.includes("Madrid")), false);
  assert.equal(options.some((option) => option.label.includes("Rome")), false);
});

test("equivalent European city zones use the single CET option", () => {
  for (const value of ["Europe/Berlin", "Europe/Paris", "Europe/Madrid", "Europe/Rome"]) {
    assert.equal(canonicalizeTimeZone(value), "Europe/Berlin");
    assert.equal(formatTimeZoneLabel(value, "en-GB"), "CET / CEST");
  }
});
