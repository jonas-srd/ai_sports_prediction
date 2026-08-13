"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";
import { translateText } from "@/lib/site-translations";
import { localizePath } from "@/lib/i18n";

const EXCLUDED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);

export function PublicSiteTranslator() {
  const { siteLocale } = useLocale();

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".publicSite");
    if (!root) return;

    let observer: MutationObserver | null = null;
    const start = () => {
      translatePublicContent(root, siteLocale);
      observer = new MutationObserver((mutations) => {
        observer?.disconnect();
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translatePublicContent(node as HTMLElement, siteLocale);
            } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
              translateElement(node.parentElement, siteLocale);
            }
          }
        }
        observer?.observe(root, { childList: true, subtree: true });
      });
      observer?.observe(root, { childList: true, subtree: true });
    };

    // Wait until the rewritten server page and its nested Suspense boundaries have hydrated.
    // Direct DOM localization before that point would make React compare translated text
    // with the original server response.
    const timeout = window.setTimeout(start, 2000);
    return () => {
      window.clearTimeout(timeout);
      observer?.disconnect();
    };
  }, [siteLocale]);

  return null;
}

function translatePublicContent(root: HTMLElement, locale: Parameters<typeof translateText>[1]) {
  translateElement(root, locale);
  root.querySelectorAll<HTMLElement>("*").forEach((element) => translateElement(element, locale));
}

function translateElement(element: HTMLElement, locale: Parameters<typeof translateText>[1]) {
  if (EXCLUDED_TAGS.has(element.tagName) || element.closest("[data-no-auto-translate]")) return;

  element.childNodes.forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) return;
    const original = node.textContent;
    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    const translated = translateText(original, locale);
    if (translated !== original.trim().replace(/\s+/g, " ")) node.textContent = `${leading}${translated}${trailing}`;
  });

  if (element instanceof HTMLInputElement && element.placeholder) {
    element.placeholder = translateText(element.placeholder, locale);
  }
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) element.setAttribute("aria-label", translateText(ariaLabel, locale));

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute("href");
    if (href?.startsWith("/") && !href.startsWith("/api/") && !href.startsWith("/_next/") && !href.startsWith("/admin")) {
      const [path, hash] = href.split("#");
      element.setAttribute("href", `${localizePath(path, locale)}${hash ? `#${hash}` : ""}`);
    }
  }
}
