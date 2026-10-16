import type {
  SampleDraft,
  sampleDraftSchema,
} from "#/samples/sample-draft-schema.ts";

import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";

type DraftFieldErrors = { fields: Record<string, { message: string }> };

export const validateDraft =
  (schema: typeof sampleDraftSchema) =>
  ({ value }: { value: SampleDraft }): DraftFieldErrors | undefined => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : { fields: sampleDraftFieldErrors(parsed.error.issues) };
  };

export function touchedFieldErrors(
  result: DraftFieldErrors,
  fieldMeta: Record<string, { isTouched: boolean } | undefined>,
): DraftFieldErrors | undefined {
  const touched = Object.fromEntries(
    Object.entries(result.fields).filter(
      ([name]) => fieldMeta[name]?.isTouched,
    ),
  );
  return Object.keys(touched).length > 0 ? { fields: touched } : undefined;
}
