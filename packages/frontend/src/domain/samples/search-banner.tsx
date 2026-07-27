import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

export function SearchBanner({
  shrunk,
  children,
}: {
  shrunk: boolean;
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
        <div className="text-foreground mt-6 text-left">{children}</div>
      </div>
    </div>
  );
}
