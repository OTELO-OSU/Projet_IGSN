import { createFormHook } from "@tanstack/react-form";

import { ComboboxField } from "./combobox-field.tsx";
import { fieldContext, formContext } from "./form-hook-contexts.tsx";
import { SelectField } from "./select-field.tsx";
import { SubmitButton } from "./submit-button.tsx";
import { TextField } from "./text-field.tsx";

// Typed form kit (see @tanstack/react-form "Form Composition"). `useAppForm`
// yields forms with fields/actions pre-bound to these components, taking
// per-form defaultValues and validators; `withForm` splits a large form into
// composable, type-safe pieces.
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: { TextField, ComboboxField, SelectField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});
