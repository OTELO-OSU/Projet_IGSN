import type { z } from "zod";

import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useCurrentUser } from "#/auth/use-current-user.ts";

type Search = Record<string, unknown>;

const KEPT_ON_RESET = ["perPage", "sort", "order"];

const pick = (search: Search, keys: string[]): Search =>
  Object.fromEntries(keys.map((key) => [key, search[key]]));

const isSame = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    return;
  }
}

function readSaved(
  key: string,
  schema: z.ZodObject,
  savedKeys: string[],
): Search | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const stored = pick(JSON.parse(raw) as Search, savedKeys);
    const parsed = schema.safeParse(stored);
    if (parsed.success) {
      const saved = pick(parsed.data, savedKeys);
      if (isSame(saved, stored)) return saved;
    }
  } catch {
    forget(key);
    return null;
  }
  forget(key);
  return null;
}

function writeSaved(key: string, json: string | null) {
  try {
    if (json === null) localStorage.removeItem(key);
    else localStorage.setItem(key, json);
  } catch {
    return;
  }
}

export function useSavedListSearch(
  list: string,
  schema: z.ZodObject,
  { unsaved = [] }: { unsaved?: string[] } = {},
): { isRestoring: boolean; reset: (() => Promise<void>) | undefined } {
  const search: Search = useSearch({ strict: false });
  const navigate = useNavigate();
  const { data: user, isPending } = useCurrentUser();
  const storageKey = user && `admin-list-${list}-${user.id}`;

  const defaults: Search = schema.parse({});
  const keys = Object.keys(schema.shape).filter((key) => key !== "page");
  const savedKeys = keys.filter((key) => !unsaved.includes(key));
  const isBare = keys.every((key) => isSame(search[key], defaults[key]));
  const saved = pick(search, savedKeys);

  const [entry, setEntry] = useState<{ target: Search | null }>();
  if (entry === undefined && !isPending) {
    setEntry({
      target:
        isBare && storageKey ? readSaved(storageKey, schema, savedKeys) : null,
    });
  }
  const target = entry?.target ?? null;
  if (target !== null && isSame(saved, target)) {
    setEntry({ target: null });
  }
  const isRestoring = entry === undefined || target !== null;

  useEffect(() => {
    if (target === null) return;
    void navigate({
      to: ".",
      search: (previous: Search) => ({ ...previous, ...target, page: 1 }),
      replace: true,
    });
  }, [navigate, target]);

  const savedJson = isBare ? null : JSON.stringify(saved);
  useEffect(() => {
    if (isRestoring || !storageKey) return;
    writeSaved(storageKey, savedJson);
  }, [isRestoring, storageKey, savedJson]);

  const hasFilter = keys
    .filter((key) => !KEPT_ON_RESET.includes(key))
    .some((key) => !isSame(search[key], defaults[key]));
  const reset = () =>
    navigate({
      to: ".",
      search: (previous: Search) => ({
        ...pick(previous, KEPT_ON_RESET),
        page: 1,
      }),
    });

  return { isRestoring, reset: hasFilter ? reset : undefined };
}
