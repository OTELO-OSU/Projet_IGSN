import type { Repository } from "@projet-igsn/domain/sample/repository/model";

import {
  laboratoryLabel,
  osuLabel,
} from "@projet-igsn/domain/institutional-group/label";
import { joinContactName } from "@projet-igsn/domain/sample/contact-name";

import { ContactOwnerDialog } from "#/domain/samples/contact-owner-dialog.tsx";
import { FieldRow, FieldRows } from "#/domain/samples/field-rows.tsx";
import { OrgLinksRow } from "#/domain/samples/org-links-row.tsx";
import { m } from "#/paraglide/messages.js";

export function RepositoryView({
  repository,
  igsn,
  canContactArchive,
}: {
  repository: Repository;
  igsn: string | null;
  canContactArchive: boolean;
}) {
  const contactName = joinContactName(
    repository.currentArchiveContactFirstname,
    repository.currentArchiveContactLastname,
  );
  const contactable = canContactArchive && igsn != null;
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
        label={m.sample_field_current_archive_contact()}
        value={
          (contactName !== "" || contactable) && (
            <div className="flex flex-wrap items-center gap-4">
              {contactName && <span>{contactName}</span>}
              {contactable && (
                <ContactOwnerDialog igsn={igsn} recipient="archive" />
              )}
            </div>
          )
        }
      />
      <OrgLinksRow
        label={m.sample_field_rights_holder()}
        rors={repository.rightsHolder}
      />
      <FieldRow
        label={m.sample_field_collection_name()}
        value={repository.collectionName}
      />
    </FieldRows>
  );
}
