import type { Sample } from "@projet-igsn/domain/sample/sample";

import { Badge } from "@projet-igsn/design-system/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { matchRanges } from "#/domain/samples/highlight-match.ts";
import { materialPathLabel } from "#/domain/samples/vocabulary-label.ts";

type SampleListItem = Pick<Sample, "igsn" | "name" | "material">;

// Registry name shared with the ::highlight() rule in styles.css.
const SEARCH_HIGHLIGHT = "sample-search-match";

// A DOM Range over the [start, end) slice of a text node.
function toRange(node: Node, [start, end]: [number, number]): Range {
  const range = new Range();
  range.setStart(node, start);
  range.setEnd(node, end);
  return range;
}

// Every match of `query` inside a [data-highlight] element's text node, as Ranges.
function elementRanges(element: Element, query: string): Range[] {
  const node = element.firstChild;
  if (node?.nodeType !== Node.TEXT_NODE) {
    return [];
  }
  return matchRanges(node.textContent ?? "", query).map((match) =>
    toRange(node, match),
  );
}

// Tint the material badge by its root so a category is recognisable at a glance.
// The roots are the fixed MATERIAL_ROOTS set, so this map is exhaustive.
const MATERIAL_BADGE_CLASS: Record<string, string> = {
  rock: "bg-amber-100 text-amber-900",
  sediment: "bg-sky-100 text-sky-900",
  mineral: "bg-purple-100 text-purple-900",
  fossil: "bg-orange-100 text-orange-900",
  synthetic_rock_mineral: "bg-teal-100 text-teal-900",
  extraterrestrial_rock: "bg-indigo-100 text-indigo-900",
};

export function SampleList({
  samples,
  query = "",
}: {
  samples: SampleListItem[];
  query?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Paint search matches with the CSS Custom Highlight API: build a Range over
  // each [data-highlight] text node and register them, leaving the DOM text
  // untouched (no <mark> wrappers). Syncing with CSS.highlights is an external
  // system, so it belongs in an effect.
  useEffect(() => {
    const container = listRef.current;
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
  }, [query, samples]);

  return (
    <ul ref={listRef} className="grid gap-4 sm:grid-cols-2">
      {samples.map(({ igsn, name, material }) => {
        // The public list only carries published samples, which always have an
        // igsn; skip any that somehow don't rather than link to a broken page.
        if (igsn === null) {
          return null;
        }
        const root = material?.split(".")[0];
        return (
          <li key={igsn}>
            <Link
              to="/samples/$igsn"
              params={{ igsn }}
              className="block rounded-lg border p-4 hover:border-sky-800 hover:bg-sky-50"
            >
              <h2 className="font-semibold text-sky-900" data-highlight>
                {name}
              </h2>
              <p
                className="text-muted-foreground mt-1 font-mono text-sm"
                data-highlight
              >
                {igsn}
              </p>
              {root ? (
                <Badge className={`mt-2 ${MATERIAL_BADGE_CLASS[root] ?? ""}`}>
                  {materialPathLabel(root)}
                </Badge>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
