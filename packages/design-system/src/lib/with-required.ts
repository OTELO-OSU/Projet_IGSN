// Mark a field required with a trailing "*" once the condition holds, matching
// the static "Type *" markers (accessibility rule: required shown in text).
export const withRequired = (label: string, required: boolean): string =>
  required ? `${label} *` : label;
