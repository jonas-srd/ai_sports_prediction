import assert from "node:assert/strict";
import test from "node:test";
import { findTennisPlayerByName, getTennisFlagUrl, resolveTennisPlayerCountryCode, resolveTennisPlayerFlagUrl } from "./tennis-data";

test("finds Arthur Fery from surname-only and initialed tennis API names", () => {
  assert.equal(findTennisPlayerByName("Fery")?.name, "Arthur Fery");
  assert.equal(findTennisPlayerByName("A. Fery")?.name, "Arthur Fery");
  assert.equal(findTennisPlayerByName("Fery Arthur")?.name, "Arthur Fery");
});

test("does not match a different player just because a known surname appears as a first name", () => {
  assert.equal(findTennisPlayerByName("Paul Jubb"), undefined);
});

test("returns tennis flag urls for national players only", () => {
  assert.equal(getTennisFlagUrl("gb"), "/sports-logos/flags/gb.webp");
  assert.equal(getTennisFlagUrl("un"), null);
  assert.equal(getTennisFlagUrl("xx"), null);
  assert.equal(getTennisFlagUrl("invalid"), null);
});

test("resolves live API tennis names through one shared flag fallback", () => {
  assert.equal(resolveTennisPlayerCountryCode("Pellegrino"), "it");
  assert.equal(resolveTennisPlayerCountryCode("Yannick Hanfmann"), "de");
  assert.equal(resolveTennisPlayerFlagUrl("Andrey Rublev"), "/sports-logos/flags/ru.webp");
  assert.equal(resolveTennisPlayerFlagUrl("Pellegrino"), "/sports-logos/flags/it.webp");
  assert.equal(resolveTennisPlayerFlagUrl("Hanfmann"), "/sports-logos/flags/de.webp");
  assert.equal(resolveTennisPlayerFlagUrl("New Player", "https://flagcdn.com/w80/fr.png"), "/sports-logos/flags/fr.webp");
});
