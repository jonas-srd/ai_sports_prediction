"use client";

import { useMemo, useState } from "react";

type WidgetType = "prediction-card" | "match-list" | "leaderboard" | "win-probability" | "key-factors";
type WidgetSport = "all" | "football" | "nba" | "nfl" | "tennis";
type WidgetBuilderLocale = "en" | "de";

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

const widgetTypes: Record<WidgetBuilderLocale, Array<{ label: string; value: WidgetType }>> = {
  en: [
    { label: "Prediction card", value: "prediction-card" },
    { label: "Match list", value: "match-list" },
    { label: "Win probability", value: "win-probability" },
    { label: "Key factors", value: "key-factors" },
    { label: "Leaderboard", value: "leaderboard" }
  ],
  de: [
    { label: "Prognosekarte", value: "prediction-card" },
    { label: "Matchliste", value: "match-list" },
    { label: "Sieg-Wahrscheinlichkeit", value: "win-probability" },
    { label: "Schlüsselfaktoren", value: "key-factors" },
    { label: "Rangliste", value: "leaderboard" }
  ]
};

const sports: Record<WidgetBuilderLocale, Array<{ label: string; value: WidgetSport }>> = {
  en: [
    { label: "All sports", value: "all" },
    { label: "Football", value: "football" },
    { label: "NBA", value: "nba" },
    { label: "NFL", value: "nfl" },
    { label: "Tennis", value: "tennis" }
  ],
  de: [
    { label: "Alle Sportarten", value: "all" },
    { label: "Fußball", value: "football" },
    { label: "NBA", value: "nba" },
    { label: "NFL", value: "nfl" },
    { label: "Tennis", value: "tennis" }
  ]
};

const builderText = {
  en: {
    initialStatus: "Enter a paid publisher key and search for a match.",
    keyRequired: "A paid publisher key is required before match search.",
    searchingStatus: "Searching matches...",
    searchUnavailable: "Match search is not available for this key.",
    matchesFound: (count: number) => `${count} matches found.`,
    noMatches: "No matching games found.",
    searchFailed: "Match search failed.",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    title: "Widget builder",
    intro: "Search a match with a paid publisher key, select the widget format and copy the finished embed code.",
    apiKey: "Publisher API key",
    domain: "Publisher domain",
    sport: "Sport",
    type: "Widget type",
    query: "Search team, player, competition or match id",
    searchButton: "Search matches",
    searchingButton: "Searching...",
    results: "Match results",
    accent: "Accent",
    background: "Background",
    text: "Text",
    reasoning: "Reasoning",
    branding: "Branding",
    embedCode: "Embed code",
    selected: "selected.",
    selectMatch: "Select a match to include an exact match id.",
    copiedLabel: "Embed code copied",
    copyLabel: "Copy embed code",
    color: "color",
    hex: "hex code",
    dateTbd: "Date tbd",
    copyCommandFailed: "Copy command failed"
  },
  de: {
    initialStatus: "Bezahlten Publisher-Schlüssel eingeben und ein Match suchen.",
    keyRequired: "Für die Matchsuche ist ein bezahlter Publisher-Schlüssel erforderlich.",
    searchingStatus: "Matches werden gesucht...",
    searchUnavailable: "Die Matchsuche ist für diesen Schlüssel nicht verfügbar.",
    matchesFound: (count: number) => `${count} Matches gefunden.`,
    noMatches: "Keine passenden Spiele gefunden.",
    searchFailed: "Matchsuche fehlgeschlagen.",
    copy: "Kopieren",
    copied: "Kopiert",
    copyFailed: "Kopieren fehlgeschlagen",
    title: "Widget-Builder",
    intro: "Suche mit einem bezahlten Publisher-Schlüssel ein Match, wähle das Widget-Format und kopiere den fertigen Einbettungscode.",
    apiKey: "Publisher-API-Schlüssel",
    domain: "Publisher-Domain",
    sport: "Sport",
    type: "Widget-Typ",
    query: "Team, Spieler, Wettbewerb oder Match-ID suchen",
    searchButton: "Matches suchen",
    searchingButton: "Suche läuft...",
    results: "Suchergebnisse",
    accent: "Akzent",
    background: "Hintergrund",
    text: "Text",
    reasoning: "Begründung",
    branding: "Markenhinweis",
    embedCode: "Einbettungscode",
    selected: "ausgewählt.",
    selectMatch: "Wähle ein Match aus, um eine exakte Match-ID einzubinden.",
    copiedLabel: "Einbettungscode kopiert",
    copyLabel: "Einbettungscode kopieren",
    color: "Farbe",
    hex: "Hexcode",
    dateTbd: "Datum offen",
    copyCommandFailed: "Kopierbefehl fehlgeschlagen"
  }
};

