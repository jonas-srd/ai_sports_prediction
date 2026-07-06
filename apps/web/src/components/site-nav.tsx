"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSelect } from "@/components/language-select";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath, stripLocalePrefix } from "@/lib/i18n";

export function SiteNav() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const text = commonText[locale];
  const mainLinks = [
    { href: "/", label: text.home },
    { href: "/#sports", label: text.forecasts },
    { href: "/#live-results", label: text.liveResults },
    { href: "/#signals", label: text.newsticker },
    { href: "/tournament-tree", label: text.bracket },
    { href: "/about", label: text.background }
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
  const isActive = (href: string) => {
    const [path] = href.split("#");
    return path === "/" ? currentPath === "/" : currentPath === path;
  };

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
          <Link className="siteNavHighlight" href={anchorAwarePath("/#sports")}>
            <span>{locale === "de" ? "Modelle & Prognosen" : "Models & predictions"}</span>
            <span aria-hidden="true" className="siteNavPlay">
              ▶
            </span>
          </Link>
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
        <nav className="sportschauTopicInner" aria-label={text.mainNavigation}>
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
        </nav>
      </div>
    </header>
  );
}
