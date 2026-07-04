"use client";

import Link from "next/link";
import { LanguageSelect } from "@/components/language-select";
import { TimeZoneSelect } from "@/components/time-zone-select";
import { useLocale } from "@/components/locale-provider";
import { commonText, localizePath } from "@/lib/i18n";

export function SiteNav() {
  const { locale } = useLocale();
  const text = commonText[locale];
  const links = [
    { href: "/", label: text.home },
    { href: "/about", label: text.about },
    { href: "/tournament-tree", label: text.bracket },
    { href: "/matches", label: text.matches },
    { href: "/analytics", label: text.analytics },
    { href: "/impressum", label: text.legalNotice }
  ];

  return (
    <header className="siteNav">
      <div className="siteNavInner">
        <Link className="siteNavLogo" href={localizePath("/", locale)}>AI Sport Prediction</Link>
        <nav className="siteNavLinks">
          {links.map((link) => (
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
    </header>
  );
}

