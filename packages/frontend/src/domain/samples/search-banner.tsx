import type { ReactNode } from "react";

import {
  type SearchEngine,
  SearchEngineTabs,
} from "#/domain/samples/search-engine-tabs.tsx";
import { m } from "#/paraglide/messages.js";

// Hero banner over the search input/map. Once a location search is active it
// shrinks (smaller title, no engine tabs) so the results get the space; the
// shrink is driven from URL state, so it survives a refresh.
export function SearchBanner({
  shrunk,
  engine,
  onEngineChange,
  children,
}: {
  shrunk: boolean;
  engine: SearchEngine;
  onEngineChange: (engine: SearchEngine) => void;
  children: ReactNode;
}) {
  return (
    <div className="bg-sky-700 text-white">
      <div
        className={
          shrunk
            ? "mx-auto max-w-3xl px-6 py-6 text-center"
            : "mx-auto max-w-3xl px-6 py-12 text-center"
        }
      >
        <h1
          className={
            shrunk ? "text-xl font-bold" : "text-2xl font-bold sm:text-3xl"
          }
        >
          {m.search_results_title()}
        </h1>
        <div className="text-foreground mt-6 text-left">
          {shrunk ? null : (
            <SearchEngineTabs engine={engine} onEngineChange={onEngineChange} />
          )}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
