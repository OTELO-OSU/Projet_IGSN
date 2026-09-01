import type { Sample } from "../sample.ts";

export function redactArchiveContacts(sample: Sample): Sample {
  if (!sample.repository) return sample;
  return {
    ...sample,
    repository: {
      ...sample.repository,
      currentArchiveContact: null,
      originalArchiveContact: null,
    },
  };
}
