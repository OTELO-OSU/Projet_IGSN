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

const USER_FIELD_ID = "group-manager";

// ponytail: the picker also offers current managers, the add being a 204 no-op; an excludeManagersOf search param if it confuses users.
export function AddManagerDialog({
  onAdd,
}: {
  onAdd: (userId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useAppForm({
    defaultValues: { picked: null as UserIdentity | null },
    onSubmit: ({ value, formApi }) => {
      if (!value.picked) return;
      onAdd(value.picked.id);
      formApi.reset();
      setIsOpen(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="shrink-0">
          <PlusIcon aria-hidden />
          {m.group_manager_add_action()}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.group_manager_add_action()}</DialogTitle>
          <DialogDescription>
            {m.group_manager_add_description()}
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
            <Label htmlFor={USER_FIELD_ID}>{m.field_group_manager()}</Label>
            <form.AppField name="picked">
              {() => <UserField id={USER_FIELD_ID} status="accepted" />}
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
                    label={m.group_manager_add_submit()}
                    disabled={!picked}
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
