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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@projet-igsn/design-system/components/ui/tooltip";
import { requestSampleDeletionBodySchema } from "@projet-igsn/domain/sample/sample-validator";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useRequestSampleDeletion } from "#/samples/use-request-sample-deletion.ts";

const validate = ({ value }: { value: unknown }) => {
  const parsed = requestSampleDeletionBodySchema.safeParse(value);
  if (parsed.success) {
    return undefined;
  }
  return {
    fields: Object.fromEntries(
      parsed.error.issues.map((issue) => [
        issue.path.join("."),
        {
          message:
            issue.code === "too_big"
              ? m.sample_deletion_request_reason_too_long()
              : m.sample_deletion_request_reason_required(),
        },
      ]),
    ),
  };
};

export function RequestSampleDeletionDialog({
  sampleId,
}: {
  sampleId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const requestDeletion = useRequestSampleDeletion(sampleId);
  const form = useAppForm({
    defaultValues: { reason: "" },
    validators: { onChange: validate, onSubmit: validate },
    onSubmit: ({ value }) =>
      requestDeletion.mutate(value, { onSuccess: () => close() }),
  });

  function close() {
    setIsOpen(false);
    form.reset();
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => (open ? setIsOpen(true) : close())}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={m.sample_deletion_request_action()}
            >
              <Trash2Icon aria-hidden />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{m.sample_deletion_request_action()}</TooltipContent>
      </Tooltip>
      <DialogContent closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.sample_deletion_request_title()}</DialogTitle>
          <DialogDescription>
            {m.sample_deletion_request_description()}
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
          <form.AppField name="reason">
            {(field) => (
              <field.TextField
                label={m.sample_deletion_request_reason_label()}
                multiline
              />
            )}
          </form.AppField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {m.action_cancel()}
              </Button>
            </DialogClose>
            <form.AppForm>
              <form.SubmitButton
                label={m.sample_deletion_request_submit()}
                disabled={requestDeletion.isPending}
              />
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
