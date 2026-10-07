import { m } from "#/paraglide/messages.js";

import { PhotoSlideshow } from "./photo-slideshow.tsx";

export function IgsnCnrs() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-start gap-8 px-6 lg:grid-cols-3">
      <div>
        <span aria-hidden className="bg-tertiary block h-1 w-12" />
        <h2 className="text-primary mt-4 text-3xl font-bold">
          {m.home_igsn_cnrs_title()}
        </h2>
        <p className="text-body mt-4 leading-relaxed">
          {m.home_igsn_cnrs_text()}
        </p>
      </div>
      <div className="lg:col-span-2">
        <PhotoSlideshow />
      </div>
    </section>
  );
}
