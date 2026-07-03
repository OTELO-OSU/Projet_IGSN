import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./form-hook-contexts.tsx";
import { SubmitButton } from "./submit-button.tsx";
import { TextField } from "./text-field.tsx";

// Typed form kit (see @tanstack/react-form "Form Composition"). `useAppForm`
// yields forms with fields/actions pre-bound to these components, taking
// per-form defaultValues and validators; `withForm` splits a large form into
// composable, type-safe pieces.
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: { TextField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});
