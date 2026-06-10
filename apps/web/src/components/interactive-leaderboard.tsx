"use client";

/**
 * Purpose: Clickable leaderboard that opens the selected model drilldown below it.
 * Model details appear inline after a model row is selected.
 */
import { useState } from "react";
import Link from "next/link";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { ModelInspector } from "@/components/model-inspector";

type LeaderboardEntry = {
  model: string;
  provider: string;
  points: number;
  exact: number;
  key?: string;
};

type InteractiveLeaderboardProps = {
  leaderboard: LeaderboardEntry[];
  matches: DashboardMatch[];
};

export function InteractiveLeaderboard({ leaderboard, matches }: InteractiveLeaderboardProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <section className="contentStack">
      <div className="panel leaderboardPanel">
        <div className="panelHeader">
          <div>
            <p className="sectionKicker">Model ranking</p>
            <h2>Leaderboard</h2>
          </div>
          <Link href="/matches">View matches</Link>
        </div>

        {leaderboard.length === 0 ? (
          <div className="emptyState">
            <strong>No ranking yet</strong>
            <p>Run predictions first, then click a model here to inspect its details.</p>
          </div>
        ) : (
          <div className="leaderboard">
            {leaderboard.map((entry, index) => (
              <div className="leaderboardItem" key={entry.key ?? entry.model}>
                <button
                  className={`rankRow leaderboardButton${selectedKey === getEntryKey(entry) ? " isSelected" : ""}`}
                  type="button"
                  onClick={() => setSelectedKey(selectedKey === getEntryKey(entry) ? null : getEntryKey(entry))}
                >
                  <span className="rank">#{index + 1}</span>
                  <div>
                    <strong>{entry.model}</strong>
                    <p>{entry.provider}</p>
                  </div>
                  <span className="points">{entry.points} pts</span>
                </button>

                {selectedKey === getEntryKey(entry) ? (
                  <ModelInspector
                    inline
                    matches={matches}
                    selectedKey={entry.key}
                    selectedModel={entry.model}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function getEntryKey(entry: LeaderboardEntry): string {
  return entry.key ?? entry.model;
}
