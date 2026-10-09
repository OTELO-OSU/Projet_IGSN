import type { PublicSample } from "../sample-validator.ts";
import type { Sample } from "../sample.ts";

import { redactPrivateContacts } from "./redact-private-contacts.ts";
import { toWithdrawnSample } from "./withdrawn-sample.ts";

export function toPublicSample(sample: Sample): PublicSample {
  switch (sample.status) {
    case "published": {
      const {
        synchronizationStatus: _status,
        synchronizationError: _error,
        ...published
      } = redactPrivateContacts(sample);
      return {
        ...published,
        status: "published",
        canContactArchive:
          sample.repository?.currentArchiveContactEmail != null,
      };
    }
    case "withdrawn":
    case "embargo":
      return toWithdrawnSample(sample);
    case "draft":
    case "tombstone":
      throw new Error(`A ${sample.status} sample has no public view`);
  }
}
