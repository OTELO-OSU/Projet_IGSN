import { Button } from "@projet-igsn/design-system/components/ui/button";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapIcon } from "lucide-react";
import { useId } from "react";
import { z } from "zod";

import { ResultsMapDialog } from "#/domain/samples/results-map-dialog.tsx";
import { SearchCompose } from "#/domain/samples/search-compose.tsx";
import { PER_PAGE } from "#/domain/samples/search-params.ts";
import {
  getStatsQueryOptions,
  useGetStats,
} from "#/domain/stats/hook/get-stats.ts";
import { Definition } from "#/home/definition.tsx";
import { Hero } from "#/home/hero.tsx";
import { IdentifyDiscover } from "#/home/identify-discover.tsx";
import { IgsnCnrs } from "#/home/igsn-cnrs.tsx";
import { ServiceCards } from "#/home/service-cards.tsx";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    map: z.literal(true).optional().catch(undefined),
  }),
  loader: ({ context }) =>
    context.queryClient.prefetchQuery(getStatsQueryOptions()),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { map } = Route.useSearch();
  const { data: stats } = useGetStats();
  const mapHintId = useId();

  return (
    <div className="flex flex-col gap-24">
      <Hero
        stats={stats}
        statsAction={
          <>
            <Button
              asChild
              variant="link"
              className="h-auto p-0 text-base font-semibold has-[>svg]:px-0"
            >
              <Link
                to="/"
                search={{ map: true }}
                resetScroll={false}
                aria-describedby={mapHintId}
              >
                <MapIcon aria-hidden />
                {m.home_map_all_samples()}
              </Link>
            </Button>
            <p id={mapHintId} className="text-muted-foreground text-sm">
              {m.home_map_all_samples_hint()}
            </p>
          </>
        }
      >
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
      <ResultsMapDialog
        open={!!map}
        onOpenChange={(open) =>
          navigate({
            to: "/",
            resetScroll: false,
            search: { map: open ? true : undefined },
          })
        }
        params={{ page: 1, perPage: PER_PAGE, filters: {} }}
      />
    </div>
  );
}
