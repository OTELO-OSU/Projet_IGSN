import type { DraftFieldErrors } from "#/samples/validate-sample-draft.ts";

export function keepTouchedFieldErrors(
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
