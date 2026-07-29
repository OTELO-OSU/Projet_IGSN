import { z } from "zod";

// An ORCID iD: four groups of four digits, the last digit possibly the checksum
// letter X (https://info.orcid.org/ufaqs/what-is-an-orcid-id). We check the
// shape, not the mod-11-2 checksum: enough to keep the ror.org/orcid.org links
// well-formed without hand-rolling the checksum.
export const orcidSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, { message: "invalid ORCID iD" });
