import { useState } from "react";

import { withRequired } from "../../lib/with-required.ts";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldRequired } from "./field-required-context.tsx";
import { FieldRow } from "./field-row.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";
import { RevealField } from "./reveal-field.tsx";

const toNumber = (text: string): number | undefined => {
  const value = Number(text);
  return text === "" || Number.isNaN(value) ? undefined : value;
};

export function TextField({
  label,
  multiline = false,
  number = false,
  disabled = false,
  requiredToPublish = false,
  hint,
  placeholder,
  reveal,
  isFullWidth = false,
}: {
  label: string;
  multiline?: boolean;
  number?: boolean;
  disabled?: boolean;
  requiredToPublish?: boolean;
  hint?: string;
  placeholder?: string;
  reveal?: { label: string; canReveal: boolean };
  isFullWidth?: boolean;
}) {
  const field = useFieldContext<string | number | null | undefined>();
  const hintId = hint ? `${field.name}-hint` : undefined;
  const { error, errorId, ariaProps } = useFieldError({ hintId });
  const isDisabled = useFieldDisabled(disabled);
  const isRequired = useFieldRequired(requiredToPublish);
  const [isBadInput, setIsBadInput] = useState(false);
  const Control = multiline ? Textarea : Input;
  const row = (
    <FieldRow isFullWidth={isFullWidth}>
      <Label htmlFor={field.name}>{withRequired(label, isRequired)}</Label>
      <Control
        id={field.name}
        {...(number ? { type: "number", step: "any" } : {})}
        className={isFullWidth ? undefined : "sm:max-w-72"}
        placeholder={placeholder}
        value={isBadInput ? "" : (field.state.value ?? "")}
        disabled={isDisabled}
        onBlur={() => {
          setIsBadInput(false);
          field.handleBlur();
        }}
        onChange={(event) => {
          if (number && event.target.validity.badInput) {
            setIsBadInput(true);
            return;
          }
          setIsBadInput(false);
          field.handleChange(
            number ? toNumber(event.target.value) : event.target.value,
          );
        }}
        {...ariaProps}
      />
      <FieldError error={error} errorId={errorId} />
      {!error && hint ? (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
    </FieldRow>
  );
  if (!reveal) return row;
  const value = field.state.value;
  return (
    <RevealField
      label={reveal.label}
      canReveal={reveal.canReveal}
      isShown={value != null && value !== ""}
    >
      {row}
    </RevealField>
  );
}
