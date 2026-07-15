import assert from "node:assert/strict";
import test from "node:test";
import { isSportsNewsItemRelevant, type SportsNewsItem } from "./sports-news";

const now = new Date("2026-07-15T12:00:00.000Z").getTime();

function item(title: string, publishedAt = "2026-07-14T12:00:00.000Z"): SportsNewsItem {
  return {
    imageUrl: null,
    publishedAt,
    source: "Example Sports",
    sourceUrl: null,
    summary: title,
    title,
    url: "https://example.com/story"
  };
}

test("keeps an NBA story in the NBA feed", () => {
  assert.equal(isSportsNewsItemRelevant(item("NBA trade analysis and team news"), "nba", now), true);
});

test("rejects football stories from the NBA feed", () => {
  assert.equal(isSportsNewsItemRelevant(item("Spain beat Belgium in European football qualifier"), "nba", now), false);
});

test("rejects stale stories even when the sport matches", () => {
  assert.equal(isSportsNewsItemRelevant(item("NFL quarterback injury update", "2026-05-01T12:00:00.000Z"), "nfl", now), false);
});
