import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

import {
  LABORATORIES,
  type Laboratory,
} from "../src/institutional-group/laboratory.ts";
import { ORGANIZATIONS } from "../src/institutional-group/organization.ts";
import { OSUS } from "../src/institutional-group/osu.ts";
import { emitLaboratories, emitOsus } from "./emit-institutions.ts";
import { fetchRnsrRecords } from "./fetch-rnsr-records.ts";
import { type Exported, mergeInstitutions } from "./merge-institutions.ts";
import { normalizeCode } from "./merge-rnsr.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

function readRows(
  file: string,
  required: readonly string[],
): Record<string, string>[] {
  const { data, errors, meta } = Papa.parse<Record<string, string>>(
    readFileSync(join(HERE, "../../../sync-data", file), "utf8"),
    { header: true, skipEmptyLines: true },
  );

  const [failure] = errors;
  if (failure) {
    throw new Error(
      `${file} line ${(failure.row ?? 0) + 2}: ${failure.message}`,
    );
  }

  for (const column of required) {
    if (!meta.fields?.includes(column)) {
      throw new Error(`${file} has no ${column} column`);
    }
  }

  return data;
}

function assertKeys(kind: string, values: readonly string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) throw new Error(`missing ${kind}`);
    if (seen.has(value)) throw new Error(`duplicate ${kind} "${value}"`);
    seen.add(value);
  }
}

const KNOWN_RORS = new Set(
  ORGANIZATIONS.map((organization) => organization.ror),
);

const rorById = new Map<string, string>();
for (const row of readRows("institution_organisation.csv", ["#ID", "ror"])) {
  const id = row["#ID"] ?? "";
  const ror = row.ror ?? "";
  if (ror) rorById.set(id, ror);
  else process.stderr.write(`skipping organization ${id} without a ROR\n`);
}

const osuRows = readRows("institution_osu.csv", ["#ID", "name", "acronym"]);
assertKeys(
  "OSU acronym",
  osuRows.map((row) => row.acronym ?? ""),
);
const osuCodeById = new Map(
  osuRows.map((row) => [row["#ID"] ?? "", row.acronym ?? ""]),
);

const organizationIdsByLaboratoryId = new Map<string, string[]>();
for (const row of readRows("institution_organisation_laboratory.csv", [
  "#laboratory_id",
  "#organization_id",
])) {
  const laboratoryId = row["#laboratory_id"] ?? "";
  const known = organizationIdsByLaboratoryId.get(laboratoryId) ?? [];
  organizationIdsByLaboratoryId.set(laboratoryId, [
    ...known,
    row["#organization_id"] ?? "",
  ]);
}

const laboratoryRows = readRows("institution_laboratory.csv", [
  "#ID",
  "code",
  "acronym",
  "name",
  "#osu_id",
]);
assertKeys(
  "laboratory code",
  laboratoryRows.map((row) => row.code ?? ""),
);

const laboratories: Exported<Laboratory>[] = [];
for (const row of laboratoryRows) {
  const id = row["#ID"] ?? "";
  const code = row.code ?? "";
  const acronym = row.acronym ?? "";
  const name = row.name ?? "";
  const osuId = row["#osu_id"] ?? "";
  const organizationRors = [
    ...new Set(
      (organizationIdsByLaboratoryId.get(id) ?? []).flatMap(
        (organizationId) => rorById.get(organizationId) ?? [],
      ),
    ),
  ];

  if (organizationRors.length === 0) {
    process.stderr.write(`dropping laboratory ${code} without a ROR\n`);
    continue;
  }

  for (const ror of organizationRors.filter((ror) => !KNOWN_RORS.has(ror))) {
    process.stderr.write(
      `laboratory ${code} references ${ror}, absent from organization.ts\n`,
    );
  }

  const osu = osuId ? (osuCodeById.get(osuId) ?? null) : null;
  if (osuId && osu === null) {
    process.stderr.write(
      `laboratory ${code} references unknown OSU ${osuId}\n`,
    );
  }

  laboratories.push({ code, acronym, name, osu, organizationRors });
}

const osus = osuRows.map((row) => ({
  code: row.acronym ?? "",
  name: row.name ?? "",
  organizationRors: [
    ...new Set(
      laboratories
        .filter((laboratory) => laboratory.osu === row.acronym)
        .flatMap((laboratory) => laboratory.organizationRors),
    ),
  ],
}));

const records = await fetchRnsrRecords();
const uniqueRnsrId = (matches: typeof records) =>
  matches.length === 1 ? matches[0]?.numero_national_de_structure : undefined;
const laboratoryRnsrId = (code: string) =>
  uniqueRnsrId(
    records.filter((record) =>
      (record.label_numero ?? []).some(
        (label) => normalizeCode(label) === normalizeCode(code),
      ),
    ),
  );
const osuRnsrId = (code: string) => {
  const ownUnit = laboratories.find(
    (laboratory) =>
      laboratory.acronym === code && /^(UAR|UMS|UPS)/.test(laboratory.code),
  );
  return (
    (ownUnit && laboratoryRnsrId(ownUnit.code)) ??
    uniqueRnsrId(records.filter((record) => record.sigle === code))
  );
};

const merged = mergeInstitutions(
  { laboratories: LABORATORIES, osus: OSUS },
  { laboratories, osus },
  { laboratory: laboratoryRnsrId, osu: osuRnsrId },
);
for (const note of merged.notes) process.stderr.write(`${note}\n`);

writeFileSync(
  join(HERE, "../src/institutional-group/osu.ts"),
  emitOsus(merged.osus),
);
writeFileSync(
  join(HERE, "../src/institutional-group/laboratory.ts"),
  emitLaboratories(merged.laboratories),
);

process.stderr.write(
  `wrote ${merged.laboratories.length} laboratories and ${merged.osus.length} OSUs\n`,
);
