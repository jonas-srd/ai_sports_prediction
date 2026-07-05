"use client";

import Link from "next/link";
import { LanguageSelect } from "@/components/language-select";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath } from "@/lib/i18n";

export function SiteNav() {
  const { locale } = useLocale();
  const text = commonText[locale];
  const topicLinks = [
    { href: "/#sports", label: text.forecasts },
    { href: "/#live-results", label: text.liveResults },
    { href: "/#signals", label: text.newsticker },
    { href: "/tournament-tree", label: text.bracket },
    { href: "/about", label: text.background }
  ];
  const sportLinks = [
    { href: "/#football", label: text.football },
    { href: "/#nfl", label: "NFL" },
    { href: "/#nba", label: "NBA" },
    { href: "/#tennis", label: text.tennis }
  ];
  const moreSportLinks = [
    { href: "/tournament-tree", label: text.bracket },
    { href: "/about", label: text.method }
  ];
  const anchorAwarePath = (href: string) => {
    const [path, hash] = href.split("#");
    return `${localizePath(path, locale)}${hash ? `#${hash}` : ""}`;
  };

  return (
    <header className="siteNav">
      <div className="siteNavTop">
        <div className="siteNavInner">
          <Link className="siteNavMenuLink" href={anchorAwarePath("/#sports")}>
            <span aria-hidden="true">☰</span>
            <span>{text.menu}</span>
          </Link>
          <Link className="siteNavLogo" href={localizePath("/", locale)}>
            <span className="siteNavLogoMark">AI</span>
            <span>AI Sport Prediction</span>
          </Link>
          <Link className="siteNavSearch" href={anchorAwarePath("/#sports")} aria-label={text.search}>
            <span aria-hidden="true">⌕</span>
            <span>{text.search}</span>
          </Link>
          <div className="siteNavControls">
            <TimeZoneSelect />
            <LanguageSelect />
          </div>
        </div>
      </div>
      <div className="sportschauTopicBar">
        <nav className="sportschauTopicInner" aria-label={text.mainNavigation}>
          {topicLinks.map((link) => (
            <Link className="topicNavLink" href={anchorAwarePath(link.href)} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="sportNavBar">
        <nav className="sportNavInner" aria-label={text.sportsNavigation}>
          <span className="sportNavLabel">{text.sports}</span>
          {sportLinks.map((link) => (
            <Link className="sportNavLink" href={anchorAwarePath(link.href)} key={link.href}>
              {link.label}
            </Link>
          ))}
          <details className="sportsMoreMenu">
            <summary>{text.moreSport}</summary>
            <div className="sportsMorePanel">
              {moreSportLinks.map((link) => (
                <Link href={anchorAwarePath(link.href)} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
