"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/locale-provider";
import { translateText } from "@/lib/site-translations";
import { localizePath } from "@/lib/i18n";

const EXCLUDED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);
const ORIGINAL_TEXT = new WeakMap<Text, string>();
const ORIGINAL_PLACEHOLDER = new WeakMap<HTMLInputElement, string>();
const ORIGINAL_ARIA_LABEL = new WeakMap<HTMLElement, string>();

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
          if (mutation.type === "characterData" && mutation.target.parentElement) {
            const textNode = mutation.target as Text;
            ORIGINAL_TEXT.set(textNode, textNode.textContent ?? "");
            translateElement(mutation.target.parentElement, siteLocale);
            continue;
          }
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translatePublicContent(node as HTMLElement, siteLocale);
            } else if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
              translateElement(node.parentElement, siteLocale);
            }
          }
        }
        observer?.observe(root, { characterData: true, childList: true, subtree: true });
      });
      observer?.observe(root, { characterData: true, childList: true, subtree: true });
    };

    // Effects run after hydration. Translate on the next frame so localized routes do not
    // briefly show English; the observer handles Suspense content that arrives afterwards.
    const frame = window.requestAnimationFrame(start);
    return () => {
      window.cancelAnimationFrame(frame);
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
    const textNode = node as Text;
    const original = ORIGINAL_TEXT.get(textNode) ?? node.textContent;
    ORIGINAL_TEXT.set(textNode, original);
    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    const translated = translateText(original, locale);
    const nextText = `${leading}${translated}${trailing}`;
    if (node.textContent !== nextText) node.textContent = nextText;
  });

  if (element instanceof HTMLInputElement && element.placeholder) {
    const original = ORIGINAL_PLACEHOLDER.get(element) ?? element.placeholder;
    ORIGINAL_PLACEHOLDER.set(element, original);
    element.placeholder = translateText(original, locale);
  }
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) {
    const original = ORIGINAL_ARIA_LABEL.get(element) ?? ariaLabel;
    ORIGINAL_ARIA_LABEL.set(element, original);
    element.setAttribute("aria-label", translateText(original, locale));
  }

  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute("href");
    if (href?.startsWith("/") && !href.startsWith("/api/") && !href.startsWith("/_next/") && !href.startsWith("/admin")) {
      const [path, hash] = href.split("#");
      element.setAttribute("href", `${localizePath(path, locale)}${hash ? `#${hash}` : ""}`);
    }
  }
}
