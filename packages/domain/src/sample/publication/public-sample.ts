import type { PublicSample } from "../sample-validator.ts";
import type { Sample } from "../sample.ts";

import { redactArchiveContacts } from "./redact-archive-contacts.ts";
import { toWithdrawnSample } from "./withdrawn-sample.ts";

export function toPublicSample(sample: Sample): PublicSample {
  switch (sample.status) {
    case "published":
      return { ...redactArchiveContacts(sample), status: "published" };
    case "withdrawn":
      return toWithdrawnSample(sample);
    case "draft":
    case "tombstone":
      throw new Error(`A ${sample.status} sample has no public view`);
  }
}
