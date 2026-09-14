import type { Hierarchy } from "../../lib/hierarchy.ts";

import { withRequired } from "../../lib/with-required.ts";
import { HierarchyInput } from "../ui/hierarchy-input.tsx";
import { Label } from "../ui/label.tsx";
import {
  useFieldDisabled,
  useFieldDisabledRule,
} from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { FieldRow } from "./field-row.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

type HierarchyFieldProps = {
  label: string;
  hierarchy: Hierarchy;
  translate: (code: string) => string;
  requiredToPublish?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  stopLabel: string;
  removeLabel: (label: string) => string;
  mustRefineText: string;
  canRefineText: string;
  disabled?: boolean;
};

const toPath = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

export function HierarchyField({
  label,
  translate,
  requiredToPublish,
  mustRefineText,
  canRefineText,
  disabled,
  ...hierarchyInput
}: HierarchyFieldProps) {
  const field = useFieldContext<string[]>();
  const hintId = `${field.name}-hint`;
  const { error, errorId, ariaProps } = useFieldError({
    waitForTouch: true,
    hintId,
  });
  const isDisabled = useFieldDisabled(disabled);
  const isLevelDisabled = useFieldDisabledRule();

  return (
    <FieldRow format={(value) => toPath(value).map(translate).join(" / ")}>
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish === true)}
      </Label>
      <HierarchyInput
        id={field.name}
        value={field.state.value ?? []}
        onChange={field.handleChange}
        onBlur={field.handleBlur}
        disabled={isDisabled}
        isLevelLocked={(depth) => isLevelDisabled(`${field.name}[${depth}]`)}
        hint={{ id: hintId, mustRefineText, canRefineText }}
        translate={translate}
        {...ariaProps}
        {...hierarchyInput}
      />
      <FieldError error={error} errorId={errorId} />
    </FieldRow>
  );
}
