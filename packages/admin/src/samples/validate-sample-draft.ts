import type {
  SampleDraft,
  sampleDraftSchema,
} from "#/samples/sample-draft-schema.ts";

import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";

export type DraftFieldErrors = { fields: Record<string, { message: string }> };

export const validateSampleDraft =
  (schema: typeof sampleDraftSchema) =>
  ({ value }: { value: SampleDraft }): DraftFieldErrors | undefined => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : { fields: sampleDraftFieldErrors(parsed.error.issues) };
  };
