"use client";

import Link from "next/link";
import { LanguageSelect } from "@/components/language-select";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath } from "@/lib/i18n";

export function SiteNav() {
  const { locale } = useLocale();
  const text = commonText[locale];
  const primaryLinks = [
    { href: "/", label: text.home },
    { href: "/matches", label: text.matches },
    { href: "/analytics", label: text.analytics },
    { href: "/about", label: text.about }
  ];
  const sportLinks = [
    { href: "/#football", label: text.football },
    { href: "/#nfl", label: "NFL" },
    { href: "/#nba", label: "NBA" },
    { href: "/#tennis", label: text.tennis },
    { href: "/tournament-tree", label: text.bracket }
  ];

  return (
    <header className="siteNav">
      <div className="siteNavTop">
        <div className="siteNavInner">
          <Link className="siteNavLogo" href={localizePath("/", locale)}>
            <span className="siteNavLogoMark">AI</span>
            <span>AI Sport Prediction</span>
          </Link>
          <nav className="siteNavLinks" aria-label={text.mainNavigation}>
            {primaryLinks.map((link) => (
              <Link href={localizePath(link.href, locale)} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="siteNavControls">
            <TimeZoneSelect />
            <LanguageSelect />
          </div>
        </div>
      </div>
      <div className="sportNavBar">
        <nav className="sportNavInner" aria-label={text.sportsNavigation}>
          {sportLinks.map((link) => (
            <Link className="sportNavLink" href={`${localizePath(link.href.split("#")[0], locale)}${link.href.includes("#") ? `#${link.href.split("#")[1]}` : ""}`} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
