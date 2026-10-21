import {
  exactRanges,
  matchRanges,
} from "@projet-igsn/domain/sample/search/highlight-match";
import { type DependencyList, type RefObject, useEffect } from "react";

const SEARCH_HIGHLIGHT = "sample-search-match";

function toRange(node: Node, [start, end]: [number, number]): Range {
  const range = new Range();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

function elementRanges(element: Element, query: string): Range[] {
  const node = element.firstChild;
  if (node?.nodeType !== Node.TEXT_NODE) {
    return [];
  }
  const text = node.textContent ?? "";
  const ranges =
    element.getAttribute("data-highlight") === "exact"
      ? exactRanges(text, query)
      : matchRanges(text, query);
  return ranges.map((match) => toRange(node, match));
}

export function useSearchHighlight(
  containerRef: RefObject<Element | null>,
  query: string,
  rendered: DependencyList,
): void {
  useEffect(() => {
    const container = containerRef.current;
    const trimmed = query.trim();
    if (!container || !trimmed || !("highlights" in CSS)) {
      return;
    }

    const ranges = [...container.querySelectorAll("[data-highlight]")].flatMap(
      (element) => elementRanges(element, trimmed),
    );
    const highlight = CSS.highlights.get(SEARCH_HIGHLIGHT) ?? new Highlight();
    CSS.highlights.set(SEARCH_HIGHLIGHT, highlight);
    ranges.forEach((range) => highlight.add(range));

    return () => {
      ranges.forEach((range) => highlight.delete(range));
    };
  }, [containerRef, query, ...rendered]);
}
