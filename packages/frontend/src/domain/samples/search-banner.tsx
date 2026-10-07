import type { ReactNode } from "react";

import { m } from "#/paraglide/messages.js";

export function SearchBanner({ children }: { children: ReactNode }) {
  return (
    <div className="bg-primary/5">
      <div className="mx-auto max-w-6xl px-6 py-6 text-center">
        <h1 className="text-primary text-xl font-bold">
          {m.search_results_title()}
        </h1>
        <div className="mt-6 text-left">{children}</div>
      </div>
    </div>
  );
}
