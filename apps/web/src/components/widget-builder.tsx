"use client";

import { useMemo, useState } from "react";

type WidgetType = "prediction-card" | "match-list" | "leaderboard" | "win-probability" | "key-factors";
type WidgetSport = "all" | "football" | "nba" | "nfl" | "tennis";

type BuilderMatch = {
  id: string;
  sport: Exclude<WidgetSport, "all">;
  competition: string;
  date: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  label: string;
};

type MatchSearchResponse = {
  matches: BuilderMatch[];
};

const widgetTypes: Array<{ label: string; value: WidgetType }> = [
  { label: "Prediction card", value: "prediction-card" },
  { label: "Match list", value: "match-list" },
  { label: "Win probability", value: "win-probability" },
  { label: "Key factors", value: "key-factors" },
  { label: "Leaderboard", value: "leaderboard" }
];

const sports: Array<{ label: string; value: WidgetSport }> = [
  { label: "All sports", value: "all" },
  { label: "Football", value: "football" },
  { label: "NBA", value: "nba" },
  { label: "NFL", value: "nfl" },
  { label: "Tennis", value: "tennis" }
];

export function WidgetBuilder() {
  const [apiKey, setApiKey] = useState("");
  const [publisherDomain, setPublisherDomain] = useState("https://publisher.example");
  const [sport, setSport] = useState<WidgetSport>("nba");
  const [type, setType] = useState<WidgetType>("prediction-card");
  const [query, setQuery] = useState("");
  const [accent, setAccent] = useState("#7df5c1");
  const [background, setBackground] = useState("#101f2e");
  const [text, setText] = useState("#f7fbff");
  const [showReasoning, setShowReasoning] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [matches, setMatches] = useState<BuilderMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [status, setStatus] = useState("Enter a paid publisher key and search for a match.");
  const [copyStatus, setCopyStatus] = useState("Copy");
  const [isLoading, setIsLoading] = useState(false);

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? null;
  const embedCode = useMemo(() => buildEmbedCode({
    accent,
    apiKey,
    background,
    match: selectedMatch,
    showBranding,
    showReasoning,
    sport,
    text,
    type
  }), [accent, apiKey, background, selectedMatch, showBranding, showReasoning, sport, text, type]);

  async function searchMatches() {
    if (!apiKey.trim()) {
      setStatus("A paid publisher key is required before match search.");
      setMatches([]);
      setSelectedMatchId("");
      return;
    }

    setIsLoading(true);
    setStatus("Searching matches...");

    const params = new URLSearchParams({
      apiKey: apiKey.trim(),
      q: query.trim(),
      sourceOrigin: publisherDomain.trim(),
      sport,
      type
    });

    try {
      const response = await fetch(`/api/widgets/matches?${params.toString()}`, {
        headers: { accept: "application/json" }
      });
      const body = await response.json() as Partial<MatchSearchResponse> & { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Match search is not available for this key.");
      }

      const nextMatches = body.matches ?? [];
      setMatches(nextMatches);
      setSelectedMatchId(nextMatches[0]?.id ?? "");
      setStatus(nextMatches.length ? `${nextMatches.length} matches found.` : "No matching games found.");
    } catch (error) {
      setMatches([]);
      setSelectedMatchId("");
      setStatus(error instanceof Error ? error.message : "Match search failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyEmbedCode() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(embedCode);
      } else {
        copyWithTextareaFallback(embedCode);
      }
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus("Copy"), 1800);
    } catch (_error) {
      try {
        copyWithTextareaFallback(embedCode);
        setCopyStatus("Copied");
        window.setTimeout(() => setCopyStatus("Copy"), 1800);
      } catch (_fallbackError) {
        setCopyStatus("Copy failed");
        window.setTimeout(() => setCopyStatus("Copy"), 2200);
      }
    }
  }

  return (
    <section className="widgetsPanel widgetBuilder" aria-labelledby="widget-builder-title">
      <div className="widgetsSectionIntro">
        <h2 id="widget-builder-title">Widget builder</h2>
        <p>
          Search a match with a paid publisher key, select the widget format and copy the finished embed code.
        </p>
      </div>

      <div className="widgetBuilderGrid">
        <label className="widgetBuilderField">
          <span>Publisher API key</span>
          <input
            autoComplete="off"
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="YOUR_PUBLISHER_KEY"
            type="password"
            value={apiKey}
          />
        </label>

        <label className="widgetBuilderField">
          <span>Publisher domain</span>
          <input
            onChange={(event) => setPublisherDomain(event.target.value)}
            placeholder="https://publisher.example"
            value={publisherDomain}
          />
        </label>

        <label className="widgetBuilderField">
          <span>Sport</span>
          <select onChange={(event) => setSport(event.target.value as WidgetSport)} value={sport}>
            {sports.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField">
          <span>Widget type</span>
          <select onChange={(event) => setType(event.target.value as WidgetType)} value={type}>
            {widgetTypes.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField widgetBuilderFieldWide">
          <span>Search team, player, competition or match id</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Boston Celtics, Wimbledon, Champions League..."
            value={query}
          />
        </label>

        <div className="widgetBuilderActions">
          <button disabled={isLoading} onClick={searchMatches} type="button">
            {isLoading ? "Searching..." : "Search matches"}
          </button>
          <p>{status}</p>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="widgetBuilderMatches" aria-label="Match results">
          {matches.map((match) => (
            <button
              className={match.id === selectedMatchId ? "isSelected" : ""}
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
              type="button"
            >
              <span>{match.competition}</span>
              <strong>{match.label}</strong>
              <small>{formatDate(match.date)} · {match.id}</small>
            </button>
          ))}
        </div>
      ) : null}

      <div className="widgetBuilderCustomize">
        <ColorField label="Accent" onChange={setAccent} value={accent} />
        <ColorField label="Background" onChange={setBackground} value={background} />
        <ColorField label="Text" onChange={setText} value={text} />
        <label>
          <input checked={showReasoning} onChange={(event) => setShowReasoning(event.target.checked)} type="checkbox" />
          <span>Reasoning</span>
        </label>
        <label>
          <input checked={showBranding} onChange={(event) => setShowBranding(event.target.checked)} type="checkbox" />
          <span>Branding</span>
        </label>
      </div>

      <div className="widgetBuilderCode">
        <div className="widgetBuilderCodeHeader">
          <div>
            <h3>Embed code</h3>
            <p>{selectedMatch ? `${selectedMatch.label} selected.` : "Select a match to include an exact match id."}</p>
          </div>
        </div>
        <div className="widgetBuilderCodeBox">
          <button
            aria-label={copyStatus === "Copied" ? "Embed code copied" : "Copy embed code"}
            onClick={copyEmbedCode}
            title={copyStatus === "Copied" ? "Copied" : "Copy"}
            type="button"
          >
            <span aria-hidden="true">{copyStatus === "Copied" ? "✓" : "⧉"}</span>
          </button>
          <pre><code>{embedCode}</code></pre>
        </div>
      </div>
    </section>
  );
}

