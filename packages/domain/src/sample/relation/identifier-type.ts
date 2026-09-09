import { z } from "zod";

export const IDENTIFIER_TYPES = [
  "igsn",
  "doi",
  "url",
  "ark",
  "arxiv",
  "bibcode",
  "handle",
  "isbn",
  "issn",
  "raid",
  "rrid",
  "swhid",
  "urn",
] as const;

export const identifierTypeSchema = z.enum(IDENTIFIER_TYPES);

export type IdentifierType = z.infer<typeof identifierTypeSchema>;

export const identifierTypeLabel: Record<IdentifierType, string> = {
  ark: "ARK",
  arxiv: "arXiv",
  bibcode: "bibcode",
  doi: "DOI",
  handle: "Handle",
  igsn: "IGSN",
  isbn: "ISBN",
  issn: "ISSN",
  raid: "RAiD",
  rrid: "RRID",
  swhid: "SWHID",
  url: "URL",
  urn: "URN",
};
