"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSelect } from "@/components/language-select";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { footballCompetitions } from "@/lib/football-data";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import { tennisPlayers, tennisTournaments } from "@/lib/tennis-data";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath, stripLocalePrefix } from "@/lib/i18n";

export function SiteNav() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const text = commonText[locale];
  const mainLinks = [
    { href: "/", label: text.home },
    { href: "/#sports", label: text.forecasts },
    { href: "/#live-results", label: text.liveResults },
    { href: "/#signals", label: text.newsticker }
  ];
  const sportLinks = [
    { href: "/football", label: text.football },
    { href: "/nfl", label: "NFL" },
    { href: "/nba", label: "NBA" },
    { href: "/tennis", label: text.tennis }
  ];
  const anchorAwarePath = (href: string) => {
    const [path, hash] = href.split("#");
    return `${localizePath(path, locale)}${hash ? `#${hash}` : ""}`;
  };
  const currentPath = stripLocalePrefix(pathname ?? "/");
  const isFootballSection = currentPath === "/football" || currentPath.startsWith("/football/");
  const isActive = (href: string) => {
    const [path] = href.split("#");
    return path === "/" ? currentPath === "/" : currentPath === path;
  };
  const isFootballCompetitionActive = (slug: string) => {
    const competitionPath = `/football/${slug}`;
    return currentPath === competitionPath || currentPath.startsWith(`${competitionPath}/`);
  };
  const searchItems = useMemo(() => {
    const baseItems = [
      { href: "/", label: text.home, eyebrow: locale === "de" ? "Start" : "Home" },
      { href: "/football", label: text.football, eyebrow: text.sports },
      { href: "/nfl", label: "NFL", eyebrow: text.sports },
      { href: "/nba", label: "NBA", eyebrow: text.sports },
      { href: "/tennis", label: text.tennis, eyebrow: text.sports },
      { href: "/impressum", label: text.legalNotice, eyebrow: text.mainNavigation }
    ];
    const competitionItems = footballCompetitions.map((competition) => ({
      href: `/football/${competition.slug}`,
      label: competition.name,
      eyebrow: competition.type === "league" ? (locale === "de" ? "Liga" : "League") : (locale === "de" ? "Pokal" : "Cup")
    }));
    const seenTeams = new Set<string>();
    const footballTeamItems = footballCompetitions.flatMap((competition) =>
      competition.teams.flatMap((team) => {
        if (seenTeams.has(team.slug)) {
          return [];
        }

        seenTeams.add(team.slug);
        return [{
          href: `/football/team/${team.slug}`,
          label: team.name,
          eyebrow: locale === "de" ? "Team" : "Team"
        }];
      })
    );
    const nflTeamItems = nflTeams.map((team) => ({
      href: `/nfl/team/${team.slug}`,
      label: team.name,
      eyebrow: "NFL Team"
    }));
    const nbaTeamItems = nbaTeams.map((team) => ({
      href: `/nba/team/${team.slug}`,
      label: team.name,
      eyebrow: "NBA Team"
    }));
    const tennisPlayerItems = tennisPlayers.map((player) => ({
      href: `/tennis/player/${player.slug}`,
      label: player.name,
      eyebrow: `${player.tour} ${locale === "de" ? "Spieler" : "Player"}`
    }));
    const tennisTournamentItems = tennisTournaments.map((tournament) => ({
      href: locale === "de" ? `/tennis/turnier/${tournament.slug}` : `/tennis/tournament/${tournament.slug}`,
      label: tournament.name,
      eyebrow: tournament.category
    }));

    return [...baseItems, ...competitionItems, ...footballTeamItems, ...nflTeamItems, ...nbaTeamItems, ...tennisPlayerItems, ...tennisTournamentItems];
  }, [locale, text.football, text.home, text.legalNotice, text.mainNavigation, text.sports, text.tennis]);

  return (
    <header className="siteNav">
      <div className="siteNavTop">
        <div className="siteNavInner">
          <Link className="siteNavLogo" href={localizePath("/", locale)}>
            <span className="siteNavLogoMark" aria-hidden="true">
              <img src="/site-icon.png" alt="" />
            </span>
            <span>AI Sport Prediction</span>
          </Link>
          <SiteSearch
            items={searchItems.map((item) => ({ ...item, href: localizePath(item.href, locale) }))}
            locale={locale}
            onNavigate={(href) => router.push(href)}
          />
          <div className="siteNavControls">
            <TimeZoneSelect />
            <LanguageSelect />
          </div>
          <details className="siteMenu">
            <summary className="siteNavMenuLink">
              <span aria-hidden="true">☰</span>
              <span>{text.menu}</span>
            </summary>
            <div className="siteMenuPanel">
              <div className="siteMenuColumn">
                <p>{text.sports}</p>
                {sportLinks.map((link) => (
                  <Link href={anchorAwarePath(link.href)} key={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="siteMenuColumn">
                <p>{text.mainNavigation}</p>
                {mainLinks.map((link) => (
                  <Link href={anchorAwarePath(link.href)} key={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
      <div className="sportschauTopicBar">
        <nav className={`sportschauTopicInner ${isFootballSection ? "isFootballCompetitionRail" : ""}`} aria-label={text.mainNavigation}>
          {isFootballSection ? (
            <>
              <div className="topicNavPrimaryGroup">
                <Link className={`topicNavLink ${isActive("/") ? "isActive" : ""}`} href={localizePath("/", locale)}>
                  {text.home}
                </Link>
                <Link className={`topicNavLink ${currentPath === "/football" ? "isActive" : ""}`} href={localizePath("/football", locale)}>
                  {text.football}
                </Link>
              </div>
              <div className="topicNavCompetitionGroup">
                {footballCompetitions.map((competition) => (
                  <Link
                    className={`topicNavLink ${isFootballCompetitionActive(competition.slug) ? "isActive" : ""}`}
                    href={localizePath(`/football/${competition.slug}`, locale)}
                    key={competition.slug}
                  >
                    {competition.name}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <Link className={`topicNavLink ${isActive("/") ? "isActive" : ""}`} href={localizePath("/", locale)}>
                {text.home}
              </Link>
              {sportLinks.map((link) => (
                <Link
                  className={`topicNavLink topicNavSportLink ${isActive(link.href) ? "isActive" : ""}`}
                  href={anchorAwarePath(link.href)}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
              {mainLinks.slice(1).map((link) => (
                <Link
                  className={`topicNavLink ${isActive(link.href) ? "isActive" : ""}`}
                  href={anchorAwarePath(link.href)}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function SiteSearch({
  items,
  locale,
  onNavigate
}: {
  items: Array<{ href: string; label: string; eyebrow: string }>;
  locale: "en" | "de";
  onNavigate: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const results = normalizedQuery
    ? items
        .filter((item) => normalizeSearch(`${item.label} ${item.eyebrow}`).includes(normalizedQuery))
        .slice(0, 6)
    : items.slice(0, 5);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = results[0];

    if (target) {
      setQuery("");
      onNavigate(target.href);
    }
  };

  return (
    <form className="siteSearch" onSubmit={submitSearch} role="search">
      <label className="siteSearchLabel" htmlFor="site-search">
        {locale === "de" ? "Suche" : "Search"}
      </label>
      <div className="siteSearchField">
        <span aria-hidden="true">⌕</span>
        <input
          autoComplete="off"
          id="site-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "de" ? "Team, Liga, Pokal suchen" : "Search team, league, cup"}
          value={query}
        />
        <button aria-label={locale === "de" ? "Suchen" : "Search"} type="submit">
          →
        </button>
      </div>
      {query && results.length > 0 ? (
        <div className="siteSearchResults">
          {results.map((item) => (
            <button
              key={`${item.href}:${item.label}`}
              onMouseDown={(event) => {
                event.preventDefault();
                setQuery("");
                onNavigate(item.href);
              }}
              type="button"
            >
              <span>{item.eyebrow}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
