import type { Stats } from "@projet-igsn/domain/stats/model";
import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

import { StatsCounters } from "./stats-counters.tsx";

export function Hero({
  stats,
  children,
}: {
  stats: Stats | undefined;
  children: ReactNode;
}) {
  return (
    <div className="bg-primary/5 relative isolate overflow-hidden">
      <img
        src={`${import.meta.env.BASE_URL}igsn-emblem.svg`}
        alt=""
        className="pointer-events-none absolute top-12 -right-32 -z-10 hidden h-140 w-auto opacity-15 md:block"
      />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <span aria-hidden className="bg-secondary block h-1 w-12" />
        <h1 className="text-primary mt-4 text-4xl font-bold sm:text-5xl">
          {m.search_landing_title()}
        </h1>
        <p className="text-body mt-4 max-w-md text-lg whitespace-pre-line">
          {m.home_subtitle()}
        </p>
        <div className="mt-4 max-w-3xl">{children}</div>
        {stats ? <StatsCounters {...stats} /> : null}
      </div>
    </div>
  );
}
