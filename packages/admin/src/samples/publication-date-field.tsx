import { FieldError } from "@projet-igsn/design-system/components/form/field-error";
import { Input } from "@projet-igsn/design-system/components/ui/input";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  earliestEmbargoPublicationDate,
  embargoPublicationDateSchema,
  latestEmbargoPublicationDate,
} from "@projet-igsn/domain/sample/publication/embargo-publication-date";
import { useId } from "react";

import { m } from "#/paraglide/messages.js";

const ERROR_MESSAGE: Record<string, () => string> = {
  publication_date_past: m.publication_date_past,
  publication_date_too_far: m.publication_date_too_far,
};

function publicationDateError(value: string): string | undefined {
  if (!value) return undefined;
  const issue = embargoPublicationDateSchema.safeParse(value).error?.issues[0];
  return issue?.code === "custom"
    ? ERROR_MESSAGE[issue.params?.code]?.()
    : undefined;
}

export function PublicationDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const error = publicationDateError(value);
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{m.publication_date_label()}</Label>
      <Input
        id={id}
        type="date"
        className="sm:max-w-72"
        min={earliestEmbargoPublicationDate()}
        max={latestEmbargoPublicationDate()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldError
        error={error ? { message: error } : undefined}
        errorId={errorId}
      />
    </div>
  );
}
