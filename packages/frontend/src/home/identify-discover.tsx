import { EyeIcon, SearchIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";

import { AccountCta } from "./account-cta.tsx";

export function IdentifyDiscover() {
  return (
    <section className="bg-muted relative isolate overflow-hidden">
      {[
        ["left", "left-0"],
        ["right", "right-0"],
      ].map(([side, edge]) => (
        <img
          key={side}
          src={`${import.meta.env.BASE_URL}contour-lines-${side}.svg`}
          alt=""
          className={`pointer-events-none absolute inset-y-0 ${edge} -z-10 hidden h-full w-auto opacity-20 md:block`}
        />
      ))}
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-16 text-center">
        <h2 className="text-primary text-3xl font-bold">
          {m.home_unique_identifier_title()}
        </h2>
        <div className="sm:divide-body mt-10 grid gap-y-10 sm:grid-cols-2 sm:divide-x">
          <div className="text-primary flex flex-col items-center gap-2 px-8">
            <span className="bg-primary text-primary-foreground flex size-22 items-center justify-center rounded-full">
              <SearchIcon aria-hidden className="size-10" />
            </span>
            <h3 className="mt-2 text-2xl font-bold">
              {m.home_identify_title()}
            </h3>
            <p className="text-body text-lg whitespace-pre-line">
              {m.home_identify_text()}
            </p>
          </div>
          <div className="text-secondary flex flex-col items-center gap-2 px-8">
            <span className="bg-secondary flex size-22 items-center justify-center rounded-full text-white">
              <EyeIcon aria-hidden className="size-10" />
            </span>
            <h3 className="mt-2 text-2xl font-bold">
              {m.home_discover_title()}
            </h3>
            <p className="text-body text-lg whitespace-pre-line">
              {m.home_discover_text()}
            </p>
          </div>
        </div>
        <AccountCta className="mt-10 h-12 px-8 text-lg">
          {m.home_record_cta()}
        </AccountCta>
      </div>
    </section>
  );
}
