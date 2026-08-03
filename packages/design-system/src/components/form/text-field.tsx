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

// The form kit's base text control. `number` turns it into a numeric input
// owning the string/number conversion; plain text fields store the text itself.
export function TextField({
  label,
  multiline = false,
  number = false,
  disabled = false,
  // Marks the label with a trailing "*"; never the native required attribute,
  // a draft must save without the value.
  requiredToPublish = false,
}: {
  label: string;
  multiline?: boolean;
  number?: boolean;
  disabled?: boolean;
  requiredToPublish?: boolean;
}) {
  const field = useFieldContext<string | number | null | undefined>();
  const { error, errorId, ariaProps } = useFieldError();
  const isDisabled = useFieldDisabled(disabled);
  const [isBadInput, setIsBadInput] = useState(false);
  const Control = multiline ? Textarea : Input;
  return (
    <div className="grid gap-2">
      <Label htmlFor={field.name}>
        {withRequired(label, requiredToPublish)}
      </Label>
      <Control
        id={field.name}
        // step="any" allows decimals.
        {...(number ? { type: "number", step: "any" } : {})}
        // A nullish stored value reads as an empty input, so callers never
        // convert. A number feeds React's number-input path unstringified,
        // which keeps intermediate text like "3." while typing.
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
    </div>
  );
}
