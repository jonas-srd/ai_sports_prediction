import type { Locale } from "@/lib/i18n";

export type SportsNewsTopic = "football" | "nba" | "nfl" | "tennis";

export type SportsNewsItem = {
  imageUrl: string | null;
  publishedAt: string | null;
  source: string;
  sourceUrl: string | null;
  summary: string;
  title: string;
  url: string;
};

type SportsNewsOptions = {
  contextName?: string;
  limit?: number;
  locale: Locale;
  topic: SportsNewsTopic;
};

const TOPIC_QUERIES: Record<SportsNewsTopic, Record<Locale, string>> = {
  football: {
    de: "Fußball Bundesliga Spieler Trainer Verein Transfer Verletzung Ergebnis Sport News",
    en: "football Premier League players teams manager transfer injury result sports news"
  },
  nba: {
    de: "NBA Basketball Spieler Team Trade Verletzung Ergebnis Sport News",
    en: "NBA basketball players teams trade injury result sports news"
  },
  nfl: {
    de: "NFL American Football Spieler Team Quarterback Verletzung Trade Ergebnis Sport News",
    en: "NFL American football players teams quarterback injury trade result sports news"
  },
  tennis: {
    de: "Tennis ATP WTA Spieler Turnier Ergebnis Verletzung Grand Slam Sport News",
    en: "tennis ATP WTA players tournament result injury Grand Slam sports news"
  }
};

const BLOCKED_NEWS_TERMS: Record<Locale, string[]> = {
  de: [
    "dazn",
    "fernsehen",
    "kalender",
    "kostenlos sehen",
    "live im tv",
    "spielplan",
    "stream",
    "streaming",
    "termin",
    "termine",
    "ticket",
    "tickets",
    "tv",
    "ubertragung",
    "uebertragung",
    "wann spielt",
    "wo lauft",
    "wo läuft"
  ],
  en: [
    "betting",
    "calendar",
    "free live stream",
    "how to watch",
    "odds",
    "schedule",
    "stream",
    "streaming",
    "tickets",
    "tv channel",
    "watch"
  ]
};

export async function getSportsNewsLinks({
  contextName,
  limit = 3,
  locale,
  topic
}: SportsNewsOptions): Promise<SportsNewsItem[]> {
  const query = buildNewsQuery(topic, locale, contextName);
  const url = getGoogleNewsRssUrl(query, locale);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/rss+xml, application/xml, text/xml",
        "user-agent": "Mozilla/5.0 (compatible; AI-Sport-Prediction/1.0)"
      },
      next: { revalidate: Number(process.env.NEWS_CACHE_SECONDS ?? 900) }
    }).catch(() => null);

    if (response?.ok) {
      const xml = await response.text();
      const items = filterSportsNewsItems(parseNewsRss(xml), locale).slice(0, limit);

      if (items.length > 0) {
        return fillWithFallbackItems(items, topic, locale, contextName, limit);
      }
    }
  } catch {
    // Keep the page useful with source links if the feed is unavailable.
  }

  return getFallbackNewsLinks(topic, locale, contextName).slice(0, limit);
}

function buildNewsQuery(topic: SportsNewsTopic, locale: Locale, contextName?: string) {
  return [contextName, TOPIC_QUERIES[topic][locale], locale === "de" ? "Nachrichten" : "latest", "when:14d"].filter(Boolean).join(" ");
}

function filterSportsNewsItems(items: SportsNewsItem[], locale: Locale) {
  return items.filter((item) => {
    const searchable = normalizeNewsText(`${item.title} ${item.summary} ${item.source}`);
    return !BLOCKED_NEWS_TERMS[locale].some((term) => searchable.includes(normalizeNewsText(term)));
  });
}

function fillWithFallbackItems(
  items: SportsNewsItem[],
  topic: SportsNewsTopic,
  locale: Locale,
  contextName: string | undefined,
  limit: number
) {
  if (items.length >= limit) {
    return items.slice(0, limit);
  }

  const seenUrls = new Set(items.map((item) => item.url));
  const fallbackItems = getFallbackNewsLinks(topic, locale, contextName).filter((item) => !seenUrls.has(item.url));

  return [...items, ...fallbackItems].slice(0, limit);
}

function normalizeNewsText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getGoogleNewsRssUrl(query: string, locale: Locale) {
  const params = new URLSearchParams({
    ceid: locale === "de" ? "DE:de" : "US:en",
    gl: locale === "de" ? "DE" : "US",
    hl: locale === "de" ? "de" : "en",
    q: query
  });

  return `https://news.google.com/rss/search?${params.toString()}`;
}

