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
import { zodFieldErrors } from "@projet-igsn/domain/form/zod-field-errors";
import {
  type ReserveInternalIds,
  reserveInternalIdsSchema,
} from "@projet-igsn/domain/sample/import/import-validator";
import { MAX_IMPORT_ROWS } from "@projet-igsn/domain/sample/import/max-import-rows";
import { CircleXIcon, FileDownIcon } from "lucide-react";
import { useState } from "react";

import { m } from "#/paraglide/messages.js";
import { useDownloadImportTemplate } from "#/samples/use-download-import-template.ts";

const validateCount = zodFieldErrors(reserveInternalIdsSchema, () =>
  m.import_template_reserve_count_invalid({ max: MAX_IMPORT_ROWS }),
);

export function ReserveInternalIdsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const downloadTemplate = useDownloadImportTemplate();
  const form = useAppForm({
    defaultValues: { count: 250 } as Partial<ReserveInternalIds>,
    validators: { onSubmit: validateCount },
    onSubmit: ({ value }) =>
      downloadTemplate.mutate(value.count, {
        onSuccess: () => setIsOpen(false),
      }),
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="link"
          className="h-auto justify-self-start p-0 text-sm underline"
        >
          {m.import_template_reserve_label()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" closeLabel={m.action_close()}>
        <DialogHeader>
          <DialogTitle>{m.import_template_reserve_label()}</DialogTitle>
          <DialogDescription>
            {m.import_template_reserve_count_hint({ max: MAX_IMPORT_ROWS })}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.AppField name="count">
            {(field) => (
              <field.NumberField
                label={m.import_template_reserve_count_label()}
                requiredToPublish
                isFullWidth
              />
            )}
          </form.AppField>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                <CircleXIcon aria-hidden />
                {m.action_cancel()}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={downloadTemplate.isPending}>
              <FileDownIcon aria-hidden />
              {m.import_template_reserve_download()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
