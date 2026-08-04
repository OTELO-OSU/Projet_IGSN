import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { useAuth } from "react-oidc-context";

import { m } from "#/paraglide/messages.js";
import { CollaboratorList } from "#/samples/collaborator-list.tsx";
import { ColleaguePicker } from "#/samples/colleague-picker.tsx";
import { fullName } from "#/samples/full-name.ts";
import { useUserRoleOnSample } from "#/samples/use-user-role-on-sample.ts";

export function ShareSampleButton({ sampleId }: { sampleId: string }) {
  return useUserRoleOnSample(sampleId) === "owner" ? (
    <ShareSampleDialog sampleId={sampleId} />
  ) : null;
}

function ShareSampleDialog({ sampleId }: { sampleId: string }) {
  // ponytail: only the owner opens this dialog (the button and both endpoints
  // are owner-gated), so the signed-in identity IS the owner. Read the owner
  // off the sample response the day a contributor gets to see this list.
  const ownerProfile = useAuth().user?.profile;

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
        <section className="grid gap-1">
          <h3 className="text-sm font-medium">{m.share_owner_label()}</h3>
          <p className="text-sm">
            {fullName({
              firstname: ownerProfile?.given_name ?? null,
              name: ownerProfile?.family_name ?? null,
            })}{" "}
            <span className="text-muted-foreground">{ownerProfile?.email}</span>
          </p>
        </section>
        <CollaboratorList sampleId={sampleId} />
        <ColleaguePicker sampleId={sampleId} />
      </DialogContent>
    </Dialog>
  );
}
