import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-sky-700 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">
          {m.search_landing_title()}
        </h1>
        <div className="text-foreground mt-8 text-left">
          <SearchField
            label={m.samples_search_label()}
            placeholder={m.search_placeholder()}
            buttonLabel={m.search_action()}
            // Landing navigates only on submit (button or Enter), never while
            // typing.
            searchOnType={false}
            onSearch={(value) =>
              navigate({
                to: "/search",
                search: { q: value || undefined, page: 1 },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
