import type { Country } from "./country.ts";

// ICU aliases some retired codes to a successor name (e.g. AN -> "Curaçao");
// override those back to the name the list intends. Extend as gaps surface.
const OVERRIDES: Partial<Record<Country, string>> = {
  AN: "Netherlands Antilles",
};

// Localized country name via the platform Intl.DisplayNames, so there is no
// 240-entry label map to maintain (ADR 0015). Falls back to the code when ICU
// cannot resolve it.
export function countryLabel(code: Country, locale: string): string {
  const override = OVERRIDES[code];
  if (override) return override;
  const name = new Intl.DisplayNames([locale], { type: "region" }).of(code);
  return name && name !== code ? name : code;
}
