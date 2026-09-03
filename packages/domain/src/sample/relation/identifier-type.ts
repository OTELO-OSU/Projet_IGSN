import { z } from "zod";

// Declaration order is the picker order: the format-validated types lead.
export const IDENTIFIER_TYPES = [
  "igsn",
  "doi",
  "url",
  "ark",
  "arxiv",
  "bibcode",
  "cstr",
  "ean13",
  "eissn",
  "handle",
  "isbn",
  "issn",
  "istc",
  "lissn",
  "lsid",
  "pmid",
  "purl",
  "raid",
  "rrid",
  "swhid",
  "upc",
  "urn",
  "w3id",
] as const;

export const identifierTypeSchema = z.enum(IDENTIFIER_TYPES);

export type IdentifierType = z.infer<typeof identifierTypeSchema>;

export const identifierTypeLabel: Record<IdentifierType, string> = {
  ark: "ARK",
  arxiv: "arXiv",
  bibcode: "bibcode",
  cstr: "CSTR",
  doi: "DOI",
  ean13: "EAN13",
  eissn: "EISSN",
  handle: "Handle",
  igsn: "IGSN",
  isbn: "ISBN",
  issn: "ISSN",
  istc: "ISTC",
  lissn: "LISSN",
  lsid: "LSID",
  pmid: "PMID",
  purl: "PURL",
  raid: "RAiD",
  rrid: "RRID",
  swhid: "SWHID",
  upc: "UPC",
  url: "URL",
  urn: "URN",
  w3id: "w3id",
};
