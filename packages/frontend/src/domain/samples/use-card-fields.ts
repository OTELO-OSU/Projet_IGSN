import { useEffect, useState } from "react";

import { selectedCardFields } from "#/domain/samples/card-fields.ts";

const STORAGE_KEY = "sample-card-fields";

const NO_FIELDS: string[] = [];

function readStoredFields(): string[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored
    ? selectedCardFields(stored.split(",")).map((field) => field.key)
    : NO_FIELDS;
}

export function useCardFields(): {
  fields: string[];
  saveFields: (fields: string[]) => void;
} {
  const [fields, setFields] = useState<string[]>(NO_FIELDS);

  useEffect(() => {
    setFields(readStoredFields());
  }, []);

  return {
    fields,
    saveFields: (next) => {
      setFields(next);
      localStorage.setItem(STORAGE_KEY, next.join(","));
    },
  };
}
