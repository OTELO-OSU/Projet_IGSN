import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import { type LocationDraft } from "#/samples/compose-location.ts";

// The sample form, typed down to what the Location tab reads: the flat
// `location.*` draft and the material path (which drives the required marks).
// Each location field component grabs the form from context with this hook.
export function useLocationForm() {
  return useTypedAppFormContext({
    defaultValues: {} as { location: LocationDraft; materialPath: string[] },
  });
}
