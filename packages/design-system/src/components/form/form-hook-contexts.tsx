import { createFormHookContexts } from "@tanstack/react-form";

// Form contexts shared by the field/button components. The composed
// `useAppForm` kit that binds them together lives in form-hook.testkit.tsx,
// since only the specs need it.
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
