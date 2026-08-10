import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import { type SampleDraft } from "#/samples/sample-draft-schema.ts";

export function useSampleForm() {
  return useTypedAppFormContext({ defaultValues: {} as SampleDraft });
}
