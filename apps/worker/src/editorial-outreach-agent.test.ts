import assert from "node:assert/strict";
import {
  buildDefaultSearchQueries,
  buildFallbackDraftForPublication,
  extractPublicContacts,
  isGenericRoleEmail,
  isLikelyFirstPartyEmail,
  normalizePublicationName,
  parseAiDraft,
  robotsAllows,
  scorePublisher
} from "./editorial-outreach-agent";

function testRoleAddressFilter(): void {
  assert.equal(isGenericRoleEmail("redaktion@example.de"), true);
  assert.equal(isGenericRoleEmail("sport.redaktion@example.de"), true);
  assert.equal(isGenericRoleEmail("max.mustermann@example.de"), false);
  assert.equal(isGenericRoleEmail("person@gmail.com"), false);
}

function testContactExtraction(): void {
  const html = `
    <a href="mailto:redaktion@sportblatt.de?subject=Hallo">Redaktion</a>
    <p>Dienstleister: info@presse-monitor.de</p>
    <p>Max: max.mustermann@sportblatt.de</p>
    <form><input type="email" name="email"><button>Kontakt</button></form>
  `;
  const contacts = extractPublicContacts(html, new URL("https://sportblatt.de/kontakt"));
  assert.deepEqual(
    contacts.map((contact) => `${contact.kind}:${contact.value}`).sort(),
    ["contact_form:https://sportblatt.de/kontakt", "generic_email:redaktion@sportblatt.de"]
  );
}

function testFirstPartyContactFilter(): void {
  assert.equal(
    isLikelyFirstPartyEmail("redaktion@sportbild.de", new URL("https://sportbild.bild.de/impressum")),
    true
  );
  assert.equal(
    isLikelyFirstPartyEmail("info@presse-monitor.de", new URL("https://sportbild.bild.de/impressum")),
    false
  );
}

function testPublicationNameCleanup(): void {
  assert.equal(normalizePublicationName("Kontakt - tennis MAGAZIN", "tennismagazin.de"), "tennis MAGAZIN");
  assert.equal(normalizePublicationName("Kontakt | Sonstiges | Sportbild.de", "sportbild.bild.de"), "Sportbild.de");
  assert.equal(normalizePublicationName("So erreichen Sie uns: Kontakt | sportschau.de", "sportschau.de"), "sportschau.de");
}

function testRobotsRules(): void {
  const robots = `
    User-agent: *
    Disallow: /intern
    Allow: /intern/presse
  `;
  assert.equal(robotsAllows(robots, "/sport", "AI-Sports-Prediction-OutreachBot"), true);
  assert.equal(robotsAllows(robots, "/intern/daten", "AI-Sports-Prediction-OutreachBot"), false);
  assert.equal(robotsAllows(robots, "/intern/presse", "AI-Sports-Prediction-OutreachBot"), true);

  const specific = `
    User-agent: *
    Disallow: /allgemein
    User-agent: AI-Sports-Prediction-OutreachBot
    User-agent: PartnerBot
    Disallow: /privat
  `;
  assert.equal(robotsAllows(specific, "/allgemein", "AI-Sports-Prediction-OutreachBot"), true);
  assert.equal(robotsAllows(specific, "/privat", "AI-Sports-Prediction-OutreachBot"), false);
}

function testFitScoring(): void {
  const high = scorePublisher("Sport Fußball Tennis Redaktion Magazin News Artikel Statistik Analyse Prognose");
  const low = scorePublisher("Bäckerei und Café mit Frühstück");
  assert.ok(high.score >= 70);
  assert.equal(low.score, 0);
}

function testAiDraftParsing(): void {
  const parsed = parseAiDraft('```json\n{"subject":" Kurze Demo ","textBody":"Guten Tag\\n\\nText"}\n```');
  assert.equal(parsed.subject, "Kurze Demo");
  assert.equal(parsed.textBody, "Guten Tag\n\nText");
}

function testInternationalResearchAndDrafts(): void {
  const frenchQueries = buildDefaultSearchQueries("FR", "fr");
  assert.ok(frenchQueries.some((query) => /France/u.test(query)));
  assert.ok(frenchQueries.every((query) => /rédaction|média/u.test(query)));
  const spanishDraft = buildFallbackDraftForPublication("Deporte Hoy", "es");
  assert.match(spanishDraft.subject, /Deporte Hoy/u);
  assert.match(spanishDraft.textBody, /Hola, equipo editorial/u);
}

testRoleAddressFilter();
testContactExtraction();
testFirstPartyContactFilter();
testPublicationNameCleanup();
testRobotsRules();
testFitScoring();
testAiDraftParsing();
testInternationalResearchAndDrafts();
console.log("Editorial outreach agent tests passed.");
