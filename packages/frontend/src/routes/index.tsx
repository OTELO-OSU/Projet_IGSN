import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SearchCompose } from "#/domain/samples/search-compose.tsx";
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
          <SearchCompose
            initialActive={["text"]}
            initialDrafts={{}}
            onSearch={(params) =>
              navigate({ to: "/search", search: { ...params, page: 1 } })
            }
          />
        </div>
      </div>
    </div>
  );
}
