import { z } from "zod";

import { formatDate } from "../../date/format-date.ts";

export const MAX_EMBARGO_YEARS = 2;

export function earliestEmbargoPublicationDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return formatDate(date);
}

export function latestEmbargoPublicationDate(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + MAX_EMBARGO_YEARS);
  return formatDate(date);
}

export const embargoPublicationDateSchema = z.iso
  .date()
  .refine((date) => date >= earliestEmbargoPublicationDate(), {
    message: "publication date must be after today",
    params: { code: "publication_date_past" },
  })
  .refine((date) => date <= latestEmbargoPublicationDate(), {
    message: `publication date must be within ${MAX_EMBARGO_YEARS} years`,
    params: { code: "publication_date_too_far" },
  });
