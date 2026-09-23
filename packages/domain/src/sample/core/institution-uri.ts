import { laboratoryLabel, osuLabel } from "../../institutional-group/label.ts";

const OSU_PREFIX = "urn:otelo:osu:";

const LABORATORY_PREFIX = "urn:otelo:laboratory:";

const fromPrefix = (prefix: string) => (uri: string) =>
  uri.startsWith(prefix) ? uri.slice(prefix.length) : null;

export const toOsuUri = (code: string): string => `${OSU_PREFIX}${code}`;

export const toLaboratoryUri = (code: string): string =>
  `${LABORATORY_PREFIX}${code}`;

export const fromOsuUri = fromPrefix(OSU_PREFIX);

export const fromLaboratoryUri = fromPrefix(LABORATORY_PREFIX);

export const archiveUriKind = (uri: string): "osu" | "laboratory" | null =>
  fromOsuUri(uri) != null
    ? "osu"
    : fromLaboratoryUri(uri) != null
      ? "laboratory"
      : null;

export const institutionOrganizations = (
  osu: string | null | undefined,
  laboratory: string | null | undefined,
): { id: string; name: string }[] => [
  ...(osu == null ? [] : [{ id: toOsuUri(osu), name: osuLabel(osu) }]),
  ...(laboratory == null
    ? []
    : [{ id: toLaboratoryUri(laboratory), name: laboratoryLabel(laboratory) }]),
];
