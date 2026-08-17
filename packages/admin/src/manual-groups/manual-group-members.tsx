import { ConfirmButton } from "@projet-igsn/design-system/components/ui/confirm-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@projet-igsn/design-system/components/ui/table";
import { fullName } from "@projet-igsn/domain/user/full-name";

import { m } from "#/paraglide/messages.js";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";

import { AssociateManualGroupMemberDialog } from "./associate-manual-group-member-dialog.tsx";
import { useManualGroupMembers } from "./use-manual-group-members.ts";
import { useRemoveManualGroupMember } from "./use-remove-manual-group-member.ts";

export function ManualGroupMembers({ groupId }: { groupId: string }) {
  const query = useManualGroupMembers(groupId);
  const removeMember = useRemoveManualGroupMember(groupId);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{m.group_members_title()}</h2>
        <AssociateManualGroupMemberDialog groupId={groupId} />
      </div>

      {query.isPending ? (
        <p>{m.manual_group_members_loading()}</p>
      ) : query.isError ? (
        <p role="alert">{m.manual_group_members_error()}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.column_name()}</TableHead>
              <TableHead>{m.column_email()}</TableHead>
              <TableHead>{m.column_status()}</TableHead>
              <TableHead>{m.manual_group_detach_action()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground italic">
                  {m.manual_group_members_empty()}
                </TableCell>
              </TableRow>
            ) : (
              query.data.map((member) => {
                const name = fullName(member) || member.email;
                return (
                  <TableRow key={member.id}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <UserStatusBadge status={member.status} />
                    </TableCell>
                    <TableCell>
                      <ConfirmButton
                        variant="outline"
                        size="sm"
                        aria-label={m.manual_group_detach_member({ name })}
                        title={m.manual_group_detach_title()}
                        description={m.manual_group_detach_description({
                          name,
                        })}
                        confirmLabel={m.manual_group_detach_action()}
                        cancelLabel={m.action_cancel()}
                        closeLabel={m.action_close()}
                        onConfirm={() => removeMember.mutate(member.id)}
                      >
                        {m.manual_group_detach_action()}
                      </ConfirmButton>
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
