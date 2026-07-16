import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import { type DescriptionDraft } from "#/samples/compose-description.ts";

// The sample form, typed down to what the Description tab reads: the flat
// `description.*` draft. Each description field component grabs the form from
// context with this hook (same seam as use-location-form.ts).
export function useDescriptionForm() {
  return useTypedAppFormContext({
    defaultValues: {} as { description: DescriptionDraft },
  });
}
