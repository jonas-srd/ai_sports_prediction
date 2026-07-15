import assert from "node:assert/strict";
import test from "node:test";
import { isFinishedMatchStatus, isUpcomingPredictionMatch, isUnavailableMatchStatus } from "./home-content-quality";

const now = new Date("2026-07-15T12:00:00.000Z").getTime();

test("accepts a scheduled future fixture", () => {
  assert.equal(isUpcomingPredictionMatch({ date: "2026-07-16T12:00:00.000Z", status: "Scheduled" }, now), true);
});

test("rejects a past fixture even when its provider status is missing", () => {
  assert.equal(isUpcomingPredictionMatch({ date: "2026-05-14T12:00:00.000Z", status: null }, now), false);
});

test("rejects fixtures with missing or invalid dates", () => {
  assert.equal(isUpcomingPredictionMatch({ date: null, status: "Scheduled" }, now), false);
  assert.equal(isUpcomingPredictionMatch({ date: "not-a-date", status: "Scheduled" }, now), false);
});

test("rejects completed and unavailable fixtures even with future dates", () => {
  assert.equal(isUpcomingPredictionMatch({ date: "2026-07-16T12:00:00.000Z", status: "AOT" }, now), false);
  assert.equal(isUpcomingPredictionMatch({ date: "2026-07-16T12:00:00.000Z", status: "Postponed" }, now), false);
});

test("normalizes common final and unavailable statuses", () => {
  assert.equal(isFinishedMatchStatus("Match Finished"), true);
  assert.equal(isFinishedMatchStatus("AET"), true);
  assert.equal(isUnavailableMatchStatus("Cancelled"), true);
});
