import type { Laboratory } from "../src/institutional-group/laboratory.ts";
import type { Osu } from "../src/institutional-group/osu.ts";

import {
  mergeRnsrLaboratory,
  refreshName,
  type RnsrRecord,
  stripCodeMentions,
} from "./merge-rnsr-laboratory.ts";
import { PINNED_OSU_NAMES } from "./pinned-rnsr-names.ts";

type Catalog = {
  laboratories: readonly Laboratory[];
  osus: readonly Osu[];
};

export function normalizeCode(code: string): string {
  return code
    .replace(/\s/g, "")
    .replace(/^(UMS|UPS)/, "UAR")
    .replace(/^UMI/, "IRL");
}

const compactCode = (code: string) => code.replace(/\s/g, "");
const numberOf = (code: string) => /\d+$/.exec(code)?.[0];

function isCodeListed(
  code: string,
  laboratories: readonly Laboratory[],
): boolean {
  return laboratories.some(
    (entry) => entry.code === code || entry.formerCodes?.includes(code),
  );
}

function requalifyLaboratory(
  laboratory: Laboratory,
  record: RnsrRecord,
  catalog: readonly Laboratory[],
  notes: string[],
): Laboratory {
  const labels = [...new Set((record.label_numero ?? []).map(compactCode))];
  const listed = labels.some(
    (label) =>
      label === laboratory.code || normalizeCode(label) === laboratory.code,
  );
  if (labels.length === 0 || listed) return laboratory;

  const candidates = labels.filter(
    (label) => numberOf(label) === numberOf(laboratory.code),
  );
  const [code] = candidates;
  if (candidates.length !== 1 || code === undefined) {
    notes.push(
      `laboratory ${laboratory.code} is listed as ${labels.join(", ")} in RNSR`,
    );
    return laboratory;
  }

  const others = catalog.filter(({ id }) => id !== laboratory.id);
  if (isCodeListed(code, others)) {
    notes.push(
      `laboratory ${laboratory.code} could become ${code}, a code already listed`,
    );
    return laboratory;
  }

  notes.push(`laboratory ${laboratory.code} is now ${code}`);
  return {
    ...laboratory,
    code,
    formerCodes: [...(laboratory.formerCodes ?? []), laboratory.code].filter(
      (former) => former !== code,
    ),
  };
}

function addSuccessor(
  laboratory: Laboratory,
  records: readonly RnsrRecord[],
  catalog: readonly Laboratory[],
  notes: string[],
): Laboratory[] {
  const successors = records.filter((record) =>
    record.numero_de_structure_historique?.includes(laboratory.id),
  );
  const [successor] = successors;
  if (successor === undefined) {
    notes.push(`laboratory ${laboratory.code} is not in RNSR`);
    return [laboratory];
  }
  if (successors.length > 1) {
    notes.push(
      `laboratory ${laboratory.code} is split into ${successors.map((record) => record.numero_national_de_structure).join(", ")} in RNSR`,
    );
    return [laboratory];
  }

  const id = successor.numero_national_de_structure;
  const [label] = successor.label_numero ?? [];
  if (label === undefined) {
    notes.push(
      `laboratory ${laboratory.code} is succeeded by ${id}, without a code`,
    );
    return [laboratory];
  }

  const code = normalizeCode(label);
  if (catalog.some((entry) => entry.id === id)) {
    notes.push(
      `laboratory ${laboratory.code} is succeeded by ${code}, already listed`,
    );
    return [laboratory];
  }
  if (isCodeListed(code, catalog)) {
    notes.push(
      `laboratory ${laboratory.code} is succeeded by ${code}, a code already listed`,
    );
    return [laboratory];
  }

  notes.push(`laboratory ${laboratory.code} is succeeded by ${code}`);
  const acronym = successor.sigle ?? code;
  return [
    { ...laboratory, replacedBy: id },
    {
      id,
      code,
      acronym,
      name: stripCodeMentions(successor.libelle, acronym),
      osu: laboratory.osu,
      organizationRors: laboratory.organizationRors,
    },
  ];
}

function mergeSharedSuccessors(
  laboratories: readonly Laboratory[],
): Laboratory[] {
  const byId = new Map<string, Laboratory>();
  for (const laboratory of laboratories) {
    const same = byId.get(laboratory.id);
    byId.set(
      laboratory.id,
      same === undefined
        ? laboratory
        : {
            ...same,
            organizationRors: [
              ...new Set([
                ...same.organizationRors,
                ...laboratory.organizationRors,
              ]),
            ],
          },
    );
  }
  return [...byId.values()];
}

function mergeOsu(
  osu: Osu,
  record: RnsrRecord | undefined,
  laboratories: readonly Laboratory[],
  notes: string[],
): Osu {
  const organizationRors = [
    ...new Set([
      ...osu.organizationRors,
      ...laboratories
        .filter((laboratory) => laboratory.osu === osu.code)
        .flatMap((laboratory) => laboratory.organizationRors),
    ]),
  ];
  if (record === undefined) {
    notes.push(`OSU ${osu.code} is not in RNSR`);
    return { ...osu, organizationRors };
  }

  const name = PINNED_OSU_NAMES.has(osu.code)
    ? osu.name
    : refreshName(osu.name, record.libelle, osu.code);
  if (name !== osu.name) notes.push(`OSU ${osu.code} is renamed ${name}`);
  return { ...osu, name, organizationRors };
}

export function mergeRnsr(
  catalog: Catalog,
  records: readonly RnsrRecord[],
): { laboratories: Laboratory[]; osus: Osu[]; notes: string[] } {
  const recordById = new Map(
    records.map((record) => [record.numero_national_de_structure, record]),
  );
  const notes: string[] = [];

  const laboratories = mergeSharedSuccessors(
    catalog.laboratories.flatMap((laboratory) => {
      if (laboratory.replacedBy !== undefined) return [laboratory];
      const record = recordById.get(laboratory.id);
      return record === undefined
        ? addSuccessor(laboratory, records, catalog.laboratories, notes)
        : [
            mergeRnsrLaboratory(
              requalifyLaboratory(
                laboratory,
                record,
                catalog.laboratories,
                notes,
              ),
              record,
            ),
          ];
    }),
  );

  const osus = catalog.osus.map((osu) =>
    mergeOsu(osu, recordById.get(osu.id), laboratories, notes),
  );

  return { laboratories, osus, notes };
}
