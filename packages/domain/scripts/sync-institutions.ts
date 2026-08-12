import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

import {
  LABORATORIES,
  type Laboratory,
} from "../src/institutional-group/laboratory.ts";
import { ORGANIZATIONS } from "../src/institutional-group/organization.ts";
import { OSUS, type Osu } from "../src/institutional-group/osu.ts";
import {
  emitLaboratories,
  emitOsus,
  emitRemovedInstitutionsMigration,
} from "./emit-institutions.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

function readRows(
  file: string,
  required: readonly string[],
): Record<string, string>[] {
  const { data, errors, meta } = Papa.parse<Record<string, string>>(
    readFileSync(join(HERE, "../../../sync-data", file), "utf8"),
    { header: true, skipEmptyLines: true },
  );

  // Papa reports a malformed row instead of throwing, and a silently merged row
  // loses laboratories without anyone noticing, so the first one stops the run.
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

// A blank code reads as "no OSU" downstream instead of as a broken row, so it
// stops the run like a duplicate does.
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

const laboratories: Laboratory[] = [];
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

const osus: Osu[] = osuRows.map((row) => ({
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

writeFileSync(join(HERE, "../src/institutional-group/osu.ts"), emitOsus(osus));
writeFileSync(
  join(HERE, "../src/institutional-group/laboratory.ts"),
  emitLaboratories(laboratories),
);

process.stderr.write(
  `wrote ${laboratories.length} laboratories and ${osus.length} OSUs\n`,
);

// The lists above were imported before being overwritten, so they still hold
// what the previous export said.
const removedLaboratories = LABORATORIES.filter(
  (previous) => !laboratories.some(({ code }) => code === previous.code),
).map(({ code }) => code);
const removedOsus = OSUS.filter(
  (previous) => !osus.some(({ code }) => code === previous.code),
).map(({ code }) => code);

if (removedLaboratories.length > 0 || removedOsus.length > 0) {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const migration = `${stamp}-clear-removed-institutions.ts`;
  writeFileSync(
    join(HERE, "../../api/migrations", migration),
    emitRemovedInstitutionsMigration({
      laboratories: removedLaboratories,
      osus: removedOsus,
    }),
  );
  process.stderr.write(
    `dropped ${[...removedLaboratories, ...removedOsus].join(", ")}, cleared by migrations/${migration}\n`,
  );
}
