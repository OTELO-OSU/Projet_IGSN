import type { Repository } from "@projet-igsn/domain/sample/repository/model";

export type RepositoryDraft = {
  currentArchive: Repository["currentArchive"];
  currentArchiveContact: string | null | undefined;
  collectionName: string | null | undefined;
  originalArchive: string | null | undefined;
  originalArchiveContact: string | null | undefined;
};

export function composeRepository(draft: RepositoryDraft): Repository | null {
  const repository = {
    currentArchive: draft.currentArchive?.trim() || undefined,
    currentArchiveContact: draft.currentArchiveContact?.trim() || undefined,
    collectionName: draft.collectionName?.trim() || undefined,
    originalArchive: draft.originalArchive?.trim() || undefined,
    originalArchiveContact: draft.originalArchiveContact?.trim() || undefined,
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
    currentArchiveContact: repository?.currentArchiveContact ?? undefined,
    collectionName: repository?.collectionName ?? undefined,
    originalArchive: repository?.originalArchive ?? undefined,
    originalArchiveContact: repository?.originalArchiveContact ?? undefined,
  };
}
