import { z } from "zod";

const DOI_URL = /^https:\/\/doi\.org\/10\.\d{4,9}\/\S+$/;

const DOI_PLAIN = /^doi:(10\.\d{4,9}\/\S+)$/i;

const NAVIGABLE_PROTOCOLS = new Set(["http:", "https:"]);

export const isNavigableUrl = (uri: string): boolean =>
  z.url().safeParse(uri).success &&
  NAVIGABLE_PROTOCOLS.has(new URL(uri).protocol);

export const isDoi = (uri: string): boolean =>
  DOI_URL.test(uri) || DOI_PLAIN.test(uri);

export const relationTargetHref = (identifier: string): string | null => {
  const doi = DOI_PLAIN.exec(identifier);
  if (doi) return `https://doi.org/${doi[1]}`;
  return isNavigableUrl(identifier) ? identifier : null;
};
