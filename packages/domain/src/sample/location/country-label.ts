import type { Country } from "./country.ts";

const OVERRIDES: Partial<Record<Country, string>> = {
  AN: "Netherlands Antilles",
};

export function countryLabel(code: Country, locale: string): string {
  const override = OVERRIDES[code];
  if (override) return override;
  const name = new Intl.DisplayNames([locale], { type: "region" }).of(code);
  return name && name !== code ? name : code;
}
