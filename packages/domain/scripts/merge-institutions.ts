import type { Laboratory } from "../src/institutional-group/laboratory.ts";
import type { Osu } from "../src/institutional-group/osu.ts";

type Institutions = {
  laboratories: readonly Laboratory[];
  osus: readonly Osu[];
};

export type Exported<T> = Omit<T, "id" | "formerCodes">;

type ExportedInstitutions = {
  laboratories: readonly Exported<Laboratory>[];
  osus: readonly Exported<Osu>[];
};

type RnsrIdOf = (code: string) => string | undefined;

type Entry = {
  id: string;
  code: string;
  formerCodes?: readonly string[];
  organizationRors: readonly string[];
};

function findPrevious<T extends Entry>(
  previous: readonly T[],
  code: string,
): T | undefined {
  return previous.find(
    (entry) => entry.code === code || entry.formerCodes?.includes(code),
  );
}

function mergeEntries<T extends Entry>(
  previous: readonly T[],
  exported: readonly Exported<T>[],
  rnsrIdOf: RnsrIdOf,
): { entries: T[]; notes: string[] } {
  const notes: string[] = [];
  const byId = new Map<string, T>();

  const currentCodesFirst = exported.toSorted(
    (a, b) =>
      Number(findPrevious(previous, a.code)?.code !== a.code) -
      Number(findPrevious(previous, b.code)?.code !== b.code),
  );
  for (const entry of currentCodesFirst) {
    const listed = findPrevious(previous, entry.code);
    const renamed =
      listed === undefined
        ? previous.find(({ id }) => id === rnsrIdOf(entry.code))
        : undefined;
    const before = listed ?? renamed;
    const keptRors =
      before?.organizationRors.filter(
        (ror) => !entry.organizationRors.includes(ror),
      ) ?? [];
    notes.push(
      ...keptRors.map(
        (ror) => `kept link ${entry.code} -> ${ror}, absent from the export`,
      ),
    );
    if (renamed !== undefined) {
      notes.push(`${renamed.code} is now ${entry.code}, same RNSR id`);
    }
    const merged = (
      before === undefined
        ? { ...entry, id: rnsrIdOf(entry.code) ?? `local:${entry.code}` }
        : {
            ...before,
            ...entry,
            code: before.code,
            ...(renamed !== undefined && {
              code: entry.code,
              formerCodes: [...(renamed.formerCodes ?? []), renamed.code],
            }),
            organizationRors: [...entry.organizationRors, ...keptRors],
          }
    ) as T;

    const same = byId.get(merged.id);
    const isNewCode =
      same !== undefined &&
      merged.code !== same.code &&
      !same.formerCodes?.includes(merged.code);
    if (isNewCode) {
      notes.push(`merged ${merged.code} into ${same.code}, same RNSR id`);
    }
    byId.set(
      merged.id,
      same === undefined
        ? merged
        : {
            ...same,
            ...(isNewCode && {
              formerCodes: [...(same.formerCodes ?? []), merged.code],
            }),
            organizationRors: [
              ...new Set([
                ...same.organizationRors,
                ...merged.organizationRors,
              ]),
            ],
          },
    );
  }

  const absent = previous.filter(({ id }) => !byId.has(id));
  notes.push(
    ...absent.map(({ code }) => `kept ${code}, absent from the export`),
  );

  return { entries: [...byId.values(), ...absent], notes };
}

export function mergeInstitutions(
  previous: Institutions,
  exported: ExportedInstitutions,
  rnsrIdOf: { laboratory: RnsrIdOf; osu: RnsrIdOf },
): { laboratories: Laboratory[]; osus: Osu[]; notes: string[] } {
  const laboratories = mergeEntries(
    previous.laboratories,
    exported.laboratories,
    rnsrIdOf.laboratory,
  );
  const osus = mergeEntries(previous.osus, exported.osus, rnsrIdOf.osu);
  const moves = previous.laboratories.flatMap((before) => {
    const after = laboratories.entries.find(({ id }) => id === before.id);
    return after === undefined || after.osu === before.osu
      ? []
      : [
          `laboratory ${before.code} moved from OSU ${before.osu ?? "none"} to ${after.osu ?? "none"}`,
        ];
  });

  return {
    laboratories: laboratories.entries,
    osus: osus.entries,
    notes: [...laboratories.notes, ...moves, ...osus.notes],
  };
}
