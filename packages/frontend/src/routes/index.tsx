import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { SearchCompose } from "#/domain/samples/search-compose.tsx";
import {
  getStatsQueryOptions,
  useGetStats,
} from "#/domain/stats/hook/get-stats.ts";
import { Definition } from "#/home/definition.tsx";
import { Hero } from "#/home/hero.tsx";
import { IdentifyDiscover } from "#/home/identify-discover.tsx";
import { IgsnCnrs } from "#/home/igsn-cnrs.tsx";
import { ServiceCards } from "#/home/service-cards.tsx";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(getStatsQueryOptions()),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { data: stats } = useGetStats();

  return (
    <div className="flex flex-col gap-24">
      <Hero stats={stats}>
        <SearchCompose
          initialActive={["text"]}
          initialDrafts={{}}
          onSearch={(params) =>
            navigate({ to: "/search", search: { ...params, page: 1 } })
          }
        />
      </Hero>
      <Definition />
      <ServiceCards />
      <IgsnCnrs />
      <IdentifyDiscover />
    </div>
  );
}
