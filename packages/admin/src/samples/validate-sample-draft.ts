import type {
  SampleDraft,
  sampleDraftSchema,
} from "#/samples/sample-draft-schema.ts";

import { sampleDraftFieldErrors } from "#/samples/sample-draft-field-errors.ts";

export type DraftFieldErrors = { fields: Record<string, { message: string }> };

export const validateSampleDraft =
  (schema: typeof sampleDraftSchema) =>
  ({
    value,
    formApi,
  }: {
    value: SampleDraft;
    formApi: {
      state: {
        fieldMeta: Partial<Record<string, { isTouched: boolean }>>;
      };
    };
  }): DraftFieldErrors | undefined => {
    const parsed = schema.safeParse(value);
    return parsed.success
      ? undefined
      : {
          fields: sampleDraftFieldErrors(
            parsed.error.issues,
            (name) => formApi.state.fieldMeta[name]?.isTouched ?? false,
          ),
        };
  };
