export function getOfficialWidgetLogo(value: string | null | undefined): string | null {
  const logo = value?.trim();
  if (!logo || !/^https:\/\//i.test(logo)) {
    return null;
  }

  return logo;
}

export function isOfficialWidgetLogoUrl(value: string | null | undefined): boolean {
  return getOfficialWidgetLogo(value) !== null;
}
