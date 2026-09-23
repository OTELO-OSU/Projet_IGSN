import type { Repository } from "@projet-igsn/domain/sample/repository/model";

export function repositoryColumns(repository: Repository | null | undefined) {
  return {
    rep_current_archive_osu: repository?.currentArchiveOsu ?? null,
    rep_current_archive_laboratory:
      repository?.currentArchiveLaboratory ?? null,
    rep_current_archive_contact_firstname:
      repository?.currentArchiveContactFirstname ?? null,
    rep_current_archive_contact_lastname:
      repository?.currentArchiveContactLastname ?? null,
    rep_collection_name: repository?.collectionName ?? null,
    rep_rights_holder: repository?.rightsHolder ?? null,
  };
}
