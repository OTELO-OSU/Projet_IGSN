import type { Repository } from "@projet-igsn/domain/sample/repository/model";

import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { OrgLink } from "#/domain/samples/org-link.tsx";
import { m } from "#/paraglide/messages.js";

export function RepositoryView({ repository }: { repository: Repository }) {
  return (
    <FieldRows>
      <FieldRow
        label={m.sample_field_current_archive()}
        value={
          repository.currentArchive && (
            <OrgLink ror={repository.currentArchive} />
          )
        }
      />
      <FieldRow
        label={m.sample_field_collection_name()}
        value={repository.collectionName}
      />
      <FieldRow
        label={m.sample_field_original_archive()}
        value={repository.originalArchive}
      />
    </FieldRows>
  );
}