export function WidgetBuilder({ locale = "en" }: { locale?: WidgetBuilderLocale }) {
  const textCopy = builderText[locale];
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
  const [status, setStatus] = useState(textCopy.initialStatus);
  const [copyStatus, setCopyStatus] = useState(textCopy.copy);
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
      setStatus(textCopy.keyRequired);
      setMatches([]);
      setSelectedMatchId("");
      return;
    }

    setIsLoading(true);
    setStatus(textCopy.searchingStatus);

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
        throw new Error(body.message || textCopy.searchUnavailable);
      }

      const nextMatches = body.matches ?? [];
      setMatches(nextMatches);
      setSelectedMatchId(nextMatches[0]?.id ?? "");
      setStatus(nextMatches.length ? textCopy.matchesFound(nextMatches.length) : textCopy.noMatches);
    } catch (error) {
      setMatches([]);
      setSelectedMatchId("");
      setStatus(error instanceof Error ? error.message : textCopy.searchFailed);
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
      setCopyStatus(textCopy.copied);
      window.setTimeout(() => setCopyStatus(textCopy.copy), 1800);
    } catch (_error) {
      try {
        copyWithTextareaFallback(embedCode);
        setCopyStatus(textCopy.copied);
        window.setTimeout(() => setCopyStatus(textCopy.copy), 1800);
      } catch (_fallbackError) {
        setCopyStatus(textCopy.copyFailed);
        window.setTimeout(() => setCopyStatus(textCopy.copy), 2200);
      }
    }
  }

  return (
    <section className="widgetsPanel widgetBuilder" aria-labelledby="widget-builder-title">
      <div className="widgetsSectionIntro">
        <h2 id="widget-builder-title">{textCopy.title}</h2>
        <p>{textCopy.intro}</p>
      </div>

      <div className="widgetBuilderGrid">
        <label className="widgetBuilderField">
          <span>{textCopy.apiKey}</span>
          <input
            autoComplete="off"
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="YOUR_PUBLISHER_KEY"
            type="password"
            value={apiKey}
          />
        </label>

        <label className="widgetBuilderField">
          <span>{textCopy.domain}</span>
          <input
            onChange={(event) => setPublisherDomain(event.target.value)}
            placeholder="https://publisher.example"
            value={publisherDomain}
          />
        </label>

        <label className="widgetBuilderField">
          <span>Sport</span>
          <select onChange={(event) => setSport(event.target.value as WidgetSport)} value={sport}>
            {sports[locale].map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField">
          <span>{textCopy.type}</span>
          <select onChange={(event) => setType(event.target.value as WidgetType)} value={type}>
            {widgetTypes[locale].map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField widgetBuilderFieldWide">
          <span>{textCopy.query}</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Boston Celtics, Wimbledon, Champions League..."
            value={query}
          />
        </label>

        <div className="widgetBuilderActions">
          <button disabled={isLoading} onClick={searchMatches} type="button">
            {isLoading ? textCopy.searchingButton : textCopy.searchButton}
          </button>
          <p>{status}</p>
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="widgetBuilderMatches" aria-label={textCopy.results}>
          {matches.map((match) => (
            <button
              className={match.id === selectedMatchId ? "isSelected" : ""}
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
              type="button"
            >
              <span>{match.competition}</span>
              <strong>{match.label}</strong>
              <small>{formatDate(match.date, textCopy.dateTbd, locale)} · {match.id}</small>
            </button>
          ))}
        </div>
      ) : null}

      <div className="widgetBuilderCustomize">
        <ColorField colorLabel={textCopy.color} hexLabel={textCopy.hex} label={textCopy.accent} onChange={setAccent} value={accent} />
        <ColorField colorLabel={textCopy.color} hexLabel={textCopy.hex} label={textCopy.background} onChange={setBackground} value={background} />
        <ColorField colorLabel={textCopy.color} hexLabel={textCopy.hex} label={textCopy.text} onChange={setText} value={text} />
        <label>
          <input checked={showReasoning} onChange={(event) => setShowReasoning(event.target.checked)} type="checkbox" />
          <span>{textCopy.reasoning}</span>
        </label>
        <label>
          <input checked={showBranding} onChange={(event) => setShowBranding(event.target.checked)} type="checkbox" />
          <span>{textCopy.branding}</span>
        </label>
      </div>

      <div className="widgetBuilderCode">
        <div className="widgetBuilderCodeHeader">
          <div>
            <h3>{textCopy.embedCode}</h3>
            <p>{selectedMatch ? `${selectedMatch.label} ${textCopy.selected}` : textCopy.selectMatch}</p>
          </div>
        </div>
        <div className="widgetBuilderCodeBox">
          <button
            aria-label={copyStatus === textCopy.copied ? textCopy.copiedLabel : textCopy.copyLabel}
            onClick={copyEmbedCode}
            title={copyStatus === textCopy.copied ? textCopy.copied : textCopy.copy}
            type="button"
          >
            <span aria-hidden="true">{copyStatus === textCopy.copied ? "✓" : "⧉"}</span>
          </button>
          <pre><code>{embedCode}</code></pre>
        </div>
      </div>
    </section>
  );
}

function ColorField({
  colorLabel,
  hexLabel,
  label,
  onChange,
  value
}: {
  colorLabel: string;
  hexLabel: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="widgetBuilderColorField">
      <span>{label}</span>
      <span className="widgetBuilderColorControl">
        <input aria-label={`${label} ${colorLabel}`} onChange={(event) => onChange(event.target.value)} type="color" value={toColorInputValue(value)} />
        <input
          aria-label={`${label} ${hexLabel}`}
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

function formatDate(value: string | null, fallback: string, locale: WidgetBuilderLocale): string {
  if (!value) return fallback;

  try {
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch (_error) {
    return fallback;
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
