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
} from "@projet-igsn/design-system/components/ui/dialog";
import { zodFieldErrors } from "@projet-igsn/domain/form/zod-field-errors";
import { requestSampleDeletionBodySchema } from "@projet-igsn/domain/sample/sample-validator";

import { m } from "#/paraglide/messages.js";
import { useRequestSampleDeletion } from "#/samples/use-request-sample-deletion.ts";

const validate = zodFieldErrors(requestSampleDeletionBodySchema, (issue) =>
  issue.code === "too_big"
    ? m.sample_deletion_request_reason_too_long()
    : m.sample_deletion_request_reason_required(),
);

export function RequestSampleDeletionDialog({
  sampleId,
  open,
  onOpenChange,
}: {
  sampleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const requestDeletion = useRequestSampleDeletion(sampleId);
  const form = useAppForm({
    defaultValues: { reason: "" },
    validators: { onChange: validate, onSubmit: validate },
    onSubmit: ({ value }) =>
      requestDeletion.mutate(value, { onSuccess: () => close() }),
  });

  function close() {
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
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
