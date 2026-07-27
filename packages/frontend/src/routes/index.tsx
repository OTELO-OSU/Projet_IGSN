import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { LazyLocationMap } from "#/domain/samples/lazy-location-map.tsx";
import {
  type SearchEngine,
  SearchEngineTabs,
} from "#/domain/samples/search-engine-tabs.tsx";
import { locationSearch } from "#/domain/samples/search-params.ts";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  // The landing is only a launcher, the search itself runs on /search. Engine
  // choice is local: text submits to /search?q=, location draws a box and
  // submits to /search?engine=location&bbox=.
  const [engine, setEngine] = useState<SearchEngine>("text");

  return (
    <div className="bg-sky-700 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">
          {m.search_landing_title()}
        </h1>
        <div className="text-foreground mt-8 text-left">
          <div className="flex justify-center">
            <SearchEngineTabs engine={engine} onEngineChange={setEngine} />
          </div>
          <div className="mt-4">
            {engine === "text" ? (
              <SearchField
                label={m.samples_search_label()}
                placeholder={m.search_placeholder()}
                buttonLabel={m.search_action()}
                // Landing navigates only on submit (button or Enter), never
                // while typing.
                searchOnType={false}
                onSearch={(value) =>
                  navigate({
                    to: "/search",
                    search: { q: value || undefined, page: 1 },
                  })
                }
              />
            ) : (
              <LazyLocationMap
                onSearch={(bbox) =>
                  navigate({ to: "/search", search: locationSearch(bbox) })
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
