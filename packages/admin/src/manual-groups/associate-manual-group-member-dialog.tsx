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
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { UserField } from "#/users/user-field.tsx";

import { useAddManualGroupMember } from "./use-add-manual-group-member.ts";

const USER_FIELD_ID = "manual-group-member";

export function AssociateManualGroupMemberDialog({
  groupId,
}: {
  groupId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const addMember = useAddManualGroupMember();
  const form = useAppForm({
    defaultValues: { picked: null as UserIdentity | null },
    onSubmit: ({ value, formApi }) => {
      if (!value.picked) return;
      addMember.mutate(
        { groupId, userId: value.picked.id },
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
          {m.manual_group_associate_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.manual_group_associate_action()}</DialogTitle>
          <DialogDescription>
            {m.manual_group_associate_description()}
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
            <Label htmlFor={USER_FIELD_ID}>
              {m.field_manual_group_member()}
            </Label>
            <form.AppField name="picked">
              {() => (
                <UserField
                  id={USER_FIELD_ID}
                  status="accepted"
                  excludeMembersOf={groupId}
                />
              )}
            </form.AppField>
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
                    label={m.manual_group_associate_submit()}
                    disabled={!picked || addMember.isPending}
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
