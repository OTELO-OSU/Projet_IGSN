import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import { type ConditionDraft } from "#/samples/compose-condition.ts";

// The sample form, typed down to what the Condition tab reads: the flat
// `condition.*` draft. Each condition field component grabs the form from
// context with this hook (same seam as use-description-form.ts).
export function useConditionForm() {
  return useTypedAppFormContext({
    defaultValues: {} as { condition: ConditionDraft },
  });
}
