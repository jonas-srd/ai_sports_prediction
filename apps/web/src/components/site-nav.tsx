"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSelect } from "@/components/language-select";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { footballCompetitions } from "@/lib/football-data";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import { tennisPlayers, tennisTournaments } from "@/lib/tennis-data";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath, stripLocalePrefix, type SiteLocale } from "@/lib/i18n";

type FootballCompetitionGroup = {
  competitions: typeof footballCompetitions;
  id: string;
  label: string;
};

type SportMenuLink = {
  href: string;
  label: string;
};

type SportMenuSection =
  | { groups: FootballCompetitionGroup[]; href: string; kind: "football"; label: string }
  | { href: string; kind: "links"; label: string; links: SportMenuLink[] };

export function SiteNav() {
  const { locale, siteLocale, t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const footballDropdownsRef = useRef<HTMLDivElement>(null);
  const siteMenuRef = useRef<HTMLDetailsElement>(null);
  const [openFootballDropdown, setOpenFootballDropdown] = useState<string | null>(null);
  const [activeSiteMenuSport, setActiveSiteMenuSport] = useState<string | null>(null);
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const text = commonText[siteLocale];
  const widgetsLabel = t("Widgets");
  const mainLinks = [
    { href: "/", label: text.home },
    { href: "/widgets", label: widgetsLabel }
  ];
  const sportLinks = [
    { href: "/football", label: text.football },
    { href: "/nfl", label: "NFL" },
    { href: "/nba", label: "NBA" },
    { href: "/tennis", label: text.tennis }
  ];
  const anchorAwarePath = (href: string) => {
    const [path, hash] = href.split("#");
    return `${localizePath(path, siteLocale)}${hash ? `#${hash}` : ""}`;
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
  const closeFootballCompetitionDropdowns = useCallback(() => {
    setOpenFootballDropdown(null);
  }, []);
  const closeSiteMenu = useCallback(() => {
    setSiteMenuOpen(false);
    setActiveSiteMenuSport(null);
  }, []);
  useEffect(() => {
    if (!isFootballSection) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node) || footballDropdownsRef.current?.contains(target)) {
        return;
      }

      closeFootballCompetitionDropdowns();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFootballCompetitionDropdowns();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeFootballCompetitionDropdowns, isFootballSection]);
  useEffect(() => {
    if (!siteMenuOpen) return;

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node) || siteMenuRef.current?.contains(target)) {
        return;
      }

      closeSiteMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSiteMenu();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeSiteMenu, siteMenuOpen]);
  const footballCompetitionGroups: FootballCompetitionGroup[] = [
    {
      id: "europe",
      label: t("Europe"),
      competitions: footballCompetitions.filter((competition) => competition.country === "Europe")
    },
    {
      id: "leagues",
      label: t("Leagues"),
      competitions: footballCompetitions.filter((competition) => competition.country !== "Europe" && competition.type === "league")
    },
    {
      id: "cups",
      label: t("Cups"),
      competitions: footballCompetitions.filter((competition) => competition.country !== "Europe" && competition.type === "cup")
    }
  ];
  const sportMenuLabels = {
    competitions: t("Competitions"),
    matches: t("Matches"),
    overview: t("Overview"),
    players: t("Players"),
    rankings: t("Rankings"),
    table: t("Table"),
    teamStats: t("Team stats"),
    teams: t("Teams"),
    tournaments: t("Tournaments")
  };
  const sportMenuSections: SportMenuSection[] = [
    {
      href: "/football",
      kind: "football",
      label: text.football,
      groups: footballCompetitionGroups
    },
    {
      href: "/nfl",
      kind: "links",
      label: "NFL",
      links: [
        { href: "/nfl/matches", label: sportMenuLabels.matches },
        { href: "/nfl/table", label: sportMenuLabels.table },
        { href: "/nfl/teams", label: sportMenuLabels.teams },
        { href: "/nfl/team-stats", label: sportMenuLabels.teamStats }
      ]
    },
    {
      href: "/nba",
      kind: "links",
      label: "NBA",
      links: [
        { href: "/nba/matches", label: sportMenuLabels.matches },
        { href: "/nba/table", label: sportMenuLabels.table },
        { href: "/nba/teams", label: sportMenuLabels.teams },
        { href: "/nba/team-stats", label: sportMenuLabels.teamStats }
      ]
    },
    {
      href: "/tennis",
      kind: "links",
      label: text.tennis,
      links: [
        { href: "/tennis/matches", label: sportMenuLabels.matches },
        { href: "/tennis/players", label: sportMenuLabels.players },
        { href: "/tennis/rankings", label: sportMenuLabels.rankings },
        { href: "/tennis/tournaments", label: sportMenuLabels.tournaments }
      ]
    }
  ];
  const searchItems = useMemo(() => {
    const baseItems = [
      { href: "/", label: text.home, eyebrow: text.home },
      { href: "/widgets", label: widgetsLabel, eyebrow: text.mainNavigation },
      { href: "/football", label: text.football, eyebrow: text.sports },
      { href: "/nfl", label: "NFL", eyebrow: text.sports },
      { href: "/nba", label: "NBA", eyebrow: text.sports },
      { href: "/tennis", label: text.tennis, eyebrow: text.sports },
      { href: "/impressum", label: text.legalNotice, eyebrow: text.mainNavigation }
    ];
    const competitionItems = footballCompetitions.map((competition) => ({
      href: `/football/${competition.slug}`,
      label: competition.name,
      eyebrow: competition.type === "league" ? t("League") : t("Cup")
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
          eyebrow: t("Team")
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
      eyebrow: `${player.tour} ${t("Player")}`
    }));
    const tennisTournamentItems = tennisTournaments.map((tournament) => ({
      href: locale === "de" ? `/tennis/turnier/${tournament.slug}` : `/tennis/tournament/${tournament.slug}`,
      label: tournament.name,
      eyebrow: tournament.category
    }));

    return [...baseItems, ...competitionItems, ...footballTeamItems, ...nflTeamItems, ...nbaTeamItems, ...tennisPlayerItems, ...tennisTournamentItems];
  }, [locale, t, text.football, text.home, text.legalNotice, text.mainNavigation, text.sports, text.tennis, widgetsLabel]);

  return (
    <header className="siteNav">
      <div className="siteNavTop">
        <div className="siteNavInner">
          <Link className="siteNavLogo" href={localizePath("/", siteLocale)}>
            <span className="siteNavLogoMark" aria-hidden="true">
              <img src="/site-icon.png" alt="" />
            </span>
            <span>Residual Sports</span>
          </Link>
          <SiteSearch
            items={searchItems.map((item) => ({ ...item, href: localizePath(item.href, siteLocale) }))}
            locale={siteLocale}
            onNavigate={(href) => router.push(href)}
          />
          <div className="siteNavControls">
            <TimeZoneSelect />
            <LanguageSelect />
          </div>
          <details className="siteMenu" open={siteMenuOpen} ref={siteMenuRef}>
            <summary
              className="siteNavMenuLink"
              onClick={(event) => {
                event.preventDefault();
                setSiteMenuOpen((open) => {
                  if (open) {
                    setActiveSiteMenuSport(null);
                  }

                  return !open;
                });
              }}
            >
              <span aria-hidden="true">☰</span>
              <span>{text.menu}</span>
            </summary>
            <div className="siteMenuPanel">
              <div className="siteMenuSection siteMenuUtilitySection">
                <p>{text.mainNavigation}</p>
                {mainLinks.map((link) => (
                  <Link href={anchorAwarePath(link.href)} key={link.href} onClick={closeSiteMenu}>
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="siteMenuSection siteMenuSportsSection">
                <p>{text.sports}</p>
                <div className="siteMenuSportGrid">
                  {sportMenuSections.map((section) => {
                    const isSportExpanded = activeSiteMenuSport === section.href;

                    return (
                    <section className={`siteMenuSportBlock ${isSportExpanded ? "isExpanded" : ""}`} key={section.href}>
                      <button
                        aria-expanded={isSportExpanded}
                        className="siteMenuSportTitle"
                        onClick={() => setActiveSiteMenuSport((activeSport) => activeSport === section.href ? null : section.href)}
                        type="button"
                      >
                        <span>{section.label}</span>
                        <small aria-hidden="true">⌄</small>
                      </button>
                      {isSportExpanded && section.kind === "football" ? (
                        <div className="siteMenuFootballGroups">
                          <Link className="siteMenuOverviewLink" href={anchorAwarePath(section.href)} onClick={closeSiteMenu}>
                            {sportMenuLabels.overview}
                          </Link>
                          {section.groups.map((group) => (
                            <div className="siteMenuLinkGroup" key={group.id}>
                              <span>{group.label}</span>
                              <div className="siteMenuMiniLinks">
                                {group.competitions.map((competition) => (
                                  <Link
                                    href={localizePath(`/football/${competition.slug}`, siteLocale)}
                                    key={competition.slug}
                                    onClick={closeSiteMenu}
                                  >
                                    <em>{competition.countryCode}</em>
                                    <strong>{competition.name}</strong>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : isSportExpanded && section.kind === "links" ? (
                        <div className="siteMenuSubLinks">
                          <Link href={anchorAwarePath(section.href)} onClick={closeSiteMenu}>
                            {sportMenuLabels.overview}
                          </Link>
                          {section.links.map((link) => (
                            <Link href={anchorAwarePath(link.href)} key={link.href} onClick={closeSiteMenu}>
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </section>
                    );
                  })}
                </div>
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
                <Link className={`topicNavLink ${isActive("/") ? "isActive" : ""}`} href={localizePath("/", siteLocale)}>
                  {text.home}
                </Link>
                {sportLinks.map((link) => (
                  <Link
                    className={`topicNavLink topicNavSportLink ${link.href === "/football" ? "isActive" : isActive(link.href) ? "isActive" : ""}`}
                    href={anchorAwarePath(link.href)}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link className={`topicNavLink ${isActive("/widgets") ? "isActive" : ""}`} href={localizePath("/widgets", siteLocale)}>
                  {widgetsLabel}
                </Link>
              </div>
              <div className="topicNavCompetitionDropdowns" ref={footballDropdownsRef}>
                {footballCompetitionGroups.map((group) => {
                  const groupIsActive = group.competitions.some((competition) => isFootballCompetitionActive(competition.slug));

                  return (
                    <details className="topicNavDropdown" key={group.id} open={openFootballDropdown === group.id}>
                      <summary
                        className={`topicNavLink ${groupIsActive ? "isActive" : ""}`}
                        onClick={(event) => {
                          event.preventDefault();
                          setOpenFootballDropdown((openGroup) => openGroup === group.id ? null : group.id);
                        }}
                      >
                        {group.label}
                      </summary>
                      <div className="topicNavDropdownPanel">
                        {group.competitions.map((competition) => (
                          <Link
                            className={isFootballCompetitionActive(competition.slug) ? "isActive" : ""}
                            href={localizePath(`/football/${competition.slug}`, siteLocale)}
                            key={competition.slug}
                            onClick={closeFootballCompetitionDropdowns}
                          >
                            <span>{competition.countryCode}</span>
                            <strong>{competition.name}</strong>
                          </Link>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <Link className={`topicNavLink ${isActive("/") ? "isActive" : ""}`} href={localizePath("/", siteLocale)}>
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
              <Link className={`topicNavLink ${isActive("/widgets") ? "isActive" : ""}`} href={localizePath("/widgets", siteLocale)}>
                {widgetsLabel}
              </Link>
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
  locale: SiteLocale;
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
        {commonText[locale].search}
      </label>
      <div className="siteSearchField">
        <span aria-hidden="true">⌕</span>
        <input
          autoComplete="off"
          id="site-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={{
            en: "Search team, league, cup",
            de: "Team, Liga oder Pokal suchen",
            es: "Buscar equipo, liga o copa",
            pt: "Pesquisar equipa, liga ou taça",
            fr: "Rechercher équipe, ligue ou coupe",
            it: "Cerca squadra, campionato o coppa"
          }[locale]}
          value={query}
        />
        <button aria-label={commonText[locale].search} type="submit">
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
