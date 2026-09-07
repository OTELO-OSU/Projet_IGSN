import { createFormHook } from "@tanstack/react-form";

import { ComboboxField } from "./combobox-field.tsx";
import { DateField } from "./date-field.tsx";
import { fieldContext, formContext } from "./form-hook-contexts.tsx";
import { HierarchyField } from "./hierarchy-field.tsx";
import { MultiComboboxField } from "./multi-combobox-field.tsx";
import { NumberField } from "./number-field.tsx";
import { SubmitButton } from "./submit-button.tsx";
import { SwitchField } from "./switch-field.tsx";
import { TextField } from "./text-field.tsx";

export const { useAppForm, useTypedAppFormContext } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    ComboboxField,
    MultiComboboxField,
    HierarchyField,
    DateField,
    SwitchField,
  },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});
