import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { DEFAULT_PAGE_SIZE } from "@projet-igsn/domain/sample/sample-validator";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";

import { SuperAdminOnly } from "#/auth/super-admin-only.tsx";
import { HttpError } from "#/http-error.ts";
import { ManualGroupMembers } from "#/manual-groups/manual-group-members.tsx";
import { RenameManualGroupDialog } from "#/manual-groups/rename-manual-group-dialog.tsx";
import { useDeleteManualGroup } from "#/manual-groups/use-delete-manual-group.ts";
import { useManualGroup } from "#/manual-groups/use-manual-group.ts";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/manual-groups/$groupId")({
  component: () => (
    <SuperAdminOnly>
      <ManualGroupDetailPage />
    </SuperAdminOnly>
  ),
});

function ManualGroupDetailPage() {
  const { groupId } = Route.useParams();
  const navigate = Route.useNavigate();
  const query = useManualGroup(groupId);
  const deleteGroup = useDeleteManualGroup(groupId);

  if (query.isPending) return <p>{m.manual_group_loading()}</p>;
  if (query.isError) {
    return (
      <p role="alert">
        {query.error instanceof HttpError && query.error.status === 404
          ? m.manual_group_not_found()
          : m.manual_group_error()}
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">{query.data.name}</h1>
        <div className="flex items-center gap-1">
          <RenameManualGroupDialog groupId={groupId} name={query.data.name} />
          <Tooltip>
            <TooltipTrigger asChild>
              <ConfirmButton
                variant="ghost"
                size="icon"
                aria-label={m.manual_group_delete_action()}
                title={m.manual_group_delete_title()}
                description={m.manual_group_delete_description()}
                confirmLabel={m.action_delete()}
                cancelLabel={m.action_cancel()}
                closeLabel={m.action_close()}
                confirmPhrase={{
                  text: m.action_delete_confirm_phrase(),
                  label: m.action_delete_confirm_phrase_label({
                    phrase: m.action_delete_confirm_phrase(),
                  }),
                }}
                onConfirm={() =>
                  deleteGroup.mutate(undefined, {
                    onSuccess: () =>
                      void navigate({
                        to: "/manual-groups",
                        search: { page: 1, perPage: DEFAULT_PAGE_SIZE },
                      }),
                  })
                }
              >
                <Trash2Icon aria-hidden />
              </ConfirmButton>
            </TooltipTrigger>
            <TooltipContent>{m.manual_group_delete_action()}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ManualGroupMembers groupId={groupId} />
    </>
  );
}
