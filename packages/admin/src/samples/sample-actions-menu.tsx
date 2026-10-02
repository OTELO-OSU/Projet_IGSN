import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@projet-igsn/design-system/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
  CopyIcon,
  EllipsisVerticalIcon,
  FileDownIcon,
  GitBranchPlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "#/confirm-button.tsx";
import { m } from "#/paraglide/messages.js";
import {
  CustomizeTemplateDialog,
  type TemplateDialogValues,
} from "#/samples/customize-template-dialog.tsx";
import { RequestSampleDeletionDialog } from "#/samples/request-sample-deletion-dialog.tsx";

export function SampleActionsMenu({
  sampleId,
  sampleName,
  canDuplicate,
  canAddSubSample,
  canDelete,
  canRequestDeletion,
  isDeleteDisabled,
  onDelete,
  templateInitialValues,
}: {
  sampleId: string;
  sampleName: string;
  canDuplicate: boolean;
  canAddSubSample: boolean;
  canDelete: boolean;
  canRequestDeletion: boolean;
  isDeleteDisabled: boolean;
  onDelete: () => void;
  templateInitialValues?: TemplateDialogValues;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={m.sample_actions_menu()}
          >
            <EllipsisVerticalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canDuplicate ? (
            <DropdownMenuItem asChild>
              <Link to="/samples/create" search={{ duplicate: sampleId }}>
                <CopyIcon aria-hidden />
                {m.sample_duplicate({ name: sampleName })}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {canAddSubSample ? (
            <DropdownMenuItem asChild>
              <Link to="/samples/create" search={{ parent: sampleId }}>
                <GitBranchPlusIcon aria-hidden />
                {m.sample_add_sub_sample({ name: sampleName })}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {templateInitialValues ? (
            <DropdownMenuItem onSelect={() => setIsCreatingTemplate(true)}>
              <FileDownIcon aria-hidden />
              {m.sample_create_import_template()}
            </DropdownMenuItem>
          ) : null}
          {canDelete ? (
            <DropdownMenuItem
              disabled={isDeleteDisabled}
              onSelect={() => setIsConfirmingDelete(true)}
            >
              <Trash2Icon aria-hidden />
              {m.sample_delete_action()}
            </DropdownMenuItem>
          ) : null}
          {canRequestDeletion ? (
            <DropdownMenuItem onSelect={() => setIsRequestingDeletion(true)}>
              <Trash2Icon aria-hidden />
              {m.sample_deletion_request_action()}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <RequestSampleDeletionDialog
        sampleId={sampleId}
        open={isRequestingDeletion}
        onOpenChange={setIsRequestingDeletion}
      />
      {templateInitialValues && isCreatingTemplate ? (
        <CustomizeTemplateDialog
          open
          initialValues={templateInitialValues}
          onBack={() => setIsCreatingTemplate(false)}
        />
      ) : null}
      {isConfirmingDelete ? (
        <ConfirmDialog
          open
          onOpenChange={() => setIsConfirmingDelete(false)}
          title={m.sample_delete_title()}
          description={m.sample_delete_description()}
          confirmLabel={m.action_delete()}
          confirmPhrase={{
            text: m.action_delete_confirm_phrase(),
            label: m.action_delete_confirm_phrase_label({
              phrase: m.action_delete_confirm_phrase(),
            }),
          }}
          onConfirm={onDelete}
        />
      ) : null}
    </>
  );
}
