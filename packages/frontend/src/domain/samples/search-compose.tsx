import { Button } from "@projet-igsn/design-system/components/ui/button";
import { SearchInput } from "@projet-igsn/design-system/components/ui/search-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { PlusIcon, XIcon } from "lucide-react";
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
import { m } from "#/paraglide/messages.js";

type Drafts = { q?: string; bbox?: string };

type Query = { engine: SearchEngine; value: string };

const PARAM: Record<SearchEngine, keyof Drafts> = {
  text: "q",
  location: "bbox",
};

function seedQueries(active: SearchEngine[], drafts: Drafts): Query[] {
  return active.map((engine) => ({
    engine,
    value: drafts[PARAM[engine]] ?? "",
  }));
}

function RemoveEngineButton({
  engine,
  onRemove,
}: {
  engine: SearchEngine;
  onRemove: () => void;
}) {
  const label = m.search_remove_engine({ engine: engineLabel(engine) });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`text-white hover:bg-white/20 hover:text-white ${
              engine === "text"
                ? "size-14"
                : "absolute end-0 top-3 size-8 -translate-y-1/2"
            }`}
            aria-label={label}
            onClick={onRemove}
          >
            <XIcon aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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
  const [queries, setQueries] = useState(() =>
    seedQueries(initialActive, initialDrafts),
  );

  function selectPrimary(engine: SearchEngine) {
    const kept = queries.find((query) => query.engine === engine);
    setQueries([kept ?? { engine, value: "" }]);
  }

  function setValue(engine: SearchEngine, value: string) {
    setQueries(
      queries.map((query) =>
        query.engine === engine ? { engine, value } : query,
      ),
    );
  }

  function search(next: Query[]) {
    const params: SearchParams = { page: 1, engine: next[0]!.engine };
    for (const { engine, value } of next) params[PARAM[engine]] = value;
    onSearch(params);
  }

  function removeEngine(engine: SearchEngine) {
    const next = queries.filter((query) => query.engine !== engine);
    setQueries(next);
    if (shrunk) search(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    search(queries);
  }

  const open = queries.map((query) => query.engine);
  const hasMap = open.includes("location");
  const addable = ENGINES.filter((engine) => !open.includes(engine));
  const submitButton = (
    <Button
      type="submit"
      size="lg"
      className="ms-auto h-14 px-8 text-base"
      disabled={queries.every((query) => !query.value) && !shrunk}
    >
      {m.search_action()}
    </Button>
  );

  return (
    <form role="search" onSubmit={submit}>
      {shrunk ? null : (
        <div className="flex justify-center">
          <SearchEngineTabs
            engine={queries[0]!.engine}
            onEngineChange={selectPrimary}
          />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {queries.map(({ engine, value }, index) => (
          <div
            key={engine}
            className={
              engine === "text" ? "flex items-center gap-2" : "relative"
            }
          >
            <div className="flex-1">
              {engine === "text" ? (
                <SearchInput
                  value={value}
                  onChange={(event) => setValue(engine, event.target.value)}
                  label={m.samples_search_label()}
                  placeholder={m.search_placeholder()}
                  className="h-14 md:text-base"
                />
              ) : (
                <LazyLocationMap
                  value={value}
                  onChange={(bbox) => setValue(engine, bbox)}
                  collapsible={shrunk}
                />
              )}
            </div>
            {index > 0 ? (
              <RemoveEngineButton
                engine={engine}
                onRemove={() => removeEngine(engine)}
              />
            ) : null}
            {engine === "text" && !hasMap ? submitButton : null}
          </div>
        ))}
      </div>

      {addable.length > 0 || hasMap ? (
        <div className="mt-2 flex items-center gap-4">
          {addable.map((engine) => (
            <Button
              key={engine}
              type="button"
              variant="link"
              className="h-auto gap-1 px-0 py-1 text-white hover:no-underline"
              onClick={() => setQueries([...queries, { engine, value: "" }])}
            >
              <PlusIcon aria-hidden />
              {addEngineLabel(engine)}
            </Button>
          ))}
          {hasMap ? submitButton : null}
        </div>
      ) : null}
    </form>
  );
}
