import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { SportsNewsItem } from "@/lib/sports-news";

export function SportsNewsCard({
  item,
  lead = false,
  locale
}: {
  item: SportsNewsItem;
  lead?: boolean;
  locale: Locale;
}) {
  return (
    <Link className={lead ? "footballNewsCard sportsNewsCard sportsNewsLeadCard" : "footballNewsCard sportsNewsCard"} href={item.url} rel="noopener noreferrer" target="_blank">
      <div className="sportsNewsMedia" aria-hidden="true">
        {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <strong>{item.source.slice(0, 2).toUpperCase()}</strong>}
      </div>
      <div className="sportsNewsText">
        <span className="sportsNewsSource">Quelle: {item.source}</span>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        <small>{[formatNewsDate(item.publishedAt, locale), item.source].filter(Boolean).join(" · ")}</small>
      </div>
    </Link>
  );
}

export function SportsNewsCards({ items, locale }: { items: SportsNewsItem[]; locale: Locale }) {
  return (
    <>
      {items.map((item, index) => (
        <SportsNewsCard item={item} key={`${item.source}-${item.url}`} lead={index === 0} locale={locale} />
      ))}
    </>
  );
}

function formatNewsDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}
