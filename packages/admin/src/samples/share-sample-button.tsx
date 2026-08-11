import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";

import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { canManageCollaborators } from "@projet-igsn/domain/user-sample/can-manage-collaborators";
import { UsersIcon } from "lucide-react";

import { m } from "#/paraglide/messages.js";
import { CollaboratorList } from "#/samples/collaborator-list.tsx";
import { InviteCollaboratorDialog } from "#/samples/invite-collaborator-dialog.tsx";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

export function ShareSampleButton({ sampleId }: { sampleId: string }) {
  const role = useUserRoleOnSample(sampleId);
  return role ? <ShareSampleDialog sampleId={sampleId} role={role} /> : null;
}

function ShareSampleDialog({
  sampleId,
  role,
}: {
  sampleId: string;
  role: UserSampleRole;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <UsersIcon aria-hidden />
          {m.action_share()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.share_dialog_title()}</DialogTitle>
          <div className="flex items-center justify-between gap-4">
            <DialogDescription>
              {m.share_dialog_description()}
            </DialogDescription>
            <InviteCollaboratorDialog sampleId={sampleId} role={role} />
          </div>
        </DialogHeader>
        <CollaboratorList
          sampleId={sampleId}
          mayRemove={canManageCollaborators(role)}
        />
      </DialogContent>
    </Dialog>
  );
}
