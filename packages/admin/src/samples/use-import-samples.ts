import type { ImportIssue } from "@projet-igsn/domain/sample/import/import-report";

import { toast } from "@projet-igsn/design-system/components/ui/sonner";
import {
  importAcceptedSchema,
  invalidImportSchema,
} from "@projet-igsn/domain/sample/import/import-report";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { API_URL } from "#/api-url.ts";
import { HttpError } from "#/http-error.ts";
import { m } from "#/paraglide/messages.js";
import {
  type StagedUploadProgress,
  uploadStagedDocuments,
} from "#/samples/upload-staged-documents.ts";
import { useApiClient } from "#/use-api-client.ts";

export type ImportProgress = StagedUploadProgress | "importing" | null;

type StagedDocument = { id: string; size: number; lastModified: number };

const DATACITE_DOWN = 503;

const isStaged = (
  document: File,
  staged: StagedDocument | undefined,
): boolean =>
  staged?.size === document.size &&
  staged.lastModified === document.lastModified;

export function useImportSamples() {
  const apiFetch = useApiClient();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<ImportProgress>(null);
  const [staged, setStaged] = useState<ReadonlyMap<string, StagedDocument>>(
    new Map(),
  );
  const forgetStaged = () => setStaged(new Map());
  const mutation = useMutation({
    mutationFn: async ({
      file,
      documents,
    }: {
      file: File;
      documents: File[];
    }): Promise<{ issues: ImportIssue[]; count: number }> => {
      const missing = documents.filter(
        (document) => !isStaged(document, staged.get(document.name)),
      );
      const current = new Map(staged);
      await uploadStagedDocuments(
        missing,
        setProgress,
        ({ name, size, lastModified }, id) => {
          current.set(name, { id, size, lastModified });
          setStaged(new Map(current));
        },
      );
      setProgress("importing");
      const body = new FormData();
      body.append("file", file);
      for (const { name } of documents)
        body.append("stagedUploadIds[]", current.get(name)!.id);
      const res = await apiFetch(new URL("admin/samples/import", API_URL), {
        method: "POST",
        body,
      });
      if (res.status === 422) {
        return {
          issues: invalidImportSchema.parse(await res.json()).issues,
          count: 0,
        };
      }
      if (!res.ok) {
        throw new HttpError(
          res.status,
          `Failed to import samples (${res.status})`,
        );
      }
      return { issues: [], ...importAcceptedSchema.parse(await res.json()) };
    },
    onSettled: () => setProgress(null),
    onSuccess: ({ issues, count }) => {
      if (issues.length > 0) return;
      forgetStaged();
      toast.success(m.import_samples_success({ count }));
      return queryClient.invalidateQueries({ queryKey: ["samples"] });
    },
    onError: (error) => {
      const isDataCiteDown =
        error instanceof HttpError && error.status === DATACITE_DOWN;
      if (error instanceof HttpError && !isDataCiteDown) forgetStaged();
      toast.error(
        isDataCiteDown
          ? m.import_samples_datacite_down()
          : m.import_samples_error(),
      );
    },
  });
  return {
    ...mutation,
    progress,
    clearReport: mutation.reset,
    reset: () => {
      mutation.reset();
      forgetStaged();
    },
  };
}
