import type { GroupManager } from "@projet-igsn/domain/user/user-validator";

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

import { AddManagerDialog } from "#/managers/add-manager-dialog.tsx";
import { m } from "#/paraglide/messages.js";
import { UserStatusBadge } from "#/users/user-status-badge.tsx";

export function ManagersSection({
  managers,
  isPending,
  isError,
  onAdd,
  onRemove,
}: {
  managers: GroupManager[];
  isPending: boolean;
  isError: boolean;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{m.group_managers_title()}</h2>
        <AddManagerDialog onAdd={onAdd} />
      </div>

      {isPending ? (
        <p>{m.group_managers_loading()}</p>
      ) : isError ? (
        <p role="alert">{m.group_managers_error()}</p>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">{m.column_name()}</TableHead>
              <TableHead className="w-2/5">{m.column_email()}</TableHead>
              <TableHead className="w-32">{m.column_status()}</TableHead>
              <TableHead className="w-32">
                {m.group_manager_remove_action()}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {managers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground italic">
                  {m.group_managers_empty()}
                </TableCell>
              </TableRow>
            ) : (
              managers.map((manager) => {
                const name = fullName(manager) || manager.email;
                return (
                  <TableRow key={manager.id}>
                    <TableCell className="truncate">{name}</TableCell>
                    <TableCell className="truncate">{manager.email}</TableCell>
                    <TableCell>
                      <UserStatusBadge status={manager.status} />
                    </TableCell>
                    <TableCell>
                      <ConfirmButton
                        variant="outline"
                        size="sm"
                        aria-label={m.group_manager_remove_manager({ name })}
                        title={m.group_manager_remove_title()}
                        description={m.group_manager_remove_description({
                          name,
                        })}
                        confirmLabel={m.group_manager_remove_action()}
                        cancelLabel={m.action_cancel()}
                        closeLabel={m.action_close()}
                        onConfirm={() => onRemove(manager.id)}
                      >
                        {m.group_manager_remove_action()}
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
