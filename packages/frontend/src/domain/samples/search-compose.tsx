import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { XIcon } from "lucide-react";
import { useState } from "react";

import type { SearchParams } from "#/domain/samples/search-params.ts";

import { LazyLocationMap } from "#/domain/samples/lazy-location-map.tsx";
import {
  ENGINES,
  type SearchEngine,
  SearchEngineTabs,
  addEngineLabel,
  engineLabel,
} from "#/domain/samples/search-engine-tabs.tsx";
import { SearchHelp } from "#/domain/samples/search-help.tsx";
import { SearchTextInput } from "#/domain/samples/search-text-input.tsx";
import { m } from "#/paraglide/messages.js";

type Drafts = { q?: string; bbox?: string };

// `active[0]` is the primary engine, the one the tabs point at.
export function SearchCompose({
  initialActive,
  initialDrafts,
  onSearch,
  shrunk = false,
}: {
  initialActive: SearchEngine[];
  initialDrafts: Drafts;
  onSearch: (params: SearchParams) => void;
  shrunk?: boolean;
}) {
  const [active, setActive] = useState(initialActive);
  const [drafts, setDrafts] = useState<Drafts>(initialDrafts);

  // Product decision: switching the primary drops the other engines.
  function selectPrimary(engine: SearchEngine) {
    setActive([engine]);
    setDrafts(engine === "location" ? { bbox: drafts.bbox } : { q: drafts.q });
  }

  function addEngine(engine: SearchEngine) {
    setActive([...active, engine]);
  }

  function removeEngine(engine: SearchEngine) {
    setActive(active.filter((e) => e !== engine));
    setDrafts(
      engine === "location"
        ? { ...drafts, bbox: undefined }
        : { ...drafts, q: undefined },
    );
  }

  // Param presence is what tells the URL an engine is open, so an unfilled one
  // still writes its param.
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params: SearchParams = { page: 1 };
    if (active.includes("text")) params.q = drafts.q ?? "";
    if (active.includes("location")) params.bbox = drafts.bbox ?? "";
    // Only carried when it is not derivable from the params themselves.
    if (active.length > 1 && active[0] !== ENGINES[0])
      params.engine = active[0];
    onSearch(params);
  }

  const isEmpty =
    !(active.includes("text") && drafts.q) &&
    !(active.includes("location") && drafts.bbox);

  // A map row is too tall to hold the button inline, so it falls below instead.
  const actions = (
    <div className="flex items-center gap-2">
      {ENGINES.filter((engine) => !active.includes(engine)).map((engine) => (
        <Button
          key={engine}
          type="button"
          variant="outline"
          onClick={() => addEngine(engine)}
        >
          {addEngineLabel(engine)}
        </Button>
      ))}
      {/* An empty submit clears a search, but on the landing it would just dump
          the reader on an empty page. */}
      <Button type="submit" disabled={isEmpty && !shrunk}>
        {m.search_action()}
      </Button>
    </div>
  );

  return (
    <form role="search" onSubmit={submit}>
      <div className="flex justify-center">
        {/* active is never empty: seeded with >=1, remove only drops non-primary. */}
        <SearchEngineTabs engine={active[0]!} onEngineChange={selectPrimary} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {active.map((engine, index) => (
          <div
            key={engine}
            className={
              engine === "text"
                ? "flex items-center gap-2"
                : "flex items-start gap-2"
            }
          >
            <div className="flex-1">
              {engine === "text" ? (
                <SearchTextInput
                  value={drafts.q ?? ""}
                  onChange={(q) => setDrafts({ ...drafts, q })}
                  label={m.samples_search_label()}
                  placeholder={m.search_placeholder()}
                />
              ) : (
                <LazyLocationMap
                  value={drafts.bbox}
                  onChange={(bbox) => setDrafts({ ...drafts, bbox })}
                  compact={shrunk}
                />
              )}
            </div>
            {engine === "text" ? <SearchHelp /> : null}
            {index > 0 ? (
              // The bare ✕ does not say what it drops, so show its name too.
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={m.search_remove_engine({
                        engine: engineLabel(engine),
                      })}
                      onClick={() => removeEngine(engine)}
                    >
                      <XIcon aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {m.search_remove_engine({ engine: engineLabel(engine) })}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {engine === "text" ? actions : null}
          </div>
        ))}
      </div>

      {active.includes("text") ? null : <div className="mt-4">{actions}</div>}
    </form>
  );
}