function parseNewsRss(xml: string): SportsNewsItem[] {
  const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);

  return itemBlocks
    .map((itemXml) => {
      const sourceName = readXmlText(itemXml, "source") || "News";
      const sourceUrl = readXmlAttribute(itemXml, "source", "url");
      const link = readXmlText(itemXml, "link");
      const cleanLink = decodeGoogleNewsUrl(link);
      const finalUrl = cleanLink || link || sourceUrl;

      if (!finalUrl) {
        return null;
      }

      return {
        imageUrl: getSourceIcon(sourceUrl ?? finalUrl),
        publishedAt: readXmlText(itemXml, "pubDate"),
        source: sourceName,
        sourceUrl,
        summary: stripHtml(readXmlText(itemXml, "description") ?? ""),
        title: stripHtml(readXmlText(itemXml, "title") ?? ""),
        url: finalUrl
      } satisfies SportsNewsItem;
    })
    .filter((item): item is SportsNewsItem => Boolean(item?.title && item.url));
}

function readXmlText(xml: string, tagName: string) {
  const match = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(xml);
  return match ? decodeXml(match[1].trim()) : null;
}

function readXmlAttribute(xml: string, tagName: string, attributeName: string) {
  const match = new RegExp(`<${tagName}\\s[^>]*${attributeName}="([^"]+)"[^>]*>`, "i").exec(xml);
  return match ? decodeXml(match[1].trim()) : null;
}

function decodeGoogleNewsUrl(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const directUrl = parsed.searchParams.get("url");
    return directUrl ?? url;
  } catch {
    return url;
  }
}

function stripHtml(value: string) {
  return decodeXml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function getFallbackNewsLinks(topic: SportsNewsTopic, locale: Locale, contextName?: string): SportsNewsItem[] {
  const topicLabel = contextName ?? getTopicLabel(topic, locale);
  const fallback = getFallbackSources(topic, locale);

  return fallback.map((source) => ({
    imageUrl: getSourceIcon(source.url),
    publishedAt: null,
    source: source.name,
    sourceUrl: source.url,
    summary: locale === "de"
      ? `Aktuelle Meldungen, Hintergründe und Ergebnisse zu ${topicLabel}.`
      : `Latest reports, context and results for ${topicLabel}.`,
    title: locale === "de" ? `${topicLabel}: aktuelle News bei ${source.name}` : `${topicLabel}: latest news from ${source.name}`,
    url: source.url
  }));
}

function getFallbackSources(topic: SportsNewsTopic, locale: Locale) {
  const footballSources = locale === "de"
    ? [
        { name: "Sportschau", url: "https://www.sportschau.de/fussball" },
        { name: "Kicker", url: "https://www.kicker.de/fussball" },
        { name: "Sport1", url: "https://www.sport1.de/fussball" }
      ]
    : [
        { name: "BBC Sport", url: "https://www.bbc.com/sport/football" },
        { name: "The Guardian", url: "https://www.theguardian.com/football" },
        { name: "ESPN", url: "https://www.espn.com/soccer/" }
      ];

  const germanSources: Record<SportsNewsTopic, Array<{ name: string; url: string }>> = {
    football: footballSources,
    nba: [
      { name: "NBA Deutschland", url: "https://www.nba.com/de/news" },
      { name: "Sport1 NBA", url: "https://www.sport1.de/us-sport/nba" },
      { name: "Spox NBA", url: "https://www.spox.com/de/sport/ussport/nba/index.html" }
    ],
    nfl: [
      { name: "NFL Deutschland", url: "https://www.nfl.com/de/news/" },
      { name: "ran NFL", url: "https://www.ran.de/sports/american-football/nfl/news" },
      { name: "Sport1 NFL", url: "https://www.sport1.de/us-sport/nfl" }
    ],
    tennis: [
      { name: "Sportschau Tennis", url: "https://www.sportschau.de/tennis" },
      { name: "Tennisnet", url: "https://www.tennisnet.com/news" },
      { name: "Eurosport Tennis", url: "https://www.eurosport.de/tennis/" }
    ]
  };

  const englishSources: Record<SportsNewsTopic, Array<{ name: string; url: string }>> = {
    football: footballSources,
    nba: [
      { name: "NBA", url: "https://www.nba.com/news" },
      { name: "ESPN", url: "https://www.espn.com/nba/" },
      { name: "BBC Sport", url: "https://www.bbc.com/sport/basketball" }
    ],
    nfl: [
      { name: "NFL", url: "https://www.nfl.com/news/" },
      { name: "ESPN", url: "https://www.espn.com/nfl/" },
      { name: "BBC Sport", url: "https://www.bbc.com/sport/american-football" }
    ],
    tennis: [
      { name: "ATP Tour", url: "https://www.atptour.com/en/news" },
      { name: "WTA", url: "https://www.wtatennis.com/news" },
      { name: "BBC Sport", url: "https://www.bbc.com/sport/tennis" }
    ]
  };

  return (locale === "de" ? germanSources : englishSources)[topic];
}

function getSourceIcon(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=96`;
  } catch {
    return null;
  }
}

function getTopicLabel(topic: SportsNewsTopic, locale: Locale) {
  const labels: Record<SportsNewsTopic, Record<Locale, string>> = {
    football: { de: "Fußball", en: "Football" },
    nba: { de: "NBA", en: "NBA" },
    nfl: { de: "NFL", en: "NFL" },
    tennis: { de: "Tennis", en: "Tennis" }
  };

  return labels[topic][locale];
}
