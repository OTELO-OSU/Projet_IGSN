import { useTypedAppFormContext } from "@projet-igsn/design-system/components/form/app-form";

import { type AgeFormValues } from "#/samples/age-form.ts";

// The sample form, typed down to the Age tab's loose string values, nested
// under `age`. Each age field component grabs the form from context with this
// hook and addresses its fields as `age.*`.
export function useAgeForm() {
  return useTypedAppFormContext({
    defaultValues: {} as { age: AgeFormValues },
  });
}
