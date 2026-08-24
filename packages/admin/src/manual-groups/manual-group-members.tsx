import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import { SearchField } from "@projet-igsn/design-system/components/ui/search-field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@projet-igsn/design-system/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { fullName } from "@projet-igsn/domain/user/full-name";

import { matchesSearch } from "#/institutional-groups/matches-search.ts";
import { m } from "#/paraglide/messages.js";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";

import { AssociateManualGroupMemberDialog } from "./associate-manual-group-member-dialog.tsx";
import { useManualGroupMembers } from "./use-manual-group-members.ts";
import { useRemoveManualGroupMember } from "./use-remove-manual-group-member.ts";

type ManualGroupMembersProps = {
  groupId: string;
  search?: string;
  onSearch: (search: string) => void;
};

export function ManualGroupMembers({
  groupId,
  search,
  onSearch,
}: ManualGroupMembersProps) {
  const query = useManualGroupMembers(groupId);
  const removeMember = useRemoveManualGroupMember();

  const term = search?.trim();
  const all = query.data ?? [];
  const members = term
    ? all.filter((member) =>
        matchesSearch(`${fullName(member)} ${member.email}`, term),
      )
    : all;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{m.group_members_title()}</h2>
        <AssociateManualGroupMemberDialog groupId={groupId} />
      </div>

      <SearchField
        defaultValue={search}
        label={m.manual_group_members_search_label()}
        placeholder={m.manual_group_members_search_placeholder()}
        onSearch={onSearch}
      />

      {query.isPending ? (
        <p>{m.manual_group_members_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.manual_group_members_error()}</p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">{m.column_name()}</TableHead>
              <TableHead className="w-2/5">{m.column_email()}</TableHead>
              <TableHead className="w-32">{m.column_status()}</TableHead>
              <TableHead className="w-32">
                {m.manual_group_detach_action()}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground italic">
                  {term
                    ? m.manual_group_members_no_match()
                    : m.manual_group_members_empty()}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => {
                const name = fullName(member) || member.email;
                const detachButton = (
                  <ConfirmButton
                    variant="outline"
                    size="sm"
                    disabled={!member.canDetach}
                    aria-label={m.manual_group_detach_member({ name })}
                    title={m.manual_group_detach_title()}
                    description={m.manual_group_detach_description({ name })}
                    confirmLabel={m.manual_group_detach_action()}
                    cancelLabel={m.action_cancel()}
                    closeLabel={m.action_close()}
                    onConfirm={() =>
                      removeMember.mutate({ groupId, userId: member.id })
                    }
                  >
                    {m.manual_group_detach_action()}
                  </ConfirmButton>
                );
                return (
                  <TableRow key={member.id}>
                    <TableCell className="truncate">{name}</TableCell>
                    <TableCell className="truncate">{member.email}</TableCell>
                    <TableCell>
                      <UserStatusBadge status={member.status} />
                    </TableCell>
                    <TableCell>
                      {member.canDetach ? (
                        detachButton
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0}>{detachButton}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{m.manual_group_detach_published()}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
}
