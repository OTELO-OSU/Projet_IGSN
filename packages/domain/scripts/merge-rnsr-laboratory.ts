import { z } from "zod";

import { type Laboratory } from "../src/institutional-group/laboratory.ts";
import { PINNED_LABORATORY_NAMES } from "./pinned-rnsr-names.ts";

export const rnsrRecordSchema = z.object({
  numero_national_de_structure: z.string(),
  libelle: z.string(),
  sigle: z.string().nullable(),
  label_numero: z.array(z.string()).nullable(),
  numero_de_structure_historique: z.array(z.string()).nullable(),
});

export type RnsrRecord = z.infer<typeof rnsrRecordSchema>;

const CODE = String.raw`(?:UMR|UAR|UMS|IRL|UPR|FR|EA|USR|UR) ?\d+`;
const LEADING_CODE = new RegExp(`^${CODE} - `);
const TRAILING_CODE = new RegExp(
  String.raw`(?: - ${CODE}| \(${CODE}\)| ${CODE})$`,
);

export function stripCodeMentions(libelle: string, acronym: string): string {
  const withoutTrailingCode = libelle.replace(TRAILING_CODE, "");
  if (!LEADING_CODE.test(withoutTrailingCode)) return withoutTrailingCode;

  const rest = withoutTrailingCode.replace(LEADING_CODE, "");
  const acronymPrefix = `${acronym} - `.toLowerCase();
  return rest.toLowerCase().startsWith(acronymPrefix)
    ? rest.slice(acronymPrefix.length)
    : rest;
}

function toComparable(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

export function refreshName(
  name: string,
  libelle: string,
  acronym: string,
): string {
  const refreshed = stripCodeMentions(libelle, acronym);
  return toComparable(refreshed) === toComparable(name) ? name : refreshed;
}

export function mergeRnsrLaboratory(
  current: Laboratory,
  record: Pick<RnsrRecord, "libelle"> | undefined,
): Laboratory {
  const pinned = [current.code, ...(current.formerCodes ?? [])].some((code) =>
    PINNED_LABORATORY_NAMES.has(code),
  );
  if (record === undefined || pinned) return current;

  const name = refreshName(current.name, record.libelle, current.acronym);
  return name === current.name ? current : { ...current, name };
}
