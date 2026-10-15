import type { Repository } from "@projet-igsn/domain/sample/repository/model";

import { laboratoryIdOf } from "@projet-igsn/domain/institutional-group/laboratory-id-of";
import { osuIdOf } from "@projet-igsn/domain/institutional-group/osu-id-of";

export function repositoryColumns(repository: Repository | null | undefined) {
  const osu = repository?.currentArchiveOsu;
  const laboratory = repository?.currentArchiveLaboratory;
  return {
    rep_current_archive_osu: osu == null ? null : osuIdOf(osu),
    rep_current_archive_laboratory:
      laboratory == null ? null : laboratoryIdOf(laboratory),
    rep_current_archive_contact_firstname:
      repository?.currentArchiveContactFirstname ?? null,
    rep_current_archive_contact_lastname:
      repository?.currentArchiveContactLastname ?? null,
    rep_current_archive_contact_email:
      repository?.currentArchiveContactEmail ?? null,
    rep_collection_name: repository?.collectionName ?? null,
    rep_rights_holder: repository?.rightsHolder ?? null,
  };
}
