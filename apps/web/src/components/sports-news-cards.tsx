"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { getIntlLocale, type SiteLocale } from "@/lib/i18n";
import { translateText } from "@/lib/site-translations";
import type { SportsNewsItem } from "@/lib/sports-news";

export function SportsNewsCard({
  item,
  lead = false
}: {
  item: SportsNewsItem;
  lead?: boolean;
}) {
  const { siteLocale } = useLocale();
  const title = localizeFallbackNewsTitle(item.title, siteLocale);
  const summary = localizeFallbackNewsSummary(item.summary, siteLocale);
  return (
    <Link className={lead ? "footballNewsCard sportsNewsCard sportsNewsLeadCard" : "footballNewsCard sportsNewsCard"} href={item.url} rel="noopener noreferrer" target="_blank">
      <div className="sportsNewsMedia" aria-hidden="true">
        {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <strong>{item.source.slice(0, 2).toUpperCase()}</strong>}
      </div>
      <div className="sportsNewsText">
        <span className="sportsNewsSource">{translateText("Source", siteLocale)}: {item.source}</span>
        <h3 data-no-auto-translate>{title}</h3>
        <p data-no-auto-translate>{summary}</p>
        <small>{[formatNewsDate(item.publishedAt, siteLocale), item.source].filter(Boolean).join(" · ")}</small>
      </div>
    </Link>
  );
}

function localizeFallbackNewsTitle(value: string, locale: SiteLocale) {
  const match = value.match(/^(.*): latest news from (.*)$/i);
  if (!match) return value;
  return translateText("{topic}: latest news from {source}", locale)
    .replace("{topic}", match[1])
    .replace("{source}", match[2]);
}

function localizeFallbackNewsSummary(value: string, locale: SiteLocale) {
  const match = value.match(/^Latest reports, context and results for (.*)\.$/i);
  if (!match) return value;
  return translateText("Latest reports, context and results for {topic}.", locale)
    .replace("{topic}", match[1]);
}

export function SportsNewsCards({ items }: { items: SportsNewsItem[]; locale: SiteLocale }) {
  return (
    <>
      {items.map((item, index) => (
        <SportsNewsCard item={item} key={`${item.source}-${item.url}`} lead={index === 0} />
      ))}
    </>
  );
}

function formatNewsDate(value: string | null, locale: SiteLocale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
