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

const textOf = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export function checkContactLinks(
  value: Record<string, unknown>,
  ctx: z.RefinementCtx,
  persons: readonly string[],
): void {
  for (const person of persons) {
    const userId = textOf(value[`${person}UserId`]);
    const typed = hasTypedContactName({
      firstname: textOf(value[`${person}Firstname`]),
      lastname: textOf(value[`${person}Lastname`]),
      orcid: textOf(value[`${person}Orcid`]),
    });
    if (userId != null && typed) {
      ctx.addIssue({
        code: "custom",
        path: [`${person}UserId`],
        message: "a person is a linked account or a typed name, never both",
      });
    }
  }
}

export function dropTypedNameWhenLinked<T extends object>(
  contact: T,
  fields: readonly string[] = Object.keys(contact),
): T {
  const kept = { ...contact } as Record<string, unknown>;
  for (const field of fields) {
    if (!field.endsWith(LINK_SUFFIX) || kept[field] == null) continue;
    const person = field.slice(0, -LINK_SUFFIX.length);
    kept[`${person}Firstname`] = null;
    kept[`${person}Lastname`] = null;
    kept[`${person}Orcid`] = null;
  }
  return kept as T;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

export function keepContactLinks<T extends object>(
  incoming: T,
  current: object,
): T {
  const linked = { ...incoming } as Record<string, unknown>;
  for (const [key, value] of Object.entries(current)) {
    if (key.endsWith(LINK_SUFFIX)) {
      if (value != null) linked[key] = value;
    } else if (isPlainObject(value) && isPlainObject(linked[key])) {
      linked[key] = keepContactLinks(linked[key], value);
    }
  }
  return dropTypedNameWhenLinked(linked) as T;
}
