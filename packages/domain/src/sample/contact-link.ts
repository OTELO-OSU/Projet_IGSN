import type { z } from "zod";

export type ContactLink = {
  userId?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  orcid?: string | null;
};

export function hasTypedContactName(contact: ContactLink): boolean {
  return (
    contact.firstname != null ||
    contact.lastname != null ||
    contact.orcid != null
  );
}

const LINK_SUFFIX = "UserId";

const NAME_SUFFIXES = ["Firstname", "Lastname", "Orcid"] as const;

const linkedPersons = (value: Record<string, unknown>): string[] =>
  Object.keys(value)
    .filter((key) => key.endsWith(LINK_SUFFIX))
    .map((key) => key.slice(0, -LINK_SUFFIX.length));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

export function checkContactLinks(
  value: Record<string, unknown>,
  ctx: z.RefinementCtx,
  path: (string | number)[] = [],
): void {
  for (const person of linkedPersons(value)) {
    if (value[`${person}${LINK_SUFFIX}`] == null) continue;
    if (NAME_SUFFIXES.every((suffix) => value[`${person}${suffix}`] == null))
      continue;
    ctx.addIssue({
      code: "custom",
      path: [...path, `${person}${LINK_SUFFIX}`],
      message: "a person is a linked account or a typed name, never both",
    });
  }
  for (const [key, nested] of Object.entries(value)) {
    if (Array.isArray(nested))
      nested.forEach((row, index) => {
        if (isPlainObject(row))
          checkContactLinks(row, ctx, [...path, key, index]);
      });
    else if (isPlainObject(nested))
      checkContactLinks(nested, ctx, [...path, key]);
  }
}

const dropNestedRows = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map((row) =>
        isPlainObject(row) ? dropTypedNameWhenLinked(row) : row,
      )
    : value;

export function dropTypedNameWhenLinked<T extends object>(contact: T): T {
  const kept = { ...contact } as Record<string, unknown>;
  for (const [key, value] of Object.entries(kept))
    kept[key] = dropNestedRows(value);
  for (const person of linkedPersons(kept)) {
    if (kept[`${person}${LINK_SUFFIX}`] == null) continue;
    for (const suffix of NAME_SUFFIXES) kept[`${person}${suffix}`] = null;
  }
  return kept as T;
}

const clearNested = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(clearNested);
  return isPlainObject(value) ? clearContactLinks(value) : value;
};

export function clearContactLinks<T extends object>(value: T): T {
  const cleared = { ...value } as Record<string, unknown>;
  for (const [key, nested] of Object.entries(cleared)) {
    cleared[key] = key.endsWith(LINK_SUFFIX) ? null : clearNested(nested);
  }
  return cleared as T;
}

const sameText = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

// The Core payload carries the resolved name, not the link, so a round trip
// keeps the link and an actually changed name replaces it with a typed name.
const keepsLink = (
  incoming: Record<string, unknown>,
  current: Record<string, unknown>,
  person: string,
) =>
  NAME_SUFFIXES.every((suffix) =>
    sameText(incoming[`${person}${suffix}`], current[`${person}${suffix}`]),
  );

const sameRow = (
  incoming: Record<string, unknown>,
  stored: Record<string, unknown>,
) =>
  [...new Set([...Object.keys(incoming), ...Object.keys(stored)])]
    .filter((key) => !key.endsWith(LINK_SUFFIX))
    .every((key) => sameText(incoming[key], stored[key]));

const restoreRowLinks = (
  incoming: unknown[],
  current: unknown[],
): unknown[] => {
  const restored = new Set<number>();
  return incoming.map((row) => {
    if (!isPlainObject(row)) return row;
    const index = current.findIndex(
      (candidate, at) =>
        !restored.has(at) &&
        isPlainObject(candidate) &&
        sameRow(row, candidate),
    );
    const stored = current[index];
    if (!isPlainObject(stored)) return row;
    restored.add(index);
    return keepContactLinks(row, stored);
  });
};

export function keepContactLinks<T extends object>(
  incoming: T,
  current: object,
): T {
  const linked = { ...incoming } as Record<string, unknown>;
  const stored = current as Record<string, unknown>;
  for (const [key, value] of Object.entries(stored)) {
    if (key.endsWith(LINK_SUFFIX)) {
      const person = key.slice(0, -LINK_SUFFIX.length);
      if (value == null || !keepsLink(linked, stored, person)) continue;
      linked[key] = value;
      for (const suffix of NAME_SUFFIXES) linked[`${person}${suffix}`] = null;
    } else if (Array.isArray(value) && Array.isArray(linked[key])) {
      linked[key] = restoreRowLinks(linked[key], value);
    } else if (isPlainObject(value) && isPlainObject(linked[key])) {
      linked[key] = keepContactLinks(linked[key], value);
    }
  }
  return linked as T;
}
