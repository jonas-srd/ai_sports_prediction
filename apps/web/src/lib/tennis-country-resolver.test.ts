import assert from "node:assert/strict";
import test from "node:test";
import {
  getTennisPlayerLookupCandidates,
  parseOfficialItfPlayerProfile
} from "./tennis-country-resolver";

test("puts the likely player surname first when a tournament prefix is present", () => {
  assert.deepEqual(
    getTennisPlayerLookupCandidates("Internazionali BNL dItalia Altmaier"),
    [
      "dItalia Altmaier",
      "BNL dItalia Altmaier",
      "Altmaier",
      "Internazionali BNL dItalia Altmaier"
    ]
  );
});

test("keeps a clean multi-part player name as the primary lookup", () => {
  assert.deepEqual(
    getTennisPlayerLookupCandidates("Merida Aguilar"),
    ["Merida Aguilar"]
  );
});

test("normalizes apostrophe spacing without losing the lookup variants", () => {
  assert.deepEqual(
    getTennisPlayerLookupCandidates("O Connell"),
    ["O'Connell"]
  );
});

test("accepts only a matching official ITF profile and reads its country code", () => {
  assert.deepEqual(
    parseOfficialItfPlayerProfile({
      link: "https://www.itftennis.com/en/players/dan-added/800358608/fra/mt/s/overview/",
      title: "Dan Added Tennis Player Profile | ITF"
    }, "Added"),
    {
      canonicalName: "Dan Added",
      countryCode: "fr"
    }
  );
  assert.equal(
    parseOfficialItfPlayerProfile({
      link: "https://example.com/en/players/dan-added/800358608/fra/mt/s/overview/",
      title: "Dan Added Tennis Player Profile | ITF"
    }, "Added"),
    null
  );
});
