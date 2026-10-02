import { ATTACHMENT_MAX_BYTES } from "@projet-igsn/domain/sample/attachment/attachment-validator";
import {
  IMPORT_MAX_BYTES,
  importSamplesSchema,
} from "@projet-igsn/domain/sample/import/import-validator";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { readAttachmentFileNames } from "#/samples/read-attachment-file-names.ts";

const MEGABYTE = 1024 * 1024;

const fileError = (file: File | null): string | null => {
  if (!file) return null;
  const parsed = importSamplesSchema.safeParse({ file });
  if (parsed.success) return null;
  return parsed.error.issues.some((issue) => issue.code === "too_big")
    ? m.import_samples_file_too_large({ max: IMPORT_MAX_BYTES / MEGABYTE })
    : m.import_samples_file_not_xlsx();
};

type Workbook = { file: File; requiredNames: string[] | null };

export function useImportFiles() {
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [pickErrors, setPickErrors] = useState<string[]>([]);
  const file = workbook?.file ?? null;
  const isParsing = workbook !== null && workbook.requiredNames === null;
  const requiredNames = workbook?.requiredNames ?? [];
  const addedNames = new Set(documents.map(({ name }) => name));

  async function pickWorkbook(picked: File | null) {
    setWorkbook(picked && { file: picked, requiredNames: null });
    setDocuments([]);
    setPickErrors([]);
    if (!picked) return;
    const names = await readAttachmentFileNames(picked);
    setWorkbook((current) =>
      current?.file === picked
        ? { file: picked, requiredNames: names }
        : current,
    );
  }

  function addDocuments(picked: File[]) {
    const names = new Set(addedNames);
    const errors: string[] = [];
    const accepted: File[] = [];
    for (const candidate of picked) {
      const { name } = candidate;
      if (names.has(name)) {
        errors.push(m.import_samples_document_already_added({ name }));
      } else if (candidate.size > ATTACHMENT_MAX_BYTES) {
        errors.push(
          m.import_samples_document_too_large({
            name,
            max: ATTACHMENT_MAX_BYTES / MEGABYTE,
          }),
        );
      } else {
        names.add(name);
        accepted.push(candidate);
      }
    }
    setDocuments([...documents, ...accepted]);
    setPickErrors([...new Set(errors)]);
  }

  function pickFiles(picked: File[]) {
    if (requiredNames.length > 0) addDocuments(picked);
    else void pickWorkbook(picked[0] ?? null);
  }

  const unreferencedNames = [...addedNames].filter(
    (name) => !requiredNames.includes(name),
  );
  const error = fileError(file);

  return {
    file,
    error,
    documents,
    requiredNames,
    addedNames,
    unreferencedNames,
    pickErrors,
    isReady:
      file !== null &&
      error === null &&
      !isParsing &&
      requiredNames.every((name) => addedNames.has(name)) &&
      unreferencedNames.length === 0,
    pickFiles,
    removeDocument: (name: string) =>
      setDocuments(documents.filter((added) => added.name !== name)),
    reset: () => void pickWorkbook(null),
  };
}
