import naturesEn from "../../packages/domain/messages/en.json";

// Nature code -> English label, read straight from the domain message
// catalog the apps render from, so the E2E asserts the exact on-screen text
// (English, per the i18n testing rule) without a second copy to keep in sync.
export function natureLabel(nature: string): string {
  const label = (naturesEn as Record<string, string>)[`nature_${nature}`];
  if (!label) throw new Error(`No English label for nature "${nature}"`);
  return label;
}
