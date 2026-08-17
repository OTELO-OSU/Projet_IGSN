import type { UserSampleRole } from "@projet-igsn/domain/user-sample/model";
import type { CollaboratorRole } from "@projet-igsn/domain/user-sample/user-sample-validator";
import type { UserIdentity } from "@projet-igsn/domain/user/user-validator";

import { useAppForm } from "@projet-igsn/design-system/components/form/app-form";
import { Button } from "@projet-igsn/design-system/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@projet-igsn/design-system/components/ui/dialog";
import { Label } from "@projet-igsn/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@projet-igsn/design-system/components/ui/radio-group";
import { canGrantRole } from "@projet-igsn/domain/user-sample/can-grant-role";
import { collaboratorRoleSchema } from "@projet-igsn/domain/user-sample/user-sample-validator";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import {
  collaboratorRoleDescription,
  collaboratorRoleLabel,
} from "#/samples/collaborator-role-label.ts";
import { useAddCollaborator } from "#/samples/use-add-collaborator.ts";
import { UserField } from "#/users/user-field.tsx";

const ROLE_OPTIONS = collaboratorRoleSchema.options.toReversed();

export function InviteCollaboratorDialog({
  sampleId,
  role: userRole,
}: {
  sampleId: string;
  role: UserSampleRole;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const roleOptions = ROLE_OPTIONS.filter((option) =>
    canGrantRole(userRole, option),
  );
  const addCollaborator = useAddCollaborator(sampleId);
  const form = useAppForm({
    defaultValues: {
      role: "contributor" as CollaboratorRole,
      picked: null as UserIdentity | null,
    },
    onSubmit: ({ value, formApi }) => {
      if (!value.picked) {
        return;
      }
      addCollaborator.mutate(
        { userId: value.picked.id, role: value.role },
        {
          onSuccess: () => {
            formApi.reset();
            setIsOpen(false);
          },
        },
      );
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="shrink-0">
          <PlusIcon aria-hidden />
          {m.share_invite_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.share_invite_dialog_title()}</DialogTitle>
          <DialogDescription>
            {m.share_invite_dialog_description()}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="share-invite-user">{m.share_email_label()}</Label>
            <form.AppField name="picked">
              {() => <UserField id="share-invite-user" sampleId={sampleId} />}
            </form.AppField>
          </div>
          <div className="grid gap-2">
            <span id="share-role-label" className="text-sm font-medium">
              {m.share_role_label()}
            </span>
            <form.Field name="role">
              {(field) => (
                <RadioGroup
                  aria-labelledby="share-role-label"
                  value={field.state.value}
                  onValueChange={(value) =>
                    field.handleChange(value as CollaboratorRole)
                  }
                >
                  {roleOptions.map((option) => (
                    <Label
                      key={option}
                      htmlFor={`share-role-${option}`}
                      className="items-start gap-3 rounded-lg border p-4 font-normal"
                    >
                      <RadioGroupItem
                        value={option}
                        id={`share-role-${option}`}
                        className="mt-0.5"
                      />
                      <span className="grid gap-1">
                        <span className="font-medium">
                          {collaboratorRoleLabel(option)}
                        </span>
                        <span className="text-muted-foreground">
                          {collaboratorRoleDescription(option)}
                        </span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              )}
            </form.Field>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {m.action_cancel()}
              </Button>
            </DialogClose>
            <form.Subscribe selector={(state) => state.values.picked}>
              {(picked) => (
                <form.AppForm>
                  <form.SubmitButton
                    label={m.share_invite_submit()}
                    disabled={!picked || addCollaborator.isPending}
                  />
                </form.AppForm>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
