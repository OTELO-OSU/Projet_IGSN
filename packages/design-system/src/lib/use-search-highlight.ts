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
    if (!container || !("highlights" in CSS)) {
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      CSS.highlights.delete(SEARCH_HIGHLIGHT);
      return;
    }

    const ranges = [...container.querySelectorAll("[data-highlight]")].flatMap(
      (element) => elementRanges(element, trimmed),
    );
    CSS.highlights.set(SEARCH_HIGHLIGHT, new Highlight(...ranges));

    return () => {
      CSS.highlights.delete(SEARCH_HIGHLIGHT);
    };
  }, [containerRef, query, ...rendered]);
}
