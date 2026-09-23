import type { Repository } from "@projet-igsn/domain/sample/repository/model";

import { nonEmpty } from "#/samples/compose-scientific-context.ts";

export type RepositoryDraft = {
  currentArchiveOsu: Repository["currentArchiveOsu"];
  currentArchiveLaboratory: Repository["currentArchiveLaboratory"];
  currentArchiveContactFirstname: Repository["currentArchiveContactFirstname"];
  currentArchiveContactLastname: Repository["currentArchiveContactLastname"];
  collectionName: Repository["collectionName"];
  rightsHolder: string[];
};

export function composeRepository(draft: RepositoryDraft): Repository | null {
  const repository = {
    currentArchiveOsu: draft.currentArchiveOsu || undefined,
    currentArchiveLaboratory: draft.currentArchiveLaboratory || undefined,
    currentArchiveContactFirstname:
      draft.currentArchiveContactFirstname?.trim() || undefined,
    currentArchiveContactLastname:
      draft.currentArchiveContactLastname?.trim() || undefined,
    collectionName: draft.collectionName?.trim() || undefined,
    rightsHolder: nonEmpty(draft.rightsHolder),
  };
  return Object.values(repository).some((part) => part !== undefined)
    ? repository
    : null;
}

export function toRepositoryDraft(
  repository: Repository | null | undefined,
): RepositoryDraft {
  return {
    currentArchiveOsu: repository?.currentArchiveOsu ?? undefined,
    currentArchiveLaboratory: repository?.currentArchiveLaboratory ?? undefined,
    currentArchiveContactFirstname:
      repository?.currentArchiveContactFirstname ?? undefined,
    currentArchiveContactLastname:
      repository?.currentArchiveContactLastname ?? undefined,
    collectionName: repository?.collectionName ?? undefined,
    rightsHolder: repository?.rightsHolder ?? [],
  };
}
