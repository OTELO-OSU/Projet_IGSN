import type { AdminSampleListItem } from "@projet-igsn/domain/sample/sample-validator";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { hasPermanentIgsn } from "@projet-igsn/domain/sample/publication/has-permanent-igsn";
import { canCreateImportTemplate } from "@projet-igsn/domain/user-sample/can-create-import-template";
import { canDuplicateSample } from "@projet-igsn/domain/user-sample/can-duplicate-sample";
import { Link } from "@tanstack/react-router";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  FileDownIcon,
  GitBranchPlusIcon,
} from "lucide-react";

import { m } from "#/paraglide/messages.js";

export function SampleRowActionsMenu({
  sample,
  onCreateTemplate,
}: {
  sample: AdminSampleListItem;
  onCreateTemplate: (sample: AdminSampleListItem) => void;
}) {
  const canCreateTemplate = canCreateImportTemplate(sample);
  const canAddSubSample = hasPermanentIgsn(sample);
  const canDuplicate = canDuplicateSample(sample);
  if (!canCreateTemplate && !canAddSubSample && !canDuplicate) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={m.sample_row_actions({ name: sample.name })}
          onClick={(event) => event.stopPropagation()}
        >
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        {canCreateTemplate ? (
          <DropdownMenuItem onSelect={() => onCreateTemplate(sample)}>
            <FileDownIcon aria-hidden />
            {m.sample_create_import_template()}
          </DropdownMenuItem>
        ) : null}
        {canAddSubSample ? (
          <DropdownMenuItem asChild>
            <Link to="/samples/create" search={{ parent: sample.id }}>
              <GitBranchPlusIcon aria-hidden />
              {m.sample_add_sub_sample({ name: sample.name })}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canDuplicate ? (
          <DropdownMenuItem asChild>
            <Link to="/samples/create" search={{ duplicate: sample.id }}>
              <CopyIcon aria-hidden />
              {m.sample_duplicate({ name: sample.name })}
            </Link>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
