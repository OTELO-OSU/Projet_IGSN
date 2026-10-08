import { Charter } from "@projet-igsn/design-system/components/ui/charter";

import { m } from "#/paraglide/messages.js";

export function TermsOfUse() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-primary text-4xl font-bold">{m.charter_title()}</h1>
      <p className="text-muted-foreground mt-4 text-lg">
        {m.charter_subtitle()}
      </p>
      <div className="mt-10">
        <Charter m={m} faqHref="/faq" />
      </div>
    </div>
  );
}
