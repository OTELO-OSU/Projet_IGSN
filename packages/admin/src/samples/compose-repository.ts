import type { Repository } from "@projet-igsn/domain/sample/repository/model";

export type RepositoryDraft = {
  currentArchive: Repository["currentArchive"];
  currentArchiveContactFirstname: string | null | undefined;
  currentArchiveContactLastname: string | null | undefined;
  collectionName: string | null | undefined;
  originalArchive: string | null | undefined;
  originalArchiveContactFirstname: string | null | undefined;
  originalArchiveContactLastname: string | null | undefined;
};

export function composeRepository(draft: RepositoryDraft): Repository | null {
  const repository = {
    currentArchive: draft.currentArchive?.trim() || undefined,
    currentArchiveContactFirstname:
      draft.currentArchiveContactFirstname?.trim() || undefined,
    currentArchiveContactLastname:
      draft.currentArchiveContactLastname?.trim() || undefined,
    collectionName: draft.collectionName?.trim() || undefined,
    originalArchive: draft.originalArchive?.trim() || undefined,
    originalArchiveContactFirstname:
      draft.originalArchiveContactFirstname?.trim() || undefined,
    originalArchiveContactLastname:
      draft.originalArchiveContactLastname?.trim() || undefined,
  };
  return Object.values(repository).some((part) => part !== undefined)
    ? repository
    : null;
}

export function toRepositoryDraft(
  repository: Repository | null | undefined,
): RepositoryDraft {
  return {
    currentArchive: repository?.currentArchive ?? undefined,
    currentArchiveContactFirstname:
      repository?.currentArchiveContactFirstname ?? undefined,
    currentArchiveContactLastname:
      repository?.currentArchiveContactLastname ?? undefined,
    collectionName: repository?.collectionName ?? undefined,
    originalArchive: repository?.originalArchive ?? undefined,
    originalArchiveContactFirstname:
      repository?.originalArchiveContactFirstname ?? undefined,
    originalArchiveContactLastname:
      repository?.originalArchiveContactLastname ?? undefined,
  };
}
