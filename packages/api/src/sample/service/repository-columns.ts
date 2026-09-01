import type { Repository } from "@projet-igsn/domain/sample/repository/model";

export function repositoryColumns(repository: Repository | null | undefined) {
  return {
    rep_current_archive: repository?.currentArchive ?? null,
    rep_current_archive_contact: repository?.currentArchiveContact ?? null,
    rep_collection_name: repository?.collectionName ?? null,
    rep_original_archive: repository?.originalArchive ?? null,
    rep_original_archive_contact: repository?.originalArchiveContact ?? null,
  };
}
