import { z } from "zod";

import { type RnsrRecord, rnsrRecordSchema } from "./merge-rnsr-laboratory.ts";

const RNSR_EXPORT_URL =
  "https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-structures-recherche-publiques-actives/exports/json";

export async function fetchRnsrRecords(): Promise<RnsrRecord[]> {
  const response = await fetch(RNSR_EXPORT_URL, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`RNSR responded ${response.status} ${response.statusText}`);
  }
  return z.array(rnsrRecordSchema).parse(await response.json());
}
