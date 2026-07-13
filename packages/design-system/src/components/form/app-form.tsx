import { createFormHook } from "@tanstack/react-form";

import { ComboboxField } from "./combobox-field.tsx";
import { fieldContext, formContext } from "./form-hook-contexts.tsx";
import { NumberField } from "./number-field.tsx";
import { SubmitButton } from "./submit-button.tsx";
import { TextField } from "./text-field.tsx";

// Typed form kit (see @tanstack/react-form "Form Composition"). `useAppForm`
// yields forms with fields/actions pre-bound to these components, taking
// per-form defaultValues and validators; `useTypedAppFormContext` lets a child
// rendered inside `form.AppForm` grab that form, typed by the same options.
export const { useAppForm, useTypedAppFormContext } = createFormHook({
  fieldComponents: { TextField, ComboboxField, NumberField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});
