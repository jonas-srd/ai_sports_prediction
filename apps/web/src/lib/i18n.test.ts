import assert from "node:assert/strict";
import test from "node:test";
import { switchLocalePath } from "./i18n";
import { translateText } from "./site-translations";

const secondaryLocales = ["es", "pt", "fr", "it"] as const;

test("switching from German back to English removes the locale prefix", () => {
  assert.equal(switchLocalePath("/de", "en"), "/");
  assert.equal(switchLocalePath("/de/football/la-liga", "en"), "/football/la-liga");
});

test("German homepage claim uses natural product language", () => {
  assert.equal(translateText("Know the pick before the game starts.", "de"), "Die Prognose vor dem Anpfiff.");
});

test("all secondary languages translate global page content", () => {
  const globalCopy = [
    "AI model",
    "A sharper way to read sport before it happens",
    "Sporting stories only: teams, players, form, injuries and tournament context. The feed refreshes regularly.",
    "Frequently asked questions about our predictions",
    "Is Residual Sports intended for sports betting?",
    "Prediction one week before kickoff",
    "Win probabilities",
    "Cookie settings",
    "Subscribe"
  ];

  for (const locale of secondaryLocales) {
    for (const source of globalCopy) {
      assert.notEqual(translateText(source, locale), source, `${locale} must translate: ${source}`);
    }
  }
});

test("translation lookup also handles UI capitalization variants", () => {
  assert.equal(translateText("TOP NEWS", "es"), "NOTICIAS DESTACADAS");
  assert.equal(translateText("AI MODEL", "fr"), "MODÈLE IA");
});

test("secondary locales cover public page and legal-document headings", () => {
  const pageCopy = [
    "About the platform",
    "Four sports, one prediction layer",
    "How forecasts become a product",
    "Legal notice",
    "Widget licence terms",
    "Privacy notice",
    "Data processing agreement (DPA)",
    "1. Prices, tax, payment and invoices",
    "9. Return, deletion and precedence"
  ];

  for (const locale of secondaryLocales) {
    for (const source of pageCopy) {
      assert.notEqual(translateText(source, locale), source, `${locale} must translate: ${source}`);
    }
  }
});
