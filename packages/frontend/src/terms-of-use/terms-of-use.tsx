import { Charter } from "@projet-igsn/design-system/components/ui/charter";

import { PageBanner } from "#/page-banner.tsx";
import { m } from "#/paraglide/messages.js";

export function TermsOfUse() {
  return (
    <>
      <PageBanner title={m.charter_title()} subtitle={m.charter_subtitle()} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Charter m={m} faqHref="/faq" />
      </div>
    </>
  );
}
