import type { Repository } from "@projet-igsn/domain/sample/repository/model";

import {
  laboratoryLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { OrgLinksRow } from "#/domain/samples/org-links-row.tsx";
import { m } from "#/paraglide/messages.js";

export function RepositoryView({ repository }: { repository: Repository }) {
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_current_archive_osu()}
        value={
          repository.currentArchiveOsu && osuLabel(repository.currentArchiveOsu)
        }
      />
      <FieldRow
        label={m.sample_field_current_archive_laboratory()}
        value={
          repository.currentArchiveLaboratory &&
          laboratoryLabel(repository.currentArchiveLaboratory)
        }
      />
      <FieldRow
        label={m.sample_field_collection_name()}
        value={repository.collectionName}
      />
      <OrgLinksRow
        label={m.sample_field_rights_holder()}
        rors={repository.rightsHolder}
      />
    </FieldRows>
  );
}
