import { useState } from "react";

import { withRequired } from "../../lib/with-required.ts";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { useFieldDisabled } from "./field-disabled-context.tsx";
import { FieldError, useFieldError } from "./field-error.tsx";
import { useFieldContext } from "./form-hook-contexts.tsx";

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
}: {
  label: string;
  multiline?: boolean;
  number?: boolean;
  disabled?: boolean;
  requiredToPublish?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  const field = useFieldContext<string | number | null | undefined>();
  const hintId = hint ? `${field.name}-hint` : undefined;
  const { error, errorId, ariaProps } = useFieldError({ hintId });
  const isDisabled = useFieldDisabled(disabled);
  const [isBadInput, setIsBadInput] = useState(false);
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <Control
        id={field.name}
        {...(number ? { type: "number", step: "any" } : {})}
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
      {error ? (
        <FieldError error={error} errorId={errorId} />
      ) : (
        <p id={hintId} className="text-muted-foreground min-h-5 text-sm">
          {hint}
        </p>
      )}
    </div>
  );
}
