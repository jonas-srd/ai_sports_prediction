import assert from "node:assert/strict";
import test from "node:test";
import { findTennisPlayerByName, getTennisFlagUrl } from "./tennis-data";

test("finds Arthur Fery from surname-only and initialed tennis API names", () => {
  assert.equal(findTennisPlayerByName("Fery")?.name, "Arthur Fery");
  assert.equal(findTennisPlayerByName("A. Fery")?.name, "Arthur Fery");
  assert.equal(findTennisPlayerByName("Fery Arthur")?.name, "Arthur Fery");
});

test("does not match a different player just because a known surname appears as a first name", () => {
  assert.equal(findTennisPlayerByName("Paul Jubb"), undefined);
});

test("returns tennis flag urls for national players only", () => {
  assert.equal(getTennisFlagUrl("gb"), "https://flagcdn.com/w80/gb.png");
  assert.equal(getTennisFlagUrl("un"), null);
  assert.equal(getTennisFlagUrl("xx"), null);
});
