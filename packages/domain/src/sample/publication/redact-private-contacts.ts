import type { Sample } from "../sample.ts";

import { clearContactLinks } from "../contact-link.ts";

export function redactPrivateContacts(sample: Sample): Sample {
  return clearContactLinks({
    ...sample,
    repository: sample.repository && {
      ...sample.repository,
      currentArchiveContactFirstname: null,
      currentArchiveContactLastname: null,
    },
  });
}
