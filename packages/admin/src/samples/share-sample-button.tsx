import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";

import { m } from "#/paraglide/messages.js";
import { CollaboratorList } from "#/samples/collaborator-list.tsx";
import { ColleaguePicker } from "#/samples/colleague-picker.tsx";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

export function ShareSampleButton({ sampleId }: { sampleId: string }) {
  return useUserRoleOnSample(sampleId) === "owner" ? (
    <ShareSampleDialog sampleId={sampleId} />
  ) : null;
}

function ShareSampleDialog({ sampleId }: { sampleId: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          {m.action_share()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.share_dialog_title()}</DialogTitle>
          <DialogDescription>{m.share_dialog_description()}</DialogDescription>
        </DialogHeader>
        <CollaboratorList sampleId={sampleId} />
        <ColleaguePicker sampleId={sampleId} />
      </DialogContent>
    </Dialog>
  );
}
