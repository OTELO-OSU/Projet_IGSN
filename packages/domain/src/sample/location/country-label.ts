import type { Country } from "./country.ts";

const OVERRIDES: Partial<Record<Country, string>> = {
  AN: "Netherlands Antilles",
};

const displayNames = new Map<string, Intl.DisplayNames>();

export function countryLabel(code: Country, locale: string): string {
  const override = OVERRIDES[code];
  if (override) return override;
  let names = displayNames.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([locale], { type: "region" });
    displayNames.set(locale, names);
  }
  const name = names.of(code);
  return name && name !== code ? name : code;
}