function ColorField({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="widgetBuilderColorField">
      <span>{label}</span>
      <span className="widgetBuilderColorControl">
        <input aria-label={`${label} color`} onChange={(event) => onChange(event.target.value)} type="color" value={toColorInputValue(value)} />
        <input
          aria-label={`${label} hex code`}
          inputMode="text"
          onChange={(event) => onChange(normalizeHexInput(event.target.value))}
          spellCheck={false}
          value={value}
        />
      </span>
    </label>
  );
}

function buildEmbedCode({
  accent,
  apiKey,
  background,
  match,
  showBranding,
  showReasoning,
  sport,
  text,
  type
}: {
  accent: string;
  apiKey: string;
  background: string;
  match: BuilderMatch | null;
  showBranding: boolean;
  showReasoning: boolean;
  sport: WidgetSport;
  text: string;
  type: WidgetType;
}): string {
  const lines = [
    "<div",
    "  data-ai-sports-widget",
    `  data-type="${type}"`,
    `  data-sport="${match?.sport ?? sport}"`,
    match ? `  data-match-id="${escapeAttribute(match.id)}"` : "",
    `  data-api-key="${escapeAttribute(apiKey.trim() || "YOUR_PUBLISHER_KEY")}"`,
    `  data-accent="${accent}"`,
    `  data-background="${background}"`,
    `  data-text="${text}"`,
    `  data-show-reasoning="${showReasoning ? "1" : "0"}"`,
    `  data-show-branding="${showBranding ? "1" : "0"}"`,
    "></div>",
    '<script async src="https://www.ai-sports-prediction.net/widgets.js"></script>'
  ].filter(Boolean);

  return lines.join("\n");
}

function formatDate(value: string | null): string {
  if (!value) return "Date tbd";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch (_error) {
    return "Date tbd";
  }
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function normalizeHexInput(value: string): string {
  const clean = value.trim().replace(/[^0-9a-f#]/gi, "");
  if (!clean) return "#";
  const withHash = clean.startsWith("#") ? clean : `#${clean}`;
  return withHash.slice(0, 7);
}

function toColorInputValue(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#7df5c1";
}

function copyWithTextareaFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed");
  }
}
