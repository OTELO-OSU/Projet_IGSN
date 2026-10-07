import { normalizeSearch } from "@projet-igsn/domain/text/normalize-search";

export type FaqItem = {
  value: string;
  title: string;
  ordered: boolean;
  entries: string[];
};

export type FaqMatch = Omit<FaqItem, "entries"> & {
  entries: { position: number; text: string }[];
};

function containsAll(text: string, words: string[]): boolean {
  const normalized = normalizeSearch(text);
  return words.every((word) => normalized.includes(word));
}

export function filterFaq(items: FaqItem[], query: string): FaqMatch[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return items.flatMap((item) => {
    const all = item.entries.map((text, index) => ({
      position: index + 1,
      text,
    }));
    const entries = containsAll(item.title, words)
      ? all
      : all.filter(({ text }) => containsAll(text, words));
    return entries.length > 0 ? [{ ...item, entries }] : [];
  });
}
