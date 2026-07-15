"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { trackGrowthEvent } from "@/lib/growth-analytics";
import type { WidgetPreviewMatch, WidgetPreviewMatches } from "@/lib/widget-data";

type WidgetType = "prediction-card" | "match-list" | "win-probability" | "key-factors";
type WidgetSport = "all" | "football" | "nba" | "nfl" | "tennis";
type WidgetBuilderLocale = "en" | "de";
type WidgetModel = "nexus" | "pulse" | "edge" | "viewer";
type FixedWidgetModel = Exclude<WidgetModel, "viewer">;

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
    { label: "Key factors", value: "key-factors" }
  ],
  de: [
    { label: "Prognosekarte", value: "prediction-card" },
    { label: "Matchliste", value: "match-list" },
    { label: "Sieg-Wahrscheinlichkeit", value: "win-probability" },
    { label: "Schlüsselfaktoren", value: "key-factors" }
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

const widgetLanguages: Record<WidgetBuilderLocale, Array<{ label: string; value: WidgetBuilderLocale }>> = {
  en: [
    { label: "English", value: "en" },
    { label: "German", value: "de" }
  ],
  de: [
    { label: "Deutsch", value: "de" },
    { label: "Englisch", value: "en" }
  ]
};

const widgetModels: Record<WidgetBuilderLocale, Array<{ label: string; value: WidgetModel }>> = {
  en: [
    { label: "Visitors choose (NEXUS, PULSE, EDGE)", value: "viewer" },
    { label: "NEXUS · long-term strength", value: "nexus" },
    { label: "PULSE · current form", value: "pulse" },
    { label: "EDGE · matchup context", value: "edge" }
  ],
  de: [
    { label: "Besucher wählen selbst (NEXUS, PULSE, EDGE)", value: "viewer" },
    { label: "NEXUS · langfristige Stärke", value: "nexus" },
    { label: "PULSE · aktuelle Form", value: "pulse" },
    { label: "EDGE · Matchup-Kontext", value: "edge" }
  ]
};

const builderText = {
  en: {
    initialStatus: "Search for a team, player or competition, then select a game for the preview.",
    queryRequired: "Enter a team, player, competition or match id to search.",
    searchingStatus: "Searching matches...",
    searchUnavailable: "Match search is not available for this key.",
    matchesFound: (count: number) => `${count} matches found.`,
    noMatches: "No matching games found.",
    searchFailed: "Match search failed.",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Copy failed",
    title: "Widget builder",
    intro: "Choose preview games without a key, adjust the widget and copy the finished embed code when you are ready to publish.",
    apiKey: "Publisher API key (optional for preview)",
    domain: "Publisher domain",
    sport: "Sport",
    type: "Widget type",
    language: "Widget language",
    model: "AI model",
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
    selectMatches: "Select the games that should appear in this match-list widget.",
    selectionCount: (count: number, max: number) => `${count} of ${max} games selected for this plan.`,
    copiedLabel: "Embed code copied",
    copyLabel: "Copy embed code",
    color: "color",
    hex: "hex code",
    dateTbd: "Date tbd",
    copyCommandFailed: "Copy command failed",
    livePreview: "Live design preview",
    livePreviewNote: "Selected games, language, model, format and styling update instantly."
  },
  de: {
    initialStatus: "Suche nach einem Team, Spieler oder Wettbewerb und wähle danach ein Spiel für die Vorschau aus.",
    queryRequired: "Gib ein Team, einen Spieler, Wettbewerb oder eine Match-ID für die Suche ein.",
    searchingStatus: "Matches werden gesucht...",
    searchUnavailable: "Die Matchsuche ist für diesen Schlüssel nicht verfügbar.",
    matchesFound: (count: number) => `${count} Matches gefunden.`,
    noMatches: "Keine passenden Spiele gefunden.",
    searchFailed: "Matchsuche fehlgeschlagen.",
    copy: "Kopieren",
    copied: "Kopiert",
    copyFailed: "Kopieren fehlgeschlagen",
    title: "Widget-Builder",
    intro: "Wähle Vorschau-Spiele ohne Schlüssel aus, passe das Widget an und kopiere zur Veröffentlichung den fertigen Einbettungscode.",
    apiKey: "Publisher-API-Schlüssel (für Vorschau optional)",
    domain: "Publisher-Domain",
    sport: "Sport",
    type: "Widget-Typ",
    language: "Widget-Sprache",
    model: "KI-Modell",
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
    selectMatches: "Wähle die Spiele aus, die in diesem Matchlisten-Widget erscheinen sollen.",
    selectionCount: (count: number, max: number) => `${count} von ${max} Spielen für diesen Tarif ausgewählt.`,
    copiedLabel: "Einbettungscode kopiert",
    copyLabel: "Einbettungscode kopieren",
    color: "Farbe",
    hex: "Hexcode",
    dateTbd: "Datum offen",
    copyCommandFailed: "Kopierbefehl fehlgeschlagen",
    livePreview: "Live-Designvorschau",
    livePreviewNote: "Ausgewählte Spiele, Sprache, Modell, Format und Gestaltung aktualisieren sich sofort."
  }
};

export function WidgetBuilder({ locale = "en", previewMatches = {} }: { locale?: WidgetBuilderLocale; previewMatches?: WidgetPreviewMatches }) {
  const textCopy = builderText[locale];
  const [apiKey, setApiKey] = useState("");
  const [publisherDomain, setPublisherDomain] = useState("https://publisher.example");
  const [sport, setSport] = useState<WidgetSport>("nba");
  const [type, setType] = useState<WidgetType>("prediction-card");
  const [language, setLanguage] = useState<WidgetBuilderLocale>(locale);
  const [model, setModel] = useState<WidgetModel>("viewer");
  const [query, setQuery] = useState("");
  const [accent, setAccent] = useState("#7df5c1");
  const [background, setBackground] = useState("#101f2e");
  const [text, setText] = useState("#f7fbff");
  const [showReasoning, setShowReasoning] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [matches, setMatches] = useState<BuilderMatch[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<BuilderMatch[]>([]);
  const [maxSelectedMatches, setMaxSelectedMatches] = useState(3);
  const [status, setStatus] = useState(textCopy.initialStatus);
  const [copyStatus, setCopyStatus] = useState(textCopy.copy);
  const [isLoading, setIsLoading] = useState(false);

  const sportMatches = matches.filter((match) => sport === "all" || match.sport === sport);
  const selectedMatchIds = selectedMatches.map((match) => match.id);
  const selectedMatch = selectedMatches[0] ?? null;
  const embedCode = useMemo(() => buildEmbedCode({
    accent,
    apiKey,
    background,
    language,
    matches: selectedMatches,
    model,
    showBranding,
    showReasoning,
    sport,
    text,
    type
  }), [accent, apiKey, background, language, model, selectedMatches, showBranding, showReasoning, sport, text, type]);

  async function searchMatches() {
    if (!query.trim()) {
      setMatches([]);
      setStatus(textCopy.queryRequired);
      return;
    }

    if (!apiKey.trim()) {
      const previewResults = filterBuilderMatches(getPreviewBuilderMatches(previewMatches, sport), query);
      setMatches(previewResults);
      setStatus(previewResults.length ? textCopy.matchesFound(previewResults.length) : textCopy.noMatches);
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
      const plan = response.headers.get("x-ai-sports-widget-plan");
      const planMax = plan === "enterprise" ? 12 : plan === "growth" ? 8 : 3;
      setMaxSelectedMatches(planMax);
      setMatches(nextMatches);
      setStatus(nextMatches.length ? textCopy.matchesFound(nextMatches.length) : textCopy.noMatches);
    } catch (error) {
      const previewResults = filterBuilderMatches(getPreviewBuilderMatches(previewMatches, sport), query);
      setMatches(previewResults);
      setStatus(previewResults.length
        ? `${error instanceof Error ? error.message : textCopy.searchFailed} ${textCopy.matchesFound(previewResults.length)}`
        : error instanceof Error ? error.message : textCopy.searchFailed);
    } finally {
      setIsLoading(false);
    }
  }

  function selectMatch(matchId: string) {
    const selected = sportMatches.find((match) => match.id === matchId);
    if (!selected) return;

    if (type !== "match-list") {
      setSelectedMatches([selected]);
      return;
    }

    setSelectedMatches((current) => {
      if (current.some((match) => match.id === matchId)) return current.filter((match) => match.id !== matchId);
      if (current.length >= maxSelectedMatches) return current;
      return [...current, selected];
    });
  }

  async function copyEmbedCode() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(embedCode);
      } else {
        copyWithTextareaFallback(embedCode);
      }
      setCopyStatus(textCopy.copied);
      trackGrowthEvent("widget_embed_copied", { language, model, sport, type });
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
          <select onChange={(event) => {
            const nextSport = event.target.value as WidgetSport;
            setSport(nextSport);
            setQuery("");
            setMatches([]);
            setSelectedMatches([]);
            setStatus(textCopy.initialStatus);
          }} value={sport}>
            {sports[locale].map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField">
          <span>{textCopy.type}</span>
          <select onChange={(event) => {
            const nextType = event.target.value as WidgetType;
            setType(nextType);
            setSelectedMatches((current) => nextType === "match-list" ? current : current.slice(0, 1));
          }} value={type}>
            {widgetTypes[locale].map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField">
          <span>{textCopy.language}</span>
          <select data-testid="widget-language-select" onChange={(event) => setLanguage(event.target.value as WidgetBuilderLocale)} value={language}>
            {widgetLanguages[locale].map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="widgetBuilderField">
          <span>{textCopy.model}</span>
          <select data-testid="widget-model-select" onChange={(event) => setModel(event.target.value as WidgetModel)} value={model}>
            {widgetModels[locale].map((option) => (
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

      {sportMatches.length > 0 ? (
        <div className="widgetBuilderMatches" aria-label={textCopy.results}>
          {sportMatches.map((match) => (
            <button
              aria-pressed={selectedMatchIds.includes(match.id)}
              className={selectedMatchIds.includes(match.id) ? "isSelected" : ""}
              key={match.id}
              onClick={() => selectMatch(match.id)}
              type="button"
            >
              <span>{match.competition}{selectedMatchIds.includes(match.id) ? " · ✓" : ""}</span>
              <strong className="widgetBuilderMatchTeams">
                <span>{match.homeLogo ? <img alt={`${match.homeTeam} logo`} src={match.homeLogo} /> : null}{match.homeTeam}</span>
                <em>vs</em>
                <span>{match.awayLogo ? <img alt={`${match.awayTeam} logo`} src={match.awayLogo} /> : null}{match.awayTeam}</span>
              </strong>
              <small>{formatDate(match.date, textCopy.dateTbd, locale)} · {match.id}</small>
            </button>
          ))}
          {type === "match-list" ? <p className="widgetBuilderSelectionCount">{textCopy.selectionCount(selectedMatchIds.length, maxSelectedMatches)}</p> : null}
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

      <WidgetBuilderLivePreview
        accent={accent}
        background={background}
        language={language}
        matches={selectedMatches}
        model={model}
        showBranding={showBranding}
        showReasoning={showReasoning}
        sport={sport}
        textColor={text}
        title={textCopy.livePreview}
        note={textCopy.livePreviewNote}
        type={type}
      />

      <div className="widgetBuilderCode">
        <div className="widgetBuilderCodeHeader">
          <div>
            <h3>{textCopy.embedCode}</h3>
            <p>{type === "match-list"
              ? (selectedMatches.length ? textCopy.selectionCount(selectedMatches.length, maxSelectedMatches) : textCopy.selectMatches)
              : (selectedMatch ? `${selectedMatch.label} ${textCopy.selected}` : textCopy.selectMatch)}</p>
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

function WidgetBuilderLivePreview({
  accent,
  background,
  language,
  matches,
  model,
  note,
  showBranding,
  showReasoning,
  sport,
  textColor,
  title,
  type
}: {
  accent: string;
  background: string;
  language: WidgetBuilderLocale;
  matches: BuilderMatch[];
  model: WidgetModel;
  note: string;
  showBranding: boolean;
  showReasoning: boolean;
  sport: WidgetSport;
  textColor: string;
  title: string;
  type: WidgetType;
}) {
  const [activePreviewModel, setActivePreviewModel] = useState<FixedWidgetModel>(model === "viewer" ? "nexus" : model);

  useEffect(() => {
    if (model !== "viewer") setActivePreviewModel(model);
  }, [model]);

  const copy = language === "de"
    ? {
        away: "FC Beispiel",
        branding: "Daten von AI Sports Prediction",
        confidence: "Sicherheit",
        home: "Sporting Musterstadt",
        pick: "Modell-Tipp",
        reasoning: "Begründung",
        visitor: "Besucher wählen",
        winProbability: "Sieg-Wahrscheinlichkeit"
      }
    : {
        away: "Example FC",
        branding: "Data by AI Sports Prediction",
        confidence: "Confidence",
        home: "Sporting Sample",
        pick: "Model pick",
        reasoning: "Reasoning",
        visitor: "Visitors choose",
        winProbability: "Win probability"
      };
  const match = matches[0] ?? null;
  const home = match?.homeTeam ?? copy.home;
  const away = match?.awayTeam ?? copy.away;
  const homeLogo = match?.homeLogo ?? null;
  const awayLogo = match?.awayLogo ?? null;
  const competition = match?.competition ?? "AI Sports Prediction";
  const previewHeaderLabel = type === "match-list" ? getMatchListHeaderLabel(sport, language) : competition;
  const selectedPreviewMatches = matches.flatMap((entry) => entry.homeLogo && entry.awayLogo ? [{
    awayLogo: entry.awayLogo,
    awayTeam: entry.awayTeam,
    competition: entry.competition,
    date: entry.date,
    homeLogo: entry.homeLogo,
    homeTeam: entry.homeTeam,
    id: entry.id,
    sport: entry.sport
  }] : []);
  const listMatches = getParticipantUniqueMatches(selectedPreviewMatches);
  const activeSport = match?.sport ?? (sport === "all" ? "nba" : sport);
  const sportContent = getPreviewSportContent(activeSport, language, home, away, activePreviewModel);
  const modelLabel = model === "viewer" ? `${copy.visitor} · ${activePreviewModel.toUpperCase()}` : model.toUpperCase();
  const style = {
    "--widget-live-accent": /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#7df5c1",
    "--widget-live-background": /^#[0-9a-f]{6}$/i.test(background) ? background : "#101f2e",
    "--widget-live-text": /^#[0-9a-f]{6}$/i.test(textColor) ? textColor : "#f7fbff"
  } as CSSProperties;

  return (
    <section className="widgetBuilderLivePreview" aria-label={title}>
      <div className="widgetBuilderCodeHeader">
        <div><h3>{title}</h3><p>{note}</p></div>
      </div>
      <div className="widgetBuilderLiveCanvas" style={style}>
        <div className="widgetBuilderLiveTopline">
          <span>{previewHeaderLabel}</span>
          <strong>{modelLabel}</strong>
        </div>
        {model === "viewer" ? (
          <div className="widgetBuilderLiveModels" aria-label={copy.visitor} role="group">
            {(["nexus", "pulse", "edge"] as FixedWidgetModel[]).map((entry) => (
              <button
                aria-pressed={activePreviewModel === entry}
                className={activePreviewModel === entry ? "isActive" : ""}
                key={entry}
                onClick={() => setActivePreviewModel(entry)}
                type="button"
              >
                {entry.toUpperCase()}
              </button>
            ))}
          </div>
        ) : null}

        {type === "match-list" && listMatches.length ? (
          <div className="widgetBuilderLiveList">
            {listMatches.slice(0, 3).map((entry, index) => (
              <WidgetLiveListRow key={`${entry.sport}:${entry.homeTeam}`} match={entry} score={getPreviewScore(entry.sport, index, activePreviewModel)} />
            ))}
          </div>
        ) : homeLogo && awayLogo ? (
          <>
            <div className="widgetBuilderLiveTeams">
              <div><img alt={`${home} logo`} src={homeLogo} /><strong>{home}</strong></div>
              <span>{type === "prediction-card" ? sportContent.score : "VS"}</span>
              <div><img alt={`${away} logo`} src={awayLogo} /><strong>{away}</strong></div>
            </div>
            {type === "key-factors" ? (
              <ul className="widgetBuilderLiveFactors">{sportContent.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul>
            ) : (
              <div className="widgetBuilderLiveMetric">
                <span>{type === "win-probability" ? copy.winProbability : copy.pick}</span>
                <strong>{type === "win-probability" ? `${sportContent.confidence}%` : sportContent.pick}</strong>
                <div><i style={{ width: `${sportContent.confidence}%` }} /></div>
                <small>{copy.confidence}: {sportContent.confidence}%</small>
              </div>
            )}
          </>
        ) : <p className="widgetBuilderLiveUnavailable">{language === "de" ? "Suche oben nach einem Spiel und wähle es aus. Erst dann erscheint es hier in der Vorschau." : "Search for a game above and select it. It will then appear here in the preview."}</p>}

        {showReasoning && matches.length > 0 && type !== "match-list" ? (
          <div className="widgetBuilderLiveReason"><strong>{copy.reasoning}</strong><p>{sportContent.reason}</p></div>
        ) : null}
        {showBranding ? <p className="widgetBuilderLiveBranding">{copy.branding}</p> : null}
      </div>
    </section>
  );
}

function getPreviewScore(sport: Exclude<WidgetSport, "all">, index = 0, model: FixedWidgetModel = "nexus"): string {
  if (sport === "nba") return model === "pulse" ? (index % 2 === 0 ? "108:111" : "113:107") : model === "edge" ? "115:110" : (index % 2 === 0 ? "112:106" : "104:109");
  if (sport === "nfl") return model === "pulse" ? "20:24" : model === "edge" ? "30:23" : (index % 2 === 0 ? "27:21" : "20:24");
  if (sport === "tennis") return model === "pulse" ? "1:2" : model === "edge" ? "2:0" : (index % 2 === 0 ? "2:1" : "0:2");
  return model === "pulse" ? "1:2" : model === "edge" ? "3:1" : (index % 2 === 0 ? "2:1" : "1:1");
}

function getMatchListHeaderLabel(sport: WidgetSport, language: WidgetBuilderLocale): string {
  if (sport === "all") return language === "de" ? "Matchliste" : "Match list";
  if (sport === "football") return language === "de" ? "Fußball" : "Football";
  if (sport === "nba") return "NBA";
  if (sport === "nfl") return "NFL";
  return "Tennis";
}

function getPreviewSportContent(sport: Exclude<WidgetSport, "all">, language: WidgetBuilderLocale, home: string, away: string, model: FixedWidgetModel) {
  const pick = model === "pulse" ? away : home;
  const confidence = model === "nexus" ? 68 : model === "pulse" ? 56 : 62;
  const score = getPreviewScore(sport, 0, model);
  if (language === "de") {
    if (sport === "nba") return { confidence, pick, score, factors: ["Vorteil bei Pace und Wurfprofil", "Tiefere Rotation", "Besserer Erholungskontext"], reason: `${model.toUpperCase()} bewertet Pace, Rotationstiefe und Wurfprofil im Matchup ${home} gegen ${away}.` };
    if (sport === "nfl") return { confidence, pick, score, factors: ["Stabileres Quarterback-Spiel", "Vorteil an der Line", "Bessere Third-Down-Effizienz"], reason: `${model.toUpperCase()} gewichtet Quarterback-Stabilität, Line-Matchups und situative Effizienz im Duell ${home} gegen ${away}.` };
    if (sport === "tennis") return { confidence, pick, score, factors: ["Passenderes Belagprofil", "Stärkerer Return", "Bessere aktuelle Form"], reason: `${model.toUpperCase()} gewichtet Belagprofil, Aufschlag-Return-Daten und aktuelle Form für ${home} gegen ${away}.` };
    return { confidence, pick, score, factors: ["Höhere Chancenqualität", "Stärkerer Heimkontext", "Vorteil bei Standards"], reason: `${model.toUpperCase()} bewertet Form, Chancenqualität und Heimkontext im Spiel ${home} gegen ${away}.` };
  }

  if (sport === "nba") return { confidence, pick, score, factors: ["Pace and shot-profile edge", "Deeper rotation", "Stronger rest context"], reason: `${model.toUpperCase()} weighs pace, rotation depth and shot profile for ${home} vs ${away}.` };
  if (sport === "nfl") return { confidence, pick, score, factors: ["More stable quarterback play", "Line matchup advantage", "Better third-down efficiency"], reason: `${model.toUpperCase()} weighs quarterback stability, line matchups and situational efficiency for ${home} vs ${away}.` };
  if (sport === "tennis") return { confidence, pick, score, factors: ["Better surface profile", "Stronger return numbers", "Better recent form"], reason: `${model.toUpperCase()} weighs surface profile, serve-return data and recent form for ${home} vs ${away}.` };
  return { confidence, pick, score, factors: ["Higher chance quality", "Stronger home context", "Set-piece edge"], reason: `${model.toUpperCase()} weighs form, chance quality and home context for ${home} vs ${away}.` };
}

function WidgetLiveListRow({ match, score }: { match: WidgetPreviewMatch; score: string }) {
  return (
    <div>
      <span><img alt={`${match.homeTeam} logo`} src={match.homeLogo} /><strong>{match.homeTeam}</strong></span>
      <b>{score}</b>
      <span><strong>{match.awayTeam}</strong><img alt={`${match.awayTeam} logo`} src={match.awayLogo} /></span>
    </div>
  );
}

function getPreviewBuilderMatches(previewMatches: WidgetPreviewMatches, sport: WidgetSport): BuilderMatch[] {
  const source = sport === "all"
    ? Object.values(previewMatches).flat()
    : previewMatches[sport] ?? [];

  return getParticipantUniqueMatches(source.filter((match): match is WidgetPreviewMatch => Boolean(match))).map((match) => ({
    awayLogo: match.awayLogo,
    awayTeam: match.awayTeam,
    competition: match.competition,
    date: match.date,
    homeLogo: match.homeLogo,
    homeTeam: match.homeTeam,
    id: match.id,
    label: `${match.homeTeam} vs ${match.awayTeam}`,
    sport: match.sport
  }));
}

function filterBuilderMatches(matches: BuilderMatch[], query: string): BuilderMatch[] {
  const normalizedQuery = normalizeBuilderSearch(query);
  if (!normalizedQuery) return matches;

  return matches.filter((match) => normalizeBuilderSearch([
    match.id,
    match.competition,
    match.homeTeam,
    match.awayTeam,
    match.sport
  ].join(" ")).includes(normalizedQuery));
}

function getParticipantUniqueMatches<T extends { awayTeam: string; homeTeam: string }>(matches: T[]): T[] {
  const usedParticipants = new Set<string>();

  return matches.filter((match) => {
    const homeKey = normalizeBuilderSearch(match.homeTeam);
    const awayKey = normalizeBuilderSearch(match.awayTeam);
    if (!homeKey || !awayKey || usedParticipants.has(homeKey) || usedParticipants.has(awayKey)) return false;
    usedParticipants.add(homeKey);
    usedParticipants.add(awayKey);
    return true;
  });
}

function normalizeBuilderSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  language,
  matches,
  model,
  showBranding,
  showReasoning,
  sport,
  text,
  type
}: {
  accent: string;
  apiKey: string;
  background: string;
  language: WidgetBuilderLocale;
  matches: BuilderMatch[];
  model: WidgetModel;
  showBranding: boolean;
  showReasoning: boolean;
  sport: WidgetSport;
  text: string;
  type: WidgetType;
}): string {
  const selectedSports = [...new Set(matches.map((match) => match.sport))];
  const selectedSport = sport === "all" ? "all" : selectedSports.length === 1 ? selectedSports[0] : sport;
  const isMatchList = type === "match-list";
  const matchIds = matches.map((match) => match.id);
  const lines = [
    "<div",
    "  data-ai-sports-widget",
    `  data-type="${type}"`,
    `  data-sport="${selectedSport}"`,
    `  data-language="${language}"`,
    `  data-model="${model}"`,
    !isMatchList && matches[0] ? `  data-match-id="${escapeAttribute(matches[0].id)}"` : "",
    isMatchList && matchIds.length ? `  data-match-ids="${escapeAttribute(matchIds.join(","))}"` : "",
    isMatchList && matchIds.length ? `  data-limit="${matchIds.length}"` : "",
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
