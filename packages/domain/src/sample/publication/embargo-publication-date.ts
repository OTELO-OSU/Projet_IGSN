import { z } from "zod";

import { dateFromToday } from "../../date/date-from-today.ts";

export const MAX_EMBARGO_YEARS = 2;

export const earliestEmbargoPublicationDate = (): string => dateFromToday(0, 1);

export const latestEmbargoPublicationDate = (): string =>
  dateFromToday(MAX_EMBARGO_YEARS, 0);

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
