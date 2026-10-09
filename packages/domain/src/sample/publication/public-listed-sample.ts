import type { PublicListedSample } from "../sample-validator.ts";
import type { Sample } from "../sample.ts";

import { redactPrivateContacts } from "./redact-private-contacts.ts";

export function toPublicListedSample(sample: Sample): PublicListedSample {
  const {
    synchronizationStatus: _status,
    synchronizationError: _error,
    ...listed
  } = redactPrivateContacts(sample);
  return listed;
}
